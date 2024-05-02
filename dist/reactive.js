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
exports.proxify = exports.ReactiveProxyStore = exports.InertProxy = exports.ReactiveProxy = exports.proxifyObject = void 0;
function getNestedProperty(target, ...props) {
    let result = target;
    for (const currProp of props) {
        result = result[currProp];
    }
    return result;
}
function isProxified(object) {
    return object instanceof ReactiveProxy || object["__is_proxy__"];
}
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
class ReactiveProxy {
    constructor(value = null, ...listeners) {
        this.value = null;
        this.listeners = [];
        // this.value = value;
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
    get(...props) {
        if (props.length) {
            return getNestedProperty(this.value, ...props);
        }
        else {
            return this.value;
        }
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
            // Listeners are triggered one at a time to avoid potential race conditions.
            for (const listener of this.listeners) {
                yield listener(this.value, prev);
            }
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
    watch(listener) { }
    trigger(prev) {
        return Promise.resolve();
    }
}
exports.InertProxy = InertProxy;
class ReactiveProxyStore {
    constructor(data) {
        this.store = new Map();
        this.tracing = false;
        this.traced = new Set();
        this.lock = Promise.resolve();
        // this.update(data || {});
        // Object.entries(data || {}).forEach(([key, value]) => this.set(key, value));
        for (const [key, value] of Object.entries(data || {})) {
            this.store.set(key, ReactiveProxy.from(value));
        }
    }
    entries() {
        return this.store.entries();
    }
    get(key, ...props) {
        var _a;
        if (this.tracing)
            this.traced.add(key);
        return (_a = this.store.get(key)) === null || _a === void 0 ? void 0 : _a.get(...props);
    }
    set(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.store.has(key)) {
                yield this.store.get(key).set(value);
            }
            else {
                this.store.set(key, ReactiveProxy.from(value));
            }
        });
    }
    del(key) {
        return this.store.delete(key);
    }
    /**
     * Updates the internal store with the provided data.
     * @param data data to add to the internal store.
     */
    update(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Keys are set one at a time to avoid any potential race conditions.
            for (const [key, value] of Object.entries(data)) {
                yield this.set(key, value);
            }
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
            // Triggers are called one at a time to avoid potential race conditions.
            for (const key of Array.isArray(keys) ? keys : [keys]) {
                yield this.store.get(key).trigger();
            }
            // keys = Array.isArray(keys) ? keys : [keys];
            // return Promise.all(keys.map((key) => this.store.get(key)!!.trigger())).then();
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
            const [result, dependencies] = yield this.trace(() => callback());
            this.watch(dependencies, () => __awaiter(this, void 0, void 0, function* () { return this.set(key, yield callback()); }));
            this.set(key, result);
        });
    }
}
exports.ReactiveProxyStore = ReactiveProxyStore;
function proxify(store) {
    const keys = Array.from(store.entries()).map(([key]) => key);
    const keyset = new Set(keys);
    return new Proxy(Object.fromEntries(keys.map((key) => [key, undefined])), {
        get: (target, prop, receiver) => {
            if (keyset.has(prop))
                return store.get(prop);
            else
                return Reflect.get(target, prop, receiver);
        },
        set: (target, prop, value, receiver) => {
            if (keyset.has(prop))
                store.set(prop, value);
            else
                Reflect.set(target, prop, value, receiver);
            return true;
        },
    });
}
exports.proxify = proxify;
