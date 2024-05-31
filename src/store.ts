import { Signal } from "./signal.js";

/**
 * Creates an evaluation function based on the provided code and arguments.
 * @param code The code to be evaluated.
 * @param args The arguments to be passed to the evaluation function. Default is an empty array.
 * @returns The evaluation function.
 */
export function makeEvalFunction(code: string, args: string[] = []): Function {
  return new Function(...args, `with (this) { return (() => (${code}))(); }`);
}

export class SignalStore {
  protected readonly evalkeys: string[] = ["$elem", "$event"];
  protected readonly expressionCache: Map<string, Function> = new Map();
  protected readonly store = new Map<string, Signal.Type<unknown>>();

  constructor(data?: { [key: string]: any }) {
    for (let [key, value] of Object.entries(data || {})) {
      if (typeof value === "function") value = this.wrapFunction(value);
      this.store.set(key, Signal.from(value));
    }
  }

  private wrapFunction(fn: Function): Function {
    return (...args: any[]) => fn.call(this.$, ...args);
  }

  effect<T>(fn: () => T) {
    Signal.effect(fn);
  }

  computed<T>(fn: () => T) {
    return Signal.computed(fn);
  }

  batch<T>(fn: () => T) {
    Signal.batch(fn);
  }

  untracked<T>(fn: () => T) {
    Signal.untracked(fn);
  }

  get $(): SignalStore & { [key: string]: any } {
    const keys = Array.from(this.store.entries()).map(([key]) => key);
    const keyval = Object.fromEntries(keys.map((key) => [key, undefined]));
    return new Proxy(Object.assign({}, this, keyval), {
      get: (_, prop, receiver) => {
        if (typeof prop === "string" && this.store.has(prop)) {
          return this.store.get(prop)!!.value;
        } else {
          return Reflect.get(this, prop, receiver);
        }
      },
      set: (_, prop, value, receiver) => {
        if (typeof prop !== "string" || prop in this) {
          Reflect.set(this, prop, value, receiver);
        } else if (this.store.has(prop)) {
          this.store.get(prop)!!.value = value;
        } else {
          this.store.set(prop, Signal.from(value));
        }
        return true;
      },
    });
  }

  /**
   * Retrieves or creates a cached expression function based on the provided expression.
   * @param expr - The expression to retrieve or create a cached function for.
   * @returns The cached expression function.
   */
  private cachedExpressionFunction(expr: string): Function {
    if (!this.expressionCache.has(expr)) {
      this.expressionCache.set(expr, makeEvalFunction(expr, this.evalkeys));
    }
    return this.expressionCache.get(expr)!!;
  }

  eval(expr: string, args: { [key: string]: any } = {}): any {
    if (this.store.has(expr)) {
      // Shortcut: if the expression is just an item from the value store, use that directly.
      return this.store.get(expr)!!.peek();
    } else {
      // Otherwise, perform the expression evaluation.
      const fn = this.cachedExpressionFunction(expr);
      const argvals = this.evalkeys.map((key) => args[key]);
      if (Object.keys(args).some((key) => !this.evalkeys.includes(key))) {
        throw new Error(`Invalid argument key, must be one of: ${this.evalkeys.join(", ")}`);
      }
      return fn.call(this.$, ...argvals);
    }
  }
}
