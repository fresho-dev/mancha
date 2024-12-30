import * as jexpr from "jexpr";

type SignalStoreProxy = SignalStore & { [key: string]: any };
type Observer<T> = (this: SignalStoreProxy) => T;

abstract class IDebouncer {
  timeouts: Map<Function, ReturnType<typeof setTimeout>> = new Map();

  debounce<T>(millis: number, callback: () => T | Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = this.timeouts.get(callback);
      if (timeout) clearTimeout(timeout);
      this.timeouts.set(
        callback,
        setTimeout(() => {
          try {
            resolve(callback());
            this.timeouts.delete(callback);
          } catch (exc) {
            reject(exc);
          }
        }, millis)
      );
    });
  }
}

/** Default debouncer time in millis. */
export const REACTIVE_DEBOUNCE_MILLIS = 10;

/** Shared AST factory. */
const AST_FACTORY = new jexpr.EvalAstFactory();

function isProxified<T extends object>(object: T) {
  return object instanceof SignalStore || (object as any)["__is_proxy__"];
}

export function getAncestorValue(store: Map<string, unknown>, key: string): unknown | null {
  if (store.has(key)) {
    return store.get(key);
  } else if (store.has("$parent")) {
    const parent = store.get("$parent") as Map<string, unknown>;
    return getAncestorValue(parent, key);
  } else {
    return null;
  }
}

export function getAncestorKeyStore(
  store: Map<string, unknown>,
  key: string
): Map<string, unknown> | null {
  if (store.has(key)) {
    return store;
  } else if (store.has("$parent")) {
    const parent = store.get("$parent") as Map<string, unknown>;
    return getAncestorKeyStore(parent, key);
  } else {
    return null;
  }
}

export function setAncestorValue(store: Map<string, unknown>, key: string, value: unknown): void {
  const ancestor = getAncestorKeyStore(store, key);
  if (ancestor) {
    ancestor.set(key, value);
  } else {
    store.set(key, value);
  }
}

export class SignalStore extends IDebouncer {
  protected readonly evalkeys: string[] = ["$elem", "$event"];
  protected readonly expressionCache: Map<string, Function> = new Map();
  protected readonly store = new Map<string, unknown>();
  protected readonly observers = new Map<string, Set<Observer<unknown>>>();
  protected _observer: Observer<unknown> | null = null;
  _lock: Promise<void> = Promise.resolve();

  constructor(data?: { [key: string]: any }) {
    super();
    for (let [key, value] of Object.entries(data || {})) {
      // Use our set method to ensure that callbacks and wrappers are appropriately set, but ignore
      // the return value since we know that no observers will be triggered.
      this.set(key, value);
    }
  }

  private wrapFunction(fn: Function): Function {
    return (...args: any[]) => fn.call(this.$, ...args);
  }

