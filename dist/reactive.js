class IDebouncer {
    timeouts = new Map();
    debounce(millis, callback) {
        return new Promise((resolve, reject) => {
            const timeout = this.timeouts.get(callback);
            if (timeout)
                clearTimeout(timeout);
            this.timeouts.set(callback, setTimeout(() => {
                try {
                    resolve(callback());
                    this.timeouts.delete(callback);
                }
                catch (exc) {
                    reject(exc);
                }
            }, millis));
        });
    }
}
function isProxified(object) {
    return object instanceof ReactiveProxy || object["__is_proxy__"];
}
/** Default debouncer time in millis. */
export const REACTIVE_DEBOUNCE_MILLIS = 10;
export function proxifyObject(obj, callback) {
    // If this object is already a proxy or not a plain object (or array), return it as-is.
    if (obj == null || isProxified(obj) || (obj.constructor !== Object && !Array.isArray(obj))) {
        return obj;
    }
    // First, proxify any existing properties.
    for (const key in obj) {
        if (obj.hasOwnProperty(key) && typeof obj[key] === "object" && obj[key] != null) {
            obj[key] = proxifyObject(obj[key], callback);
        }
    }
    // Then, proxify the object itself.
    return new Proxy(obj, {
        deleteProperty: (target, property) => {
            if (property in target) {
                delete target[property];
                callback();
                return true;
            }
            else {
                return false;
            }
        },
        set: (target, prop, value, receiver) => {
            if (typeof value === "object")
                value = proxifyObject(value, callback);
            const ret = Reflect.set(target, prop, value, receiver);
            callback();
            return ret;
        },
        get: (target, prop, receiver) => {
            if (prop === "__is_proxy__")
                return true;
            return Reflect.get(target, prop, receiver);
        },
    });
}
export class ReactiveProxy extends IDebouncer {
    value = null;
    listeners = [];
    constructor(value = null, ...listeners) {
        super();
        this.value = this.wrapObjValue(value);
        listeners.forEach((x) => this.watch(x));
    }
    static from(value, ...listeners) {
        if (value instanceof ReactiveProxy) {
            listeners.forEach(value.watch);
            return value;
        }
        else {
            return new ReactiveProxy(value, ...listeners);
        }
    }
    wrapObjValue(value) {
        if (value === null || typeof value !== "object")
            return value;
        else
            return proxifyObject(value, () => this.trigger());
    }
    get() {
        return this.value;
    }
    async set(value) {
        if (this.value !== value) {
            const prev = this.value;
            // Convert value to a proxy if it's an object.
            this.value = this.wrapObjValue(value);
            await this.trigger(prev);
        }
    }
    watch(listener) {
        this.listeners.push(listener);
    }
    unwatch(listener) {
        this.listeners = this.listeners.filter((x) => x !== listener);
    }
    trigger(prev = null) {
        // Make a copy of the listeners, so that newly added listeners are not called.
        const listeners = this.listeners.slice();
        // Debounce the listeners to avoid multiple calls when the value changes rapidly.
        return this.debounce(REACTIVE_DEBOUNCE_MILLIS, () => Promise.all(listeners.map((x) => x(this.value, prev))).then(() => { }));
    }
}
export class InertProxy extends ReactiveProxy {
    static from(value, ...listeners) {
        if (value instanceof ReactiveProxy) {
            return value;
        }
        else {
            return new InertProxy(value, ...listeners);
        }
    }
    watch(_) { }
    trigger(_) {
        return Promise.resolve();
    }
}
export class ReactiveProxyStore extends IDebouncer {
    store = new Map();
    debouncedListeners = new Map();
    lock = Promise.resolve();
    constructor(data) {
        super();
        for (const [key, value] of Object.entries(data || {})) {
            this.store.set(key, ReactiveProxy.from(this.wrapFnValue(value)));
        }
    }
    wrapFnValue(value) {
        if (!value || typeof value !== "function")
            return value;
        else
            return (...args) => value.call(proxifyStore(this), ...args);
    }
    get $() {
        return proxifyStore(this);
    }
    entries() {
        return this.store.entries();
    }
    get(key) {
        return this.store.get(key)?.get();
    }
    async set(key, value) {
        if (this.store.has(key)) {
            await this.store.get(key).set(this.wrapFnValue(value));
        }
        else {
            this.store.set(key, ReactiveProxy.from(this.wrapFnValue(value)));
        }
    }
    del(key) {
        return this.store.delete(key);
    }
    has(key) {
        return this.store.has(key);
    }
    /**
     * Updates the internal store with the provided data.
     * @param data data to add to the internal store.
     */
    async update(data) {
        await Promise.all(Object.entries(data).map(([key, value]) => this.set(key, value)));
    }
    watch(keys, listener) {
        keys = Array.isArray(keys) ? keys : [keys];
        // Ignore the listener's specific value and retrieve all current values from store.
        const debounceFunction = () => listener(...keys.map((key) => this.store.get(key).get()));
        // Create a wrapper listener that debounces the inner listener.
        const debouncedListener = () => this.debounce(REACTIVE_DEBOUNCE_MILLIS, debounceFunction);
        keys.forEach((key) => this.store.get(key).watch(debouncedListener));
        // The caller will not have access to the wrapped listener, so to unwatch we need to store it.
        this.debouncedListeners.set(listener, debouncedListener);
    }
    unwatch(keys, listener) {
        keys = Array.isArray(keys) ? keys : [keys];
        keys.forEach((key) => this.store.get(key).unwatch(this.debouncedListeners.get(listener)));
        this.debouncedListeners.delete(listener);
    }
    async trigger(keys) {
        keys = Array.isArray(keys) ? keys : [keys];
        await Promise.all(keys.map((key) => this.store.get(key).trigger()));
    }
    async trace(callback) {
        // Track the dependencies by adding a hook to the proxified store.
        const dependencies = new Set();
        const proxy = proxifyStore(this, (event, key) => {
            if (event === "get")
                dependencies.add(key);
        });
        // Execute the callback and return the result and dependencies.
        const result = await callback.call(proxy);
        return [result, Array.from(dependencies)];
    }
    /**
     * Computes the result of `callback` and stores it as `key` in the store. If any of the other
     * store elements referenced in `callback` change, the computed value will be updated.
     * @param key key of the computed property
     * @param callback function that computes property
     */
    async computed(key, callback) {
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
export function proxifyStore(store, callback = () => { }) {
    const keys = Array.from(store.entries()).map(([key]) => key);
    const keyval = Object.fromEntries(keys.map((key) => [key, undefined]));
    return new Proxy(Object.assign({}, store, keyval), {
        get: (_, prop, receiver) => {
            if (typeof prop === "string" && store.has(prop)) {
                callback("get", prop);
                return store.get(prop);
            }
            else if (prop === "get") {
                // If someone calls the `get()` method, we need to wrap it so that the callback is called.
                return (key) => {
                    callback("get", key);
                    return store.get(key);
                };
            }
            else {
                return Reflect.get(store, prop, receiver);
            }
        },
        set: (_, prop, value, receiver) => {
            if (typeof prop !== "string" || prop in store) {
                Reflect.set(store, prop, value, receiver);
            }
            else {
                callback("set", prop, value);
                store.set(prop, value);
            }
            return true;
        },
    });
}
