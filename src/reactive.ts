// Type shorthand for the listeners.
type Listener<T> = (curr: T | null, prev: T | null) => any | Promise<any>;

function isProxified<T extends object>(object: T) {
  return object instanceof ReactiveProxy || (object as any)["__is_proxy__"];
}

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

export class ReactiveProxy<T> {
  private value: T | null = null;
  private listeners: Listener<T>[] = [];
  protected constructor(value: T | null = null, ...listeners: Listener<T>[]) {
    // this.value = value;
    this.set(value);
    listeners.forEach((x) => this.watch(x));
  }
  static from<T>(value: T | ReactiveProxy<T>, ...listeners: Listener<T>[]): ReactiveProxy<T> {
    if (value instanceof ReactiveProxy) {
      listeners.forEach(value.watch);
      return value;
    } else {
      return new ReactiveProxy(value, ...listeners);
    }
  }
  get() {
    return this.value;
  }
  async set(value: T | null): Promise<void> {
    if (this.value !== value) {
      const prev = this.value;
      // Convert value to a proxy if it's an object.
      if (value != null && typeof value === "object") {
        value = proxifyObject(value, () => this.trigger());
      }
      this.value = value;
      await this.trigger(prev);
    }
  }
  watch(listener: Listener<T>) {
    this.listeners.push(listener);
  }
  unwatch(listener: Listener<T>) {
    this.listeners = this.listeners.filter((x) => x !== listener);
  }
  async trigger(prev: T | null = null): Promise<void> {
    // Listeners are triggered one at a time to avoid potential race conditions.
    for (const listener of this.listeners) {
      await listener(this.value, prev);
    }
  }
}

export class InertProxy<T> extends ReactiveProxy<T> {
  static from<T>(value: T | InertProxy<T>, ...listeners: Listener<T>[]): InertProxy<T> {
    if (value instanceof ReactiveProxy) {
      return value;
    } else {
      return new InertProxy(value, ...listeners);
    }
  }
  watch(listener: Listener<T>) {}
  trigger(prev?: T | null): Promise<void> {
    return Promise.resolve();
  }
}

export class ReactiveProxyStore {
  protected readonly store = new Map<string, ReactiveProxy<any>>();

  protected tracing = false;
  protected readonly traced = new Set<string>();
  protected lock: Promise<void> = Promise.resolve();

  private wrapFnValue(value: any): any {
    if (!value || typeof value !== "function") return value;
    else return (...args: any[]) => value.call(proxify(this), ...args);
  }

  constructor(data?: { [key: string]: any }) {
    for (const [key, value] of Object.entries(data || {})) {
      this.store.set(key, ReactiveProxy.from(this.wrapFnValue(value)));
    }
  }

  entries() {
    return this.store.entries();
  }

  get<K extends string>(key: K) {
    if (this.tracing) this.traced.add(key);
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

  /**
   * Updates the internal store with the provided data.
   * @param data data to add to the internal store.
   */
  async update(data: { [key: string]: any }): Promise<void> {
    // Keys are set one at a time to avoid any potential race conditions.
    for (const [key, value] of Object.entries(data)) {
      await this.set(key, value);
    }
  }

  watch(keys: string | string[], listener: (...value: any[]) => any): void {
    keys = Array.isArray(keys) ? keys : [keys];
    keys.forEach((key) =>
      this.store.get(key)!!.watch(() => {
        // Ignore the listener's specific value and retrieve all current values from store.
        return listener(...keys.map((key) => this.store.get(key)!!.get()));
      })
    );
  }

  async trigger(keys: string | string[]): Promise<void> {
    // Triggers are called one at a time to avoid potential race conditions.
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      await this.store.get(key)!!.trigger();
    }
    // keys = Array.isArray(keys) ? keys : [keys];
    // return Promise.all(keys.map((key) => this.store.get(key)!!.trigger())).then();
  }

  async trace<T>(callback: () => T | Promise<T>) {
    await this.lock;
    const resultPromise = new Promise<[T, string[]]>(async (resolve, reject) => {
      this.traced.clear();
      this.tracing = true;
      try {
        const result = await callback();
        const traced = Array.from(this.traced);
        resolve([result, traced]);
      } catch (exc) {
        reject(exc);
      } finally {
        this.tracing = false;
        this.traced.clear();
      }
    });
    this.lock = resultPromise.then(() => {});
    return resultPromise;
  }

  /**
   * Computes the result of `callback` and stores it as `key` in the store. If any of the other
   * store elements referenced in `callback` change, the computed value will be updated.
   * @param key key of the computed property
   * @param callback function that computes property
   */
  async computed<T>(key: string, callback: (this: { [key: string]: any }) => T | Promise<T>) {
    const [result, dependencies] = await this.trace(() => callback.call(proxify(this)));
    this.watch(dependencies, async () => this.set(key, await callback.call(proxify(this))));
    this.set(key, result);
  }
}

export function proxify(store: ReactiveProxyStore): { [key: string]: any } {
  const keys = Array.from(store.entries()).map(([key]) => key);
  const keyset = new Set(keys);
  return new Proxy(Object.fromEntries(keys.map((key) => [key, undefined])), {
    get: (target: any, prop: string, receiver: any) => {
      if (keyset.has(prop)) return store.get(prop);
      else return Reflect.get(target, prop, receiver);
    },
    set: (target: any, prop: string, value: any, receiver: any) => {
      if (keyset.has(prop)) store.set(prop, value);
      else Reflect.set(target, prop, value, receiver);
      return true;
    },
  });
}
