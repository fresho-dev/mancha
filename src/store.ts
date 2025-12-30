import * as expressions from "./expressions/index.js";

/**
 * Internal store properties that are always present. These are managed by the framework
 * and should not be set directly by users.
 */
export type InternalStoreState = {
	/** Reference to the parent store in a hierarchy. */
	$parent?: SignalStore;
	/** Reference to the root renderer instance. */
	$rootRenderer?: SignalStore;
	/** Reference to the root DOM node. */
	$rootNode?: Node;
} & {
	[key: `$$${string}`]: string | null;
};

/**
 * Base type for user-defined store state. Uses `any` intentionally to allow flexible
 * user-defined state types without requiring explicit index signatures.
 */
// biome-ignore lint/suspicious/noExplicitAny: Intentional dynamic state
export type StoreState = Record<string, any>;

/** Type for expression evaluation function. */
type EvalFunction = (thisArg: SignalStoreProxy, args: Record<string, unknown>) => unknown;

/**
 * Internal proxy type used within the store implementation. Uses `any` for dynamic property access.
 */
// biome-ignore lint/suspicious/noExplicitAny: Proxy needs to handle dynamic props
type SignalStoreProxy = SignalStore & InternalStoreState & { [key: string]: any };
type Observer<T> = (this: SignalStoreProxy) => T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KeyValueHandler = (this: SignalStoreProxy, key: string, value: unknown) => void;

abstract class IDebouncer {
	timeouts: Map<(...args: unknown[]) => unknown, ReturnType<typeof setTimeout>> = new Map();

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
				}, millis),
			);
		});
	}
}

/** Default debouncer time in millis. */
export const REACTIVE_DEBOUNCE_MILLIS = 10;

/** Shared AST factory. */
const AST_FACTORY = new expressions.EvalAstFactory();

/** Symbol used to identify proxified objects. */
const PROXY_MARKER = "__is_proxy__";

/** Type guard to check if an object has the proxy marker. */
interface ProxyMarked {
	[PROXY_MARKER]: boolean;
}

function isProxified<T extends object>(object: T): boolean {
	return object instanceof SignalStore || (object as unknown as ProxyMarked)[PROXY_MARKER] === true;
}

export function getAncestorValue(store: SignalStore | null, key: string): unknown {
	const map = store?._store;
	if (map?.has(key)) {
		return map.get(key);
	} else if (map?.has("$parent")) {
		return getAncestorValue(map.get("$parent") as SignalStore, key);
	} else {
		return undefined;
	}
}

export function getAncestorKeyStore(store: SignalStore | null, key: string): SignalStore | null {
	const map = store?._store;
	if (map?.has(key)) {
		return store;
	} else if (map?.has("$parent")) {
		return getAncestorKeyStore(map.get("$parent") as SignalStore, key);
	} else {
		return null;
	}
}

export function setAncestorValue(store: SignalStore, key: string, value: unknown): void {
	const ancestor = getAncestorKeyStore(store, key);
	if (ancestor) {
		ancestor._store.set(key, value);
	} else {
		store._store.set(key, value);
	}
}

export function setNestedProperty(
	obj: Record<string, unknown>,
	path: string,
	value: unknown,
): void {
	const keys = path.split(".");
	let current: Record<string, unknown> = obj;
	for (let i = 0; i < keys.length - 1; i++) {
		if (!(keys[i] in current)) current[keys[i]] = {};
		current = current[keys[i]] as Record<string, unknown>;
	}
	current[keys[keys.length - 1]] = value;
}

export class SignalStore<T extends StoreState = StoreState> extends IDebouncer {
	protected readonly evalkeys: string[] = ["$elem", "$event"];
	protected readonly expressionCache: Map<string, EvalFunction> = new Map();
	protected readonly observers = new Map<string, Set<Observer<unknown>>>();
	protected readonly keyHandlers = new Map<RegExp, Set<KeyValueHandler>>();
	protected _observer: Observer<unknown> | null = null;
	readonly _store = new Map<string, unknown>();
	_lock: Promise<void> = Promise.resolve();

