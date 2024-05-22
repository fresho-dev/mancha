// Type shorthand for the listeners.
type ProxyValueListener<T> = (curr: T | null, prev: T | null) => any | Promise<any>;
type ProxyStoreListener = (...values: any[]) => any | Promise<any>;

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

function isProxified<T extends object>(object: T) {
  return object instanceof ReactiveProxy || (object as any)["__is_proxy__"];
}

/** Default debouncer time in millis. */
export const REACTIVE_DEBOUNCE_MILLIS = 10;

export function proxifyObject<T extends object>(object: T, callback: () => void, deep = true): T {
  // If this object is already a proxy, return it as-is.
  if (object == null || isProxified(object)) return object;

  // First, proxify any existing properties if deep = true.
  if (deep) {
    for (const key in object) {
      if (object.hasOwnProperty(key) && typeof object[key] === "object" && object[key] != null) {
        object[key] = proxifyObject(object[key] as any, callback);
      }
    }
  }

  // Then, proxify the object itself.
  return new Proxy(object, {
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
      if (deep && typeof value === "object") value = proxifyObject(value, callback);
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

export class ReactiveProxy<T> extends IDebouncer {
  private value: T | null = null;
  private listeners: ProxyValueListener<T>[] = [];
  protected constructor(value: T | null = null, ...listeners: ProxyValueListener<T>[]) {
    super();
    this.value = this.wrapObjValue(value);
    listeners.forEach((x) => this.watch(x));
  }

  static from<T>(
    value: T | ReactiveProxy<T>,
    ...listeners: ProxyValueListener<T>[]
  ): ReactiveProxy<T> {
    if (value instanceof ReactiveProxy) {
      listeners.forEach(value.watch);
      return value;
    } else {
      return new ReactiveProxy(value, ...listeners);
    }
  }

  private wrapObjValue(value: T | null): T | null {
    if (value === null || typeof value !== "object") return value;
    else return proxifyObject(value, () => this.trigger());
  }

  get() {
    return this.value;
  }

  async set(value: T | null): Promise<void> {
    if (this.value !== value) {
      const prev = this.value;
      // Convert value to a proxy if it's an object.
      this.value = this.wrapObjValue(value);
      await this.trigger(prev);
    }
  }

  watch(listener: ProxyValueListener<T>) {
    this.listeners.push(listener);
  }

  unwatch(listener: ProxyValueListener<T>) {
    this.listeners = this.listeners.filter((x) => x !== listener);
  }

  trigger(prev: T | null = null): Promise<void> {
    // Make a copy of the listeners, so that newly added listeners are not called.
    const listeners = this.listeners.slice();
    // Debounce the listeners to avoid multiple calls when the value changes rapidly.
    return this.debounce(REACTIVE_DEBOUNCE_MILLIS, () =>
      Promise.all(listeners.map((x) => x(this.value, prev))).then(() => {})
    );
  }
}

export class InertProxy<T> extends ReactiveProxy<T> {
  static from<T>(value: T | InertProxy<T>, ...listeners: ProxyValueListener<T>[]): InertProxy<T> {
    if (value instanceof ReactiveProxy) {
      return value;
    } else {
      return new InertProxy(value, ...listeners);
    }
  }
  watch(_: ProxyValueListener<T>) {}
  trigger(_?: T | null): Promise<void> {
    return Promise.resolve();
  }
}

export class ReactiveProxyStore extends IDebouncer {
  protected readonly store = new Map<string, ReactiveProxy<any>>();
  protected readonly debouncedListeners = new Map<Function, ProxyValueListener<any>>();

  lock: Promise<void> = Promise.resolve();

  constructor(data?: { [key: string]: any }) {
    super();
    for (const [key, value] of Object.entries(data || {})) {
      this.store.set(key, ReactiveProxy.from(this.wrapFnValue(value)));
    }
  }

  private wrapFnValue(value: any): any {
    if (!value || typeof value !== "function") return value;
    else return (...args: any[]) => value.call(proxifyStore(this), ...args);
  }

  get $() {
    return proxifyStore(this);
  }

  entries() {
    return this.store.entries();
  }

  get<K extends string>(key: K) {
    return this.store.get(key)?.get();
  }

  async set<K extends string>(key: K, value: any): Promise<void> {
    if (this.store.has(key)) {
      await this.store.get(key)!!.set(this.wrapFnValue(value));
    } else {
      this.store.set(key, ReactiveProxy.from(this.wrapFnValue(value)));
    }
  }

  del<K extends string>(key: K): boolean {
    return this.store.delete(key);
  }

  has<K extends string>(key: K): boolean {
    return this.store.has(key);
  }

  /**
   * Updates the internal store with the provided data.
   * @param data data to add to the internal store.
   */
  async update(data: { [key: string]: any }): Promise<void> {
    await Promise.all(Object.entries(data).map(([key, value]) => this.set(key, value)));
  }

  watch(keys: string | string[], listener: ProxyStoreListener): void {
    keys = Array.isArray(keys) ? keys : [keys];
    // Ignore the listener's specific value and retrieve all current values from store.
    const debounceFunction = () => listener(...keys.map((key) => this.store.get(key)!!.get()));
    // Create a wrapper listener that debounces the inner listener.
    const debouncedListener = () => this.debounce(REACTIVE_DEBOUNCE_MILLIS, debounceFunction);
    keys.forEach((key) => this.store.get(key)!!.watch(debouncedListener));
    // The caller will not have access to the wrapped listener, so to unwatch we need to store it.
    this.debouncedListeners.set(listener, debouncedListener);
  }

  unwatch(keys: string | string[], listener: ProxyStoreListener): void {
    keys = Array.isArray(keys) ? keys : [keys];
    keys.forEach((key) => this.store.get(key)!!.unwatch(this.debouncedListeners.get(listener)!!));
    this.debouncedListeners.delete(listener);
  }

  async trigger(keys: string | string[]): Promise<void> {
    keys = Array.isArray(keys) ? keys : [keys];
    await Promise.all(keys.map((key) => this.store.get(key)!!.trigger()));
  }

  async trace<T>(
    callback: (this: ReactiveProxyStore & { [key: string]: any }) => T | Promise<T>
  ): Promise<[T, string[]]> {
    // Track the dependencies by adding a hook to the proxified store.
    const dependencies: Set<string> = new Set();
    const proxy = proxifyStore(this, (event, key) => {
      if (event === "get") dependencies.add(key);
    });

    // Execute the callback and return the result and dependencies.
    const result = await callback.call(proxy);
    return [result, Array.from(dependencies)] as [T, string[]];
  }

  /**
   * Computes the result of `callback` and stores it as `key` in the store. If any of the other
   * store elements referenced in `callback` change, the computed value will be updated.
   * @param key key of the computed property
   * @param callback function that computes property
   */
  async computed<T>(key: string, callback: (this: { [key: string]: any }) => T | Promise<T>) {
    const [result, dependencies] = await this.trace(callback);
    this.watch(dependencies, async () => this.set(key, await callback.call(proxifyStore(this))));
    this.set(key, result);
  }
}

/**
 * Proxifies a ReactiveProxyStore object, allowing for direct access to its keys.
 * Calls to existing methods should still work, e.g.
 * ```
 * const store = new ReactiveProxyStore();
 * const proxy = proxify(store);
 * // The following two lines are equivalent.
 * proxy.key = "value";
 * proxy.set("key", "value");
 * ```
 * @param store ReactiveProxyStore object to proxify.
 * @returns Proxified object.
 */
export function proxifyStore(
  store: ReactiveProxyStore,
  callback: (event: "get" | "set", key: string, value?: any) => void = () => {}
): ReactiveProxyStore & { [key: string]: any } {
  const keys = Array.from(store.entries()).map(([key]) => key);
  const keyval = Object.fromEntries(keys.map((key) => [key, undefined]));
  return new Proxy(Object.assign({}, store, keyval), {
    get: (_, prop, receiver) => {
      if (typeof prop === "string" && store.has(prop)) {
        callback("get", prop);
        return store.get(prop);
      } else if (prop === "get") {
        // If someone calls the `get()` method, we need to wrap it so that the callback is called.
        return (key: string) => {
          callback("get", key);
          return store.get(key);
        };
      } else {
        return Reflect.get(store, prop, receiver);
      }
    },
    set: (_, prop, value, receiver) => {
      if (typeof prop !== "string" || prop in store) {
        Reflect.set(store, prop, value, receiver);
      } else {
        callback("set", prop, value);
        store.set(prop, value);
      }
      return true;
    },
  });
}
