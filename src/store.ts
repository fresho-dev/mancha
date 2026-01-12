import * as expressions from "./expressions/index.js";
import type { EffectMeta } from "./interfaces.js";

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

/** Type for observer entries that include the store context for proper binding. */
type ObserverEntry = {
	observer: Observer<unknown>;
	store: SignalStore;
};

/**
 * Internal proxy type used within the store implementation. Uses `any` for dynamic property access.
 */
// biome-ignore lint/suspicious/noExplicitAny: Proxy needs to handle dynamic props
type SignalStoreProxy = SignalStore & InternalStoreState & { [key: string]: any };

/**
 * The reactive context type exposed to effects and computed functions.
 * Includes the store's typed state T, internal state, and an index signature for dynamic access.
 */
export type ReactiveContext<T extends StoreState = StoreState> = SignalStore<T> &
	InternalStoreState &
	T &
	Record<string, unknown>;

type Observer<T> = (this: SignalStoreProxy) => T;
type KeyValueHandler = (this: SignalStoreProxy, key: string, value: unknown) => void;
type AnyFunction = (...args: unknown[]) => unknown;

/** Symbol used to identify computed value markers. */
const COMPUTED_MARKER = Symbol("__computed__");

/** Function type for computed value definitions. Receives reactive context as `$` parameter. */
export type ComputedFn<T extends StoreState, R> = (
	this: ReactiveContext<T>,
	$: ReactiveContext<T>,
) => R;

/** Marker object returned by $computed() to signal that a value should be computed reactively. */
export interface ComputedMarker<R> {
	[COMPUTED_MARKER]: true;
	fn: ComputedFn<StoreState, R>;
}

/** Type guard to check if a value is a computed marker. */
function isComputedMarker<T>(value: unknown): value is ComputedMarker<T> {
	return (
		value !== null &&
		typeof value === "object" &&
		COMPUTED_MARKER in value &&
		(value as ComputedMarker<T>)[COMPUTED_MARKER] === true
	);
}

/** Default notification debounce time in millis. */
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

export class SignalStore<T extends StoreState = StoreState> {
	protected readonly evalkeys: string[] = ["$elem", "$event"];
	protected readonly expressionCache: Map<string, EvalFunction> = new Map();
	protected readonly observers = new Map<string, Set<ObserverEntry>>();
	protected readonly keyHandlers = new Map<RegExp, Set<KeyValueHandler>>();
	readonly _store = new Map<string, unknown>();
	_lock: Promise<void> = Promise.resolve();

	/**
	 * Notification state per key. Value is a pending timeout, or "executing"
	 * when observers are running. Used to debounce and prevent infinite loops.
	 */
	private readonly _notify: Map<string, ReturnType<typeof setTimeout> | "executing"> = new Map();

	constructor(data?: T) {
		for (const [key, value] of Object.entries(data || {})) {
			// Use our set method to ensure that callbacks and wrappers are appropriately set, but ignore
			// the return value since we know that no observers will be triggered.
			this.set(key, value);
		}
	}