	constructor(data?: T) {
		super();
		for (const [key, value] of Object.entries(data || {})) {
			// Use our set method to ensure that callbacks and wrappers are appropriately set, but ignore
			// the return value since we know that no observers will be triggered.
			this.set(key, value);
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	private wrapFunction(fn: (...args: unknown[]) => unknown): (...args: unknown[]) => unknown {
		return (...args: unknown[]) => fn.call(this.$, ...args);
	}

	private wrapObject<U extends object>(obj: U, callback: () => void): U {
		// If this object is already a proxy or not a plain object (or array), return it as-is.
		if (obj == null || isProxified(obj) || (obj.constructor !== Object && !Array.isArray(obj))) {
			return obj;
		}
		return new Proxy(obj, {
			deleteProperty: (target: U, property: string | symbol): boolean => {
				if (typeof property === "string" && property in target) {
					delete (target as Record<string, unknown>)[property];
					callback();
					return true;
				}
				return false;
			},
			set: (target: U, prop: string | symbol, value: unknown, receiver: unknown): boolean => {
				if (typeof value === "object" && value !== null) {
					value = this.wrapObject(value as object, callback);
				}
				const ret = Reflect.set(target, prop, value, receiver);
				callback();
				return ret;
			},
			get: (target: U, prop: string | symbol, receiver: unknown): unknown => {
				if (prop === PROXY_MARKER) return true;
				return Reflect.get(target, prop, receiver);
			},
		});
	}

	watch<T>(key: string, observer: Observer<T>): void {
		const owner = getAncestorKeyStore(this, key);
		if (!owner) {
			throw new Error(`Cannot watch key "${key}" as it does not exist in the store.`);
		}
		if (!owner.observers.has(key)) {
			owner.observers.set(key, new Set());
		}
		if (!owner.observers.get(key)?.has(observer)) {
			owner.observers.get(key)?.add(observer);
		}
	}

	addKeyHandler(pattern: RegExp, handler: KeyValueHandler): void {
		if (!this.keyHandlers.has(pattern)) {
			this.keyHandlers.set(pattern, new Set());
		}
		this.keyHandlers.get(pattern)?.add(handler);
	}

	async notify(key: string, debounceMillis: number = REACTIVE_DEBOUNCE_MILLIS): Promise<void> {
		const owner = getAncestorKeyStore(this, key);
		const observers = Array.from(owner?.observers.get(key) || []);
		await this.debounce(debounceMillis, () =>
			Promise.all(observers.map((observer) => observer.call(this.proxify(observer)))),
		);
	}

	get<T>(key: string, observer?: Observer<T>): unknown {
		if (observer) this.watch(key, observer);
		return getAncestorValue(this, key);
	}

	async set(key: string, value: unknown): Promise<void> {
		// Early return if the key exists in this store and has the same value.
		if (this._store.has(key) && value === this._store.get(key)) return;
		const callback = () => this.notify(key);
		if (value && typeof value === "function") {
			value = this.wrapFunction(value as (...args: unknown[]) => unknown);
		}
		if (value && typeof value === "object") {
			value = this.wrapObject(value, callback);
		}
		setAncestorValue(this, key, value);

		// Invoke any key handlers.
		for (const [pattern, handlers] of this.keyHandlers.entries()) {
			if (pattern.test(key)) {
				for (const handler of handlers) {
					await Promise.resolve(handler.call(this.$, key, value));
				}
			}
		}

		// Invoke the callback to notify observers.
		await callback();
	}

	async del(key: string): Promise<void> {
		// By setting to null, we trigger observers before deletion.
		await this.set(key, null);
		this._store.delete(key);
		this.observers.delete(key);
	}

	keys(): string[] {
		return Array.from(this._store.keys());
	}

	/**
	 * Checks if a key exists in THIS store only (not ancestors).
	 * Use `get(key) !== null` to check if a key exists anywhere in the chain.
	 */
	has(key: string): boolean {
		return this._store.has(key);
	}

	effect<T>(observer: Observer<T>): T {
		return observer.call(this.proxify(observer));
	}

	private proxify<T>(observer?: Observer<T>): SignalStoreProxy {
		const keys = Array.from(this._store.entries()).map(([key]) => key);
		const keyval = Object.fromEntries(keys.map((key) => [key, null]));
		return new Proxy(keyval as SignalStoreProxy, {
			has: (_, prop) => {
				if (typeof prop === "string") {
					if (getAncestorKeyStore(this, prop)) return true;
					// Check if property exists on the SignalStore instance (e.g. methods like $resolve)
					if (Reflect.has(this, prop)) return true;
				}
				return Reflect.has(keyval, prop);
			},
			get: (_, prop, receiver) => {
				if (typeof prop === "string") {
					if (getAncestorKeyStore(this, prop)) {
						return this.get(prop, observer);
					}
					// If the property is not found, but we are observing, we assume it's a
					// state variable that hasn't been initialized yet. We initialize it to
					// undefined so that we can watch it.
					if (observer && prop !== PROXY_MARKER && !Reflect.has(this, prop)) {
						this.set(prop, undefined);
						return this.get(prop, observer);
					}
				}

				if (prop === "$") {
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

	get $(): SignalStore<T> & InternalStoreState & T {
		return this.proxify() as SignalStore<T> & InternalStoreState & T;
	}

	/**
	 * Creates an evaluation function for the provided expression.
	 * @param expr The expression to be evaluated.
	 * @returns The evaluation function.
	 */
	private makeEvalFunction(expr: string): EvalFunction {
		return (thisArg: SignalStoreProxy, args: { [key: string]: unknown }) => {
			const ast = expressions.parse(expr, AST_FACTORY);

			const scope = new Proxy(args, {
				has(target, prop) {
					return prop in target || prop in thisArg || prop in globalThis;
				},
				get(target, prop) {
					if (typeof prop !== "string") return undefined;
					if (prop in target) return target[prop];
					if (prop in thisArg) return thisArg[prop];
					if (prop in globalThis) return (globalThis as unknown as Record<string, unknown>)[prop];
					return thisArg[prop];
				},
				set(target, prop, value) {
					if (typeof prop !== "string") return false;
					if (prop in target) {
						target[prop] = value;
						return true;
					}
					thisArg[prop] = value;
					return true;
				},
			});

			return ast?.evaluate(scope);
		};
	}

	/**
	 * Retrieves or creates a cached expression function for the provided expression.
	 * @param expr - The expression to retrieve or create a cached function for.
	 * @returns The cached expression function.
	 */
	private cachedExpressionFunction(expr: string): EvalFunction {
		expr = expr.trim();

		if (!this.expressionCache.has(expr)) {
			this.expressionCache.set(expr, this.makeEvalFunction(expr));
		}
		const fn = this.expressionCache.get(expr);
		if (!fn) {
			throw new Error(`Failed to retrieve cached expression: ${expr}`);
		}
		return fn;
	}

	eval(expr: string, args: Record<string, unknown> = {}): unknown {
		// Determine whether we have already been proxified to avoid doing it again.
		const thisArg = this._observer ? (this as unknown as SignalStoreProxy) : this.$;
		if (this._store.has(expr)) {
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

	/**
	 * Executes an async function and returns a reactive state object that tracks the result.
	 *
	 * @param fn - The async function to execute.
	 * @param options - Optional arguments to pass to the function.
	 * @returns A reactive state object with $pending, $result, and $error properties.
	 *
	 * @example
	 * // In :data attribute - executes on mount
	 * :data="{ users: $resolve(api.listUsers) }"
	 *
	 * // With options
	 * :data="{ user: $resolve(api.getUser, { path: { id: userId } }) }"
	 *
	 * // In :on:click - executes on click
	 * :on:click="result = $resolve(api.deleteUser, { path: { id } })"
	 */
	$resolve<T, O = unknown>(
		fn: (options?: O) => Promise<T>,
		options?: O,
	): { $pending: boolean; $result: T | null; $error: Error | null } {
		// Create the state object.
		const state = {
			$pending: true,
			$result: null as T | null,
			$error: null as Error | null,
		};

		// Execute the function immediately, wrapping in Promise.resolve to handle sync throws.
		Promise.resolve()
			.then(() => fn(options))
			.then((data) => {
				state.$result = data;
			})
			.catch((err) => {
				state.$error = err instanceof Error ? err : new Error(String(err));
			})
			.finally(() => {
				state.$pending = false;
			});

		return state;
	}
}
