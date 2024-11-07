import * as jexpr from "jexpr";
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
/** Shared AST factory. */
const AST_FACTORY = new jexpr.EvalAstFactory();
function isProxified(object) {
    return object instanceof SignalStore || object["__is_proxy__"];
}
export function getAncestorValue(store, key) {
    if (store.has(key)) {
        return store.get(key);
    }
    else if (store.has("$parent")) {
        const parent = store.get("$parent");
        return getAncestorValue(parent, key);
    }
    else {
        return undefined;
    }
}
export function getAncestorKeyStore(store, key) {
    if (store.has(key)) {
        return store;
    }
    else if (store.has("$parent")) {
        const parent = store.get("$parent");
        return getAncestorKeyStore(parent, key);
    }
    else {
        return null;
    }
}
export function setAncestorValue(store, key, value) {
    const ancestor = getAncestorKeyStore(store, key);
    if (ancestor) {
        ancestor.set(key, value);
    }
    else {
        store.set(key, value);
    }
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
        return getAncestorValue(this.store, key);
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
        setAncestorValue(this.store, key, value);
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
        if (expr.includes(";")) {
            throw new Error("Complex expressions are not supported.");
        }
        // If the expression includes assignment, save the left-hand side for later.
        let assignResult = null;
        if (expr.includes(" = ")) {
            const [lhs, rhs] = expr.split(" = ");
            assignResult = lhs.trim();
            expr = rhs.trim();
        }
        // Otherwise, just return the simple expression function.
        return (thisArg, args) => {
            const ast = jexpr.parse(expr, AST_FACTORY);
            const ctx = ast
                ?.getIds([])
                ?.map((id) => [id, args[id] ?? thisArg[id] ?? globalThis[id]]);
            const res = ast?.evaluate(Object.fromEntries(ctx || []));
            if (assignResult) {
                thisArg[assignResult] = res;
            }
            else {
                return res;
            }
        };
    }
    /**
     * Retrieves or creates a cached expression function for the provided expression.
     * @param expr - The expression to retrieve or create a cached function for.
     * @returns The cached expression function.
     */
    cachedExpressionFunction(expr) {
        expr = expr.trim();
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
            try {
                return fn(thisArg, args);
            }
            catch (exc) {
                console.error(`Failed to evaluate expression: ${expr}`);
                console.error(exc);
                return null;
            }
        }
    }
}