	private wrapObject<U extends object>(obj: U, callback: () => void): U {
		// Skip nulls and already-proxified objects.
		if (obj == null || isProxified(obj)) return obj;

		// Skip frozen/sealed objects - they can't be modified and proxying them would
		// violate JS invariants (get trap must return actual value for non-configurable props).
		if (Object.isFrozen(obj) || Object.isSealed(obj)) return obj;

		// Skip built-in types that don't work well with proxies (have internal slots).
		// User-defined class instances are allowed since their properties are just data.
		if (
			obj instanceof Date ||
			obj instanceof RegExp ||
			obj instanceof Map ||
			obj instanceof Set ||
			obj instanceof WeakMap ||
			obj instanceof WeakSet ||
			obj instanceof Error ||
			obj instanceof Promise ||
			ArrayBuffer.isView(obj) ||
			obj instanceof ArrayBuffer ||
			(typeof Node !== "undefined" && obj instanceof Node)
		) {
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
				// Skip if the value is unchanged.
				if (Reflect.get(target, prop, receiver) === value) return true;

				if (typeof value === "object" && value !== null) {
					value = this.wrapObject(value as object, callback);
				}
				const ret = Reflect.set(target, prop, value, receiver);
				callback();
				return ret;
			},
			get: (target: U, prop: string | symbol, receiver: unknown): unknown => {
				if (prop === PROXY_MARKER) return true;
				const result = Reflect.get(target, prop, receiver);

				// Lazily wrap nested objects for deep reactivity.
				// This ensures that modifications like items[0].visible = true trigger notifications.
				if (result !== null && typeof result === "object" && !isProxified(result)) {
					const wrapped = this.wrapObject(result as object, callback);
					// If wrapObject returned a different object (a proxy), store it back for identity.
					if (wrapped !== result) {
						Reflect.set(target, prop, wrapped, receiver);
						return wrapped;
					}
				}
				return result;
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

		// Check if this observer is already registered (avoid duplicates).
		const existing = Array.from(owner.observers.get(key) || []);
		if (!existing.some((entry) => entry.observer === observer)) {
			// Store the observer along with the store context that registered it.
			owner.observers.get(key)?.add({ observer, store: this });
		}
	}

	addKeyHandler(pattern: RegExp, handler: KeyValueHandler): void {
		if (!this.keyHandlers.has(pattern)) {
			this.keyHandlers.set(pattern, new Set());
		}
		this.keyHandlers.get(pattern)?.add(handler);
	}

	async notify(key: string, debounceMillis: number = REACTIVE_DEBOUNCE_MILLIS): Promise<void> {
		// Capture observers NOW (at call time). This ensures constructor calls
		// don't trigger effects registered later.
		const owner = getAncestorKeyStore(this, key);
		const entries = Array.from(owner?.observers.get(key) || []);

		const current = this._notify.get(key);

		// Skip if observers are already executing for this key (prevents infinite loops).
		if (current === "executing") return;

		// Clear any pending notification (debounce).
		if (current) clearTimeout(current);

		// Schedule the notification.
		return new Promise((resolve) => {
			this._notify.set(
				key,
				setTimeout(async () => {
					this._notify.set(key, "executing");
					try {
						await Promise.all(
							entries.map((entry) => entry.observer.call(entry.store.proxify(entry.observer))),
						);
					} finally {
						this._notify.delete(key);
					}
					resolve();
				}, debounceMillis),
			);
		});
	}

	get<T>(key: string, observer?: Observer<T>): unknown {
		if (observer) this.watch(key, observer);
		return getAncestorValue(this, key);
	}

	private setupComputed<R>(key: string, computedFn: ComputedFn<StoreState, R>): void {
		const store = this;
		this.effect(function (this: ReactiveContext<T>) {
			// Pass `this` as both the context and first argument, so arrow functions
			// can receive the reactive proxy as `$` parameter.
			const result = computedFn.call(this, this);
			const oldValue = store._store.get(key);
			// Only update and notify if value actually changed.
			if (oldValue !== result) {
				setAncestorValue(store, key, result);
				// Synchronously invoke observers of the computed key to ensure
				// cascading computed values update in the same tick.
				const owner = getAncestorKeyStore(store, key);
				const entries = Array.from(owner?.observers.get(key) || []);
				for (const entry of entries) {
					entry.observer.call(entry.store.proxify(entry.observer));
				}
			}
		});
	}

	/**
	 * Sets a value in the store.
	 * @param key - The key to set.
	 * @param value - The value to set (can be a computed marker).
	 * @param local - If true, sets directly on this store bypassing ancestor lookup.
	 *                Use for creating local scope variables that shadow ancestors.
	 */
	async set(key: string, value: unknown, local?: boolean): Promise<void> {
		if (isComputedMarker(value)) {
			this.setupComputed(key, value.fn);
			return;
		}

		// Early return if the key exists in this store and has the same value.
		if (this._store.has(key) && value === this._store.get(key)) return;
		const callback = () => this.notify(key);
		// Note: Functions are NOT wrapped here. They are wrapped dynamically at access
		// time in proxify() to ensure the correct observer context is used.
		if (value && typeof value === "object") {
			value = this.wrapObject(value, callback);
		}

		if (local) {
			// Set directly on this store, not on ancestors.
			this._store.set(key, value);
		} else {
			setAncestorValue(this, key, value);
		}

		// Invoke any key handlers (only for non-local sets).
		if (!local) {
			for (const [pattern, handlers] of this.keyHandlers.entries()) {
				if (pattern.test(key)) {
					for (const handler of handlers) {
						await Promise.resolve(handler.call(this.$, key, value));
					}
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

	/**
	 * Returns observer statistics for performance reporting.
	 */
	getObserverStats(): { totalKeys: number; totalObservers: number; byKey: Record<string, number> } {
		const byKey: Record<string, number> = {};
		let totalObservers = 0;

		for (const [key, observers] of this.observers) {
			byKey[key] = observers.size;
			totalObservers += observers.size;
		}

		return {
			totalKeys: this.observers.size,
			totalObservers,
			byKey,
		};
	}

	effect<R>(observer: (this: ReactiveContext<T>) => R, _meta?: EffectMeta): R {
		// Base implementation ignores metadata; IRenderer overrides to add performance tracking.
		return observer.call(this.proxify(observer as Observer<R>) as ReactiveContext<T>);
	}

	/**
	 * Creates a computed value marker. When passed to set(), the function will be
	 * evaluated in a reactive effect, and the result stored. When dependencies change,
	 * the function re-evaluates and updates the stored value.
	 *
	 * @example
	 * // Using function() to access reactive `this`:
	 * store.set('double', store.$computed(function() { return this.count * 2 }));
	 * // Using arrow function with $ parameter (for templates):
	 * store.set('double', store.$computed(($) => $.count * 2));
	 */
	$computed<R>(fn: ComputedFn<T, R>): ComputedMarker<R> {
		return { [COMPUTED_MARKER]: true, fn: fn as ComputedFn<StoreState, R> };
	}

	private proxify<T>(observer?: Observer<T>): SignalStoreProxy {
		const keys = Array.from(this._store.entries()).map(([key]) => key);
		const keyval = Object.fromEntries(keys.map((key) => [key, null]));

		// Wraps a function to use the receiver proxy as `this`, ensuring proper
		// context and dependency tracking when the function accesses reactive properties.
		// Skips "constructor" as it needs to be callable with `new`.
		const wrapMaybeFunction = (
			value: unknown,
			prop: string | symbol,
			receiver: unknown,
		): unknown => {
			if (typeof value === "function" && prop !== "constructor") {
				return (...args: unknown[]) => (value as AnyFunction).call(receiver, ...args);
			}
			return value;
		};

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
						const value = this.get(prop, observer);
						// If the value is a SignalStore (e.g., $parent) and we have an
						// observer, return it as a proxy for proper dependency tracking.
						if (observer && value instanceof SignalStore) {
							return value.proxify(observer);
						}
						return wrapMaybeFunction(value, prop, receiver);
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
					const value = Reflect.get(this, prop, receiver);
					return wrapMaybeFunction(value, prop, receiver);
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
		// Use this.$ which returns a proxy. When called through an effect's proxy,
		// this.$ inherits the observer for proper dependency tracking.
		const thisArg = this.$;
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