  private wrapObject(obj: any, callback: () => void): any {
    // If this object is already a proxy or not a plain object (or array), return it as-is.
    if (obj == null || isProxified(obj) || (obj.constructor !== Object && !Array.isArray(obj))) {
      return obj;
    }
    return new Proxy(obj, {
      deleteProperty: (target: any, property: string) => {
        if (property in target) {
          delete target[property];
          callback();
          return true;
        } else {
          return false;
        }
      },
      set: (target: any, prop: string, value: any, receiver: any) => {
        if (typeof value === "object" && obj != null) value = this.wrapObject(value, callback);
        const ret = Reflect.set(target, prop, value, receiver);
        callback();
        return ret;
      },
      get: (target: any, prop: string, receiver: any) => {
        if (prop === "__is_proxy__") return true;
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  protected watch<T>(key: string, observer: Observer<T>): void {
    if (!this.observers.has(key)) {
      this.observers.set(key, new Set());
    }
    if (!this.observers.get(key)?.has(observer)) {
      this.observers.get(key)?.add(observer);
    }
  }

  protected async notify(
    key: string,
    debounceMillis: number = REACTIVE_DEBOUNCE_MILLIS
  ): Promise<void> {
    const observers = Array.from(this.observers.get(key) || []);
    await this.debounce(debounceMillis, () =>
      Promise.all(observers.map((observer) => observer.call(this.proxify(observer))))
    );
  }

  get<T>(key: string, observer?: Observer<T>): unknown | null {
    if (observer) this.watch(key, observer);
    return getAncestorValue(this.store, key);
  }

  async set(key: string, value: unknown): Promise<void> {
    if (value === this.store.get(key)) return;
    const callback = () => this.notify(key);
    if (value && typeof value === "function") {
      value = this.wrapFunction(value);
    }
    if (value && typeof value === "object") {
      value = this.wrapObject(value, callback);
    }
    setAncestorValue(this.store, key, value);
    await callback();
  }

  del(key: string): void {
    this.store.delete(key);
    this.observers.delete(key);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  effect<T>(observer: Observer<T>): T {
    return observer.call(this.proxify(observer));
  }

  private proxify<T>(observer?: Observer<T>): SignalStoreProxy {
    const keys = Array.from(this.store.entries()).map(([key]) => key);
    const keyval = Object.fromEntries(keys.map((key) => [key, undefined]));
    return new Proxy(keyval as SignalStoreProxy, {
      get: (_, prop, receiver) => {
        if (typeof prop === "string" && getAncestorKeyStore(this.store, prop)) {
          return this.get(prop, observer);
        } else if (prop === "$") {
          return this.proxify(observer);
        } else {
          return Reflect.get(this, prop, receiver);
        }
      },
      set: (_, prop, value, receiver) => {
        if (typeof prop !== "string" || prop in this) {
          Reflect.set(this, prop, value, receiver);
        } else {
          this.set(prop, value);
        }
        return true;
      },
    });
  }

  get $(): SignalStoreProxy {
    return this.proxify();
  }

  /**
   * Creates an evaluation function for the provided expression.
   * @param expr The expression to be evaluated.
   * @returns The evaluation function.
   */
  private makeEvalFunction(expr: string): Function {
    // Throw an error if the expression is not a simple one-liner.
    if (expr.includes(";")) {
      throw new Error("Complex expressions are not supported.");
    }

    // If the expression includes assignment, save the left-hand side for later.
    let assignResult: string | null = null;
    if (expr.includes(" = ")) {
      const [lhs, rhs] = expr.split(" = ");
      assignResult = lhs.trim();
      expr = rhs.trim();
    }

    // Otherwise, just return the simple expression function.
    return (thisArg: SignalStoreProxy, args: { [key: string]: unknown }) => {
      const ast = jexpr.parse(expr, AST_FACTORY);
      const ctx = ast
        ?.getIds([])
        ?.map((id) => [id, args[id] ?? thisArg[id] ?? (globalThis as any)[id]]);
      const res = ast?.evaluate(Object.fromEntries(ctx || []));
      if (assignResult) {
        thisArg[assignResult] = res;
      } else {
        return res;
      }
    };
  }

  /**
   * Retrieves or creates a cached expression function for the provided expression.
   * @param expr - The expression to retrieve or create a cached function for.
   * @returns The cached expression function.
   */
  private cachedExpressionFunction(expr: string): Function {
    expr = expr.trim();

    if (!this.expressionCache.has(expr)) {
      this.expressionCache.set(expr, this.makeEvalFunction(expr));
    }
    return this.expressionCache.get(expr)!!;
  }

  eval(expr: string, args: { [key: string]: any } = {}): unknown {
    // Determine whether we have already been proxified to avoid doing it again.
    const thisArg = this._observer ? (this as SignalStoreProxy) : this.$;
    if (this.store.has(expr)) {
      // Shortcut: if the expression is just an item from the value store, use that directly.
      return thisArg[expr];
    } else {
      // Otherwise, perform the expression evaluation.
      const fn = this.cachedExpressionFunction(expr);
      try {
        return fn(thisArg, args);
      } catch (exc) {
        console.error(`Failed to evaluate expression: ${expr}`);
        console.error(exc);
        return null;
      }
    }
  }
}
