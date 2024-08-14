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
/** Default debouncer time in millis. */
export const REACTIVE_DEBOUNCE_MILLIS = 10;
function isProxified(object) {
    return object instanceof SignalStore || object["__is_proxy__"];
}
export class SignalStore extends IDebouncer {
    evalkeys = ["$elem", "$event"];
    expressionCache = new Map();
    store = new Map();
    observers = new Map();
    _observer = null;
    _lock = Promise.resolve();
    constructor(data) {
        super();
        for (let [key, value] of Object.entries(data || {})) {
            // Use our set method to ensure that callbacks and wrappers are appropriately set, but ignore
            // the return value since we know that no observers will be triggered.
            this.set(key, value);
        }
    }
    wrapFunction(fn) {
        return (...args) => fn.call(this.$, ...args);
    }
    wrapObject(obj, callback) {
        // If this object is already a proxy or not a plain object (or array), return it as-is.
        if (obj == null || isProxified(obj) || (obj.constructor !== Object && !Array.isArray(obj))) {
            return obj;
        }
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
                if (typeof value === "object" && obj != null)
                    value = this.wrapObject(value, callback);
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
    watch(key, observer) {
        if (!this.observers.has(key)) {
            this.observers.set(key, new Set());
        }
        if (!this.observers.get(key)?.has(observer)) {
            this.observers.get(key)?.add(observer);
        }
    }
    async notify(key, debounceMillis = REACTIVE_DEBOUNCE_MILLIS) {
        const observers = Array.from(this.observers.get(key) || []);
        await this.debounce(debounceMillis, () => Promise.all(observers.map((observer) => observer.call(this.proxify(observer)))));
    }
    get(key, observer) {
        if (observer)
            this.watch(key, observer);
        return this.store.get(key);
    }
    async set(key, value) {
        if (value === this.store.get(key))
            return;
        const callback = () => this.notify(key);
        if (value && typeof value === "function") {
            value = this.wrapFunction(value);
        }
        if (value && typeof value === "object") {
            value = this.wrapObject(value, callback);
        }
        this.store.set(key, value);
        await callback();
    }
    del(key) {
        this.store.delete(key);
        this.observers.delete(key);
    }
    has(key) {
        return this.store.has(key);
    }
    effect(observer) {
        return observer.call(this.proxify(observer));
    }
    proxify(observer) {
        const keys = Array.from(this.store.entries()).map(([key]) => key);
        const keyval = Object.fromEntries(keys.map((key) => [key, undefined]));
        return new Proxy(keyval, {
            get: (_, prop, receiver) => {
                if (typeof prop === "string" && this.store.has(prop)) {
                    return this.get(prop, observer);
                }
                else if (prop === "$") {
                    return this.proxify(observer);
                }
                else {
                    return Reflect.get(this, prop, receiver);
                }
            },
            set: (_, prop, value, receiver) => {
                if (typeof prop !== "string" || prop in this) {
                    Reflect.set(this, prop, value, receiver);
                }
                else {
                    this.set(prop, value);
                }
                return true;
            },
        });
    }
    get $() {
        return this.proxify();
    }
    /**
     * Creates an evaluation function for the provided expression.
     * @param expr The expression to be evaluated.
     * @returns The evaluation function.
     */
    makeEvalFunction(expr) {
        // Throw an error if the expression is not a simple one-liner.
        if (expr.includes("\n") || expr.includes(";")) {
            throw new Error("Complex expressions are not supported.");
        }
        // Create a new function that uses the provided expression.
        const fn = new Function(...this.evalkeys, `with (this) { return (${expr}); }`);
        // The caller will use `fn` with a dictionary of arguments.
        return (args) => {
            const argvals = this.evalkeys.map((key) => args[key]);
            return fn.call(this.$, ...argvals);
        };
    }
    /**
     * Retrieves or creates a cached expression function for the provided expression.
     * @param expr - The expression to retrieve or create a cached function for.
     * @returns The cached expression function.
     */
    cachedExpressionFunction(expr) {
        if (!this.expressionCache.has(expr)) {
            this.expressionCache.set(expr, this.makeEvalFunction(expr));
        }
        return this.expressionCache.get(expr);
    }
    eval(expr, args = {}) {
        // Determine whether we have already been proxified to avoid doing it again.
        const thisArg = this._observer ? this : this.$;
        if (this.store.has(expr)) {
            // Shortcut: if the expression is just an item from the value store, use that directly.
            return thisArg[expr];
        }
        else {
            // Otherwise, perform the expression evaluation.
            const fn = this.cachedExpressionFunction(expr);
            const ctx = Object.fromEntries(this.store.entries());
            return fn({ this: thisArg, ...ctx, ...args });
        }
    }
}
