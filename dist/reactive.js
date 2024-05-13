"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxify = exports.ReactiveProxyStore = exports.InertProxy = exports.ReactiveProxy = exports.proxifyObject = exports.REACTIVE_DEBOUNCE_MILLIS = void 0;
class IDebouncer {
    constructor() {
        this.timeout = null;
    }
    debounce(millis, callback) {
        return new Promise((resolve, reject) => {
            if (this.timeout)
                clearTimeout(this.timeout);
            this.timeout = setTimeout(() => {
                try {
                    resolve(callback());
                }
                catch (exc) {
                    reject(exc);
                }
            }, millis);
        });
    }
}
function isProxified(object) {
    return object instanceof ReactiveProxy || object["__is_proxy__"];
}
/** Default debouncer time in millis. */
exports.REACTIVE_DEBOUNCE_MILLIS = 25;
function proxifyObject(object, callback, deep = true) {
    // If this object is already a proxy, return it as-is.
    if (object == null || isProxified(object))
        return object;
    // First, proxify any existing properties if deep = true.
    if (deep) {
        for (const key in object) {
            if (object.hasOwnProperty(key) && typeof object[key] === "object" && object[key] != null) {
                object[key] = proxifyObject(object[key], callback);
            }
        }
    }
    // Then, proxify the object itself.
    return new Proxy(object, {
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
            if (deep && typeof value === "object")
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
exports.proxifyObject = proxifyObject;
class ReactiveProxy extends IDebouncer {
    constructor(value = null, ...listeners) {
        super();
        this.value = null;
        this.listeners = [];
        this.set(value);
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
    get() {
        return this.value;
    }
    set(value) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.value !== value) {
                const prev = this.value;
                // Convert value to a proxy if it's an object.
                if (value != null && typeof value === "object") {
                    value = proxifyObject(value, () => this.trigger());
                }
                this.value = value;
                yield this.trigger(prev);
            }
        });
    }
    watch(listener) {
        this.listeners.push(listener);
    }
    unwatch(listener) {
        this.listeners = this.listeners.filter((x) => x !== listener);
    }
    trigger() {
        return __awaiter(this, arguments, void 0, function* (prev = null) {
            yield this.debounce(exports.REACTIVE_DEBOUNCE_MILLIS, () => Promise.all(this.listeners.map((x) => x(this.value, prev))));
        });
    }
}
exports.ReactiveProxy = ReactiveProxy;
class InertProxy extends ReactiveProxy {
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
exports.InertProxy = InertProxy;
class ReactiveProxyStore extends IDebouncer {
    wrapFnValue(value) {
        if (!value || typeof value !== "function")
            return value;
        else
            return (...args) => value.call(proxify(this), ...args);
    }
    constructor(data) {
        super();
        this.store = new Map();
        this.tracing = false;
        this.traced = new Set();
        this.lock = Promise.resolve();
        for (const [key, value] of Object.entries(data || {})) {
            this.store.set(key, ReactiveProxy.from(this.wrapFnValue(value)));
        }
    }
    get $() {
        return proxify(this);
    }
    entries() {
        return this.store.entries();
    }
    get(key) {
        var _a;
        if (this.tracing)
            this.traced.add(key);
        return (_a = this.store.get(key)) === null || _a === void 0 ? void 0 : _a.get();
    }
    set(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.store.has(key)) {
                yield this.store.get(key).set(this.wrapFnValue(value));
            }
            else {
                this.store.set(key, ReactiveProxy.from(this.wrapFnValue(value)));
            }
        });
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
    update(data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all(Object.entries(data).map(([key, value]) => this.set(key, value)));
        });
    }
    watch(keys, listener) {
        keys = Array.isArray(keys) ? keys : [keys];
        keys.forEach((key) => this.store.get(key).watch(() => {
            // Ignore the listener's specific value and retrieve all current values from store.
            return listener(...keys.map((key) => this.store.get(key).get()));
        }));
    }
    trigger(keys) {
        return __awaiter(this, void 0, void 0, function* () {
            keys = Array.isArray(keys) ? keys : [keys];
            yield Promise.all(keys.map((key) => this.store.get(key).trigger()));
        });
    }
    trace(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.lock;
            const resultPromise = new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                this.traced.clear();
                this.tracing = true;
                try {
                    const result = yield callback();
                    const traced = Array.from(this.traced);
                    resolve([result, traced]);
                }
                catch (exc) {
                    reject(exc);
                }
                finally {
                    this.tracing = false;
                    this.traced.clear();
                }
            }));
            this.lock = resultPromise.then(() => { });
            return resultPromise;
        });
    }
    /**
     * Computes the result of `callback` and stores it as `key` in the store. If any of the other
     * store elements referenced in `callback` change, the computed value will be updated.
     * @param key key of the computed property
     * @param callback function that computes property
     */
    computed(key, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            const [result, dependencies] = yield this.trace(() => callback.call(proxify(this)));
            this.watch(dependencies, () => __awaiter(this, void 0, void 0, function* () { return this.set(key, yield callback.call(proxify(this))); }));
            this.set(key, result);
        });
    }
}
exports.ReactiveProxyStore = ReactiveProxyStore;
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
function proxify(store) {
    const keys = Array.from(store.entries()).map(([key]) => key);
    const keyval = Object.fromEntries(keys.map((key) => [key, undefined]));
    return new Proxy(Object.assign({}, store, keyval), {
        get: (_, prop, receiver) => {
            if (typeof prop === "string" && store.has(prop))
                return store.get(prop);
            else
                return Reflect.get(store, prop, receiver);
        },
        set: (_, prop, value, receiver) => {
            if (typeof prop !== "string" || prop in store)
                Reflect.set(store, prop, value, receiver);
            else
                store.set(prop, value);
            return true;
        },
    });
}
exports.proxify = proxify;
