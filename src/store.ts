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
	computedKey?: string;
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
	value?: R;
	dirty: boolean;
	effectFn?: Observer<unknown>;
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

/**
 * How long observers wait after a key is written before they run. Writes arriving
 * during that window are free: they join the already-scheduled run instead of
 * postponing it, so a key written continuously is never starved. Its cadence is the
 * gap between writes plus this, not this on its own.
 *
 * This is a floor on every update, isolated writes included, and that is deliberate.
 * A shorter window lets a frame boundary fall between a transient value and the write
 * that corrects it, so the renderer paints states the user was never meant to see;
 * measured at 15-30% of trials with the window at zero, against none at 10ms. See
 * https://github.com/fresho-dev/mancha/issues/67 for the measurements.
 */
export const REACTIVE_DEBOUNCE_MILLIS = 10;

/**
 * How long one causal chain of observer runs may keep producing runs before it is reported
 * as non-convergent. Ordinary rendering settles in a fraction of this: a deep mutation is
 * 13ms, a whole list replaced is 45ms, and growing a list to 240 rows is 62ms, all measured
 * to the last DOM mutation. Nothing legitimate is anywhere near it, and a runaway is
 * unbounded, so the exact value mostly decides how quickly the report arrives.
 *
 * The one thing it does trade: a chain that genuinely needs hundreds of sequential passes
 * terminates, but not inside this, so it is reported. That shape was measured at 1.65s in
 * #74. Reporting it is a stray console line, which is the cost of the report arriving in
 * half a second rather than five.
 */
export const REACTIVE_CASCADE_BUDGET_MILLIS = 500;

/** `performance.now()` where it exists, so an NTP step backwards cannot stall a report. */
function monotonicNow(): number {
	return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/**
 * How many runs a chain must have produced before its age counts against it. Wall clock
 * alone would misread a short chain in a background tab, where timers are clamped to a
 * second or more and six legitimate waves can span a minute. Ordinary rendering settles in
 * a handful of waves, so a chain this deep is already anomalous whatever the clock says.
 */
const REACTIVE_CASCADE_MIN_RUNS = 20;

/** One causal chain of observer runs: an outside write, and everything it wakes. */
interface Cascade {
	readonly startedAt: number;
	runs: number;
	reported: boolean;
}

/**
 * The chain whose observers are running, for exactly as long as they are running. Set
 * around a synchronous call and restored after it, so it is a dynamic scope rather than
 * state two stores could see each other through.
 */
let runningCascade: Cascade | null = null;

/**
 * The chain a run scheduled at this moment belongs to: the one whose observer is doing the
 * scheduling, or a new one if the write came from outside. Carrying identity this way,
 * rather than counting passes against a key, is what stops an unrelated write -- a clock
 * tick, a poll result, a bound input -- from minting a fresh chain over the top of a
 * runaway and hiding it.
 */
function currentCascade(): Cascade {
	return runningCascade ?? { startedAt: monotonicNow(), runs: 0, reported: false };
}

/**
 * Runs `body` as part of `cascade`, so anything it schedules joins that chain, and reports
 * the chain if it has now outlived its budget. `body` must be synchronous: an awaited tail
 * would let another chain's runs interleave and be attributed here.
 *
 * Reporting never truncates. A chain that is merely long cannot be told apart from one that
 * never ends, so cutting one off would leave correct programs silently half-rendered, which
 * is worse than the loop.
 */
function runInCascade<T>(cascade: Cascade, key: string, body: () => T): T {
	// Checked before the body rather than after, so the chain is reported the moment it is
	// known to have outlived its budget and still be going.
	cascade.runs++;
	if (
		!cascade.reported &&
		cascade.runs > REACTIVE_CASCADE_MIN_RUNS &&
		monotonicNow() - cascade.startedAt > REACTIVE_CASCADE_BUDGET_MILLIS
	) {
		cascade.reported = true;
		console.warn(
			`[mancha] A reactive cascade has been running for over ` +
				`${REACTIVE_CASCADE_BUDGET_MILLIS}ms without settling, and is now running the ` +
				`observers of '${key}'. Something they write wakes them again, so this will not ` +
				"stop on its own. Rendering continues; see " +
				"https://github.com/fresho-dev/mancha/issues/75",
		);
	}

	const enclosing = runningCascade;
	runningCascade = cascade;
	try {
		return body();
	} finally {
		runningCascade = enclosing;
	}
}

/** An observer run that has been scheduled but has not started yet. */
interface PendingRun {
	/** Resolves once the run has finished, so writes that join it can be awaited. */
	done: Promise<void>;
	/**
	 * Who the run will notify. Writes that join the run add the observers registered
	 * at their own call time, so a watcher registered after the write that scheduled
	 * the run still gets notified by the next write, while observers registered after
	 * the last write are left for a later run.
	 */
	entries: ObserverEntry[];
}

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

/** Something woken when an object, or anything nested inside it, is mutated. */
type MutationSubscriber = () => void;

/**
 * Deep-mutation bookkeeping for one proxified object, registered under both the proxy and its
 * raw target. The same object routinely lives in more than one store under more than one key
 * (a `:for` row holds the very proxy its parent holds), and every one of those keys has to
 * hear about a mutation, not just the key that happened to install the proxy first.
 */
interface DeepMutationRecord {
	/**
	 * Store keys to wake, held strongly. What bounds this set is that every store that
	 * subscribes also unsubscribes: `set()` drops the value it replaces, `del()` drops the
	 * value it removes, and `dispose()` drops everything the store still holds.
	 */
	readonly subscribers: Set<MutationSubscriber>;
	/**
	 * Records of the objects this one is nested in, so a deep mutation travels back up to the
	 * keys holding them. Held as a set of records rather than of callbacks so that an object
	 * carries at most one entry per enclosing object however often it is re-wrapped.
	 */
	readonly holders: Set<DeepMutationRecord>;
}

const deepMutations = new WeakMap<object, DeepMutationRecord>();

/** True for a value that can be mutated in place, and so can carry deep-mutation subscribers. */
function isMutableObject(value: unknown): value is object {
	return value !== null && typeof value === "object";
}

/**
 * Returns the deep-mutation record of a value the store already tracks, if it has one. Values
 * the store cannot proxify (frozen objects, class instances, other stores) have none, and
 * cannot report mutations, so there is nothing to subscribe to or link them into.
 */
function trackedRecord(value: unknown): DeepMutationRecord | undefined {
	return isMutableObject(value) ? deepMutations.get(value) : undefined;
}

/**
 * True for a record that no store key reaches at this instant, either directly or through an
 * object that encloses it. A mutation of such a record cannot become a notification, so a link
 * to it is dead weight; every object that a `set()` replaced ends up in this state.
 *
 * "At this instant" is the whole of the claim, and dropping the link is only safe because the
 * next read of the path restores it - reading is how a key comes to hold a nested object in the
 * first place. `set()` is the one way round that: it subscribes a key to a value without
 * reading through it, so a key re-set to an object it previously replaced needs one read of the
 * path before deep mutations of an already-wrapped nested object reach it again. Templates do
 * not hit this, because a binding that wants such a notification depends on the container key,
 * so the re-set re-renders and re-links before the next mutation; a bare `watch()` on the
 * container key is the exposed surface, and `store.test.ts` pins it.
 */
function isUnreachable(record: DeepMutationRecord): boolean {
	return record.subscribers.size === 0 && record.holders.size === 0;
}

/**
 * Wakes everything that must hear about a mutation of the object `record` describes.
 *
 * `notified` holds the records this mutation has already reached. A deep mutation reaches an
 * object from every object that holds it, and a cyclic graph holds itself, so a fan-out that
 * did not skip those would recurse until the stack ran out. It is threaded as a parameter
 * rather than kept in a module-level variable so that the guard is visible at every hop
 * instead of having to be re-derived from the call order.
 */
function fanOutMutation(record: DeepMutationRecord, notified: Set<DeepMutationRecord>): void {
	if (notified.has(record)) return;
	notified.add(record);

	// Enclosing objects first, so keys are notified from the outside in: a `:for` over a list
	// has to reconcile its rows before the directives on a row react to the row's own item,
	// or the reconciliation undoes what they did. Waking the keys in that order only decides
	// the order their observers run in because `notify()` schedules every key on the same
	// `REACTIVE_DEBOUNCE_MILLIS` timer, so registration order is execution order. Scheduling
	// keys with different delays would decouple the two and break `:key` alongside `:if` on
	// one element again.
	//
	// Links to enclosing objects are added when an object is reached through one and are never
	// removed by the reverse operation, because replacing an object is not something the object
	// it contained can observe. Dropping the ones that lead nowhere while walking them keeps
	// this set bounded by the objects that currently enclose this one, instead of growing by
	// one entry for every object that ever did.
	for (const holder of Array.from(record.holders)) {
		if (isUnreachable(holder)) record.holders.delete(holder);
		else fanOutMutation(holder, notified);
	}

	// Snapshotted because a subscriber may subscribe or unsubscribe as it runs.
	for (const subscriber of Array.from(record.subscribers)) subscriber();
}

/** Wakes the keys holding `obj`, and the keys holding anything `obj` is nested in. */
function notifyDeepMutation(record: DeepMutationRecord): void {
	fanOutMutation(record, new Set());
}

/** Subscribes `subscriber` to deep mutations of `value`, if the store tracks it. */
function subscribeToMutations(value: unknown, subscriber: MutationSubscriber): void {
	trackedRecord(value)?.subscribers.add(subscriber);
}

/** Stops `subscriber` from being woken by deep mutations of `value`. */
function unsubscribeFromMutations(value: unknown, subscriber: MutationSubscriber): void {
	trackedRecord(value)?.subscribers.delete(subscriber);
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

	/** Keys with a scheduled observer run. */
	private readonly _pending = new Map<string, PendingRun>();

	/** Keys whose observers are running right now. */
	private readonly _executing = new Set<string>();

	/** Keys written while their own observers were running, to notify afterwards. */
	private readonly _dirty = new Set<string>();

	/**
	 * Stores created from this one, disposed along with it. A subrenderer is only reachable
	 * through the store that created it and the node it renders, so without this nothing ever
	 * disposes a nested `:for` row or a `:render` subrenderer.
	 */
	protected readonly _children = new Set<SignalStore>();

	/** Per-key deep-mutation subscribers, kept stable so they can be unsubscribed later. */
	private readonly _mutationCallbacks = new Map<string, MutationSubscriber>();

	/** Set by dispose(). Observers registered by a disposed store must no longer run. */
	protected _disposed = false;

	/**
	 * Tracks nested computed evaluation depth. When > 0, we're inside a computed
	 * function and writes to reactive properties should trigger a warning.
	 */
	private _computedDepth: number = 0;

	constructor(data?: T) {
		for (const [key, value] of Object.entries(data || {})) {
			// Use our set method to ensure that callbacks and wrappers are appropriately set, but ignore
			// the return value since we know that no observers will be triggered.
			this.set(key, value);
		}
	}

	private wrapObject<U extends object>(obj: U): U {
		// Skip nulls and already-proxified objects. Re-wrapping a proxy would lose its identity,
		// and its record already carries whatever subscribes to it.
		if (obj == null || isProxified(obj)) return obj;

		// Skip frozen/sealed objects - they can't be modified and proxying them would
		// violate JS invariants (get trap must return actual value for non-configurable props).
		if (Object.isFrozen(obj) || Object.isSealed(obj)) return obj;

		// Only wrap plain objects and arrays. Custom class instances are skipped because
		// deep reactivity on arbitrary classes can cause unexpected behavior and performance
		// issues (e.g., classes that modify internal state when methods are called).
		const proto = Object.getPrototypeOf(obj);
		const isPlainObject = proto === Object.prototype || proto === null;
		const isArray = Array.isArray(obj);
		if (!isPlainObject && !isArray) {
			return obj;
		}
		// Reused when the same raw object is wrapped again, so that a second proxy over it does
		// not orphan the subscribers the first one collected.
		const record = deepMutations.get(obj) ?? { subscribers: new Set(), holders: new Set() };
		deepMutations.set(obj, record);
		const notifyMutation = () => notifyDeepMutation(record);

		const proxy = new Proxy(obj, {
			deleteProperty: (target: U, property: string | symbol): boolean => {
				if (typeof property === "string" && property in target) {
					delete (target as Record<string, unknown>)[property];
					notifyMutation();
					return true;
				}
				return false;
			},
			set: (target: U, prop: string | symbol, value: unknown, receiver: unknown): boolean => {
				// Skip if the value is unchanged.
				if (Reflect.get(target, prop, receiver) === value) return true;

				if (isMutableObject(value)) {
					value = this.wrapObject(value);
					trackedRecord(value)?.holders.add(record);
				}
				const ret = Reflect.set(target, prop, value, receiver);
				notifyMutation();
				return ret;
			},
			get: (target: U, prop: string | symbol, receiver: unknown): unknown => {
				if (prop === PROXY_MARKER) return true;
				const result = Reflect.get(target, prop, receiver);
				if (!isMutableObject(result)) return result;

				// Lazily wrap nested objects for deep reactivity.
				// This ensures that modifications like items[0].visible = true trigger notifications.
				const wrapped = this.wrapObject(result);
				// If wrapObject returned a different object (a proxy), store it back for identity.
				if (wrapped !== result) Reflect.set(target, prop, wrapped, receiver);

				// Linked on every read rather than only when the object is first wrapped, so that
				// an object reached through a new enclosing object reports to it too, and a link
				// dropped as unreachable is restored as soon as the object is reached again.
				trackedRecord(wrapped)?.holders.add(record);
				return wrapped;
			},
		});

		// Holders only ever see the proxy, so subscriptions must resolve through it too.
		deepMutations.set(proxy, record);
		return proxy;
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

	/**
	 * Tags all observer entries matching the given observer function with a computed key.
	 * Called after effect runs to mark which observers belong to which computed.
	 */
	private tagObserversForComputed(observer: Observer<unknown>, computedKey: string): void {
		// Check this store's observers.
		for (const entries of this.observers.values()) {
			for (const entry of entries) {
				if (entry.observer === observer && entry.store === this) {
					entry.computedKey = computedKey;
				}
			}
		}

		// Also check ancestor stores (for inherited dependencies).
		let ancestor = this._store.get("$parent") as SignalStore | undefined;
		while (ancestor) {
			for (const entries of ancestor.observers.values()) {
				for (const entry of entries) {
					if (entry.observer === observer && entry.store === this) {
						entry.computedKey = computedKey;
					}
				}
			}
			ancestor = ancestor._store.get("$parent") as SignalStore | undefined;
		}
	}

	/**
	 * Synchronously marks all computeds that depend on this key as dirty.
	 * Uses the computedKey field on observer entries for O(1) key lookup.
	 * Cascades through computed chains (if A depends on B, and B is marked dirty,
	 * then A is also marked dirty).
	 */
	private markDependentComputedsDirty(key: string): void {
		const owner = getAncestorKeyStore(this, key);
		const entries = owner?.observers.get(key);
		if (!entries) return;

		for (const entry of entries) {
			if (entry.computedKey) {
				const stored = entry.store._store.get(entry.computedKey);
				if (isComputedMarker(stored) && !stored.dirty) {
					stored.dirty = true;
					// Cascade: mark computeds that depend on THIS computed.
					entry.store.markDependentComputedsDirty(entry.computedKey);
				}
			}
		}
	}

	/**
	 * Invokes `entries` and returns their pending tails. Stays synchronous from end to end:
	 * the caller relies on nothing being able to interleave until it returns.
	 */
	private runObservers(entries: ObserverEntry[]): unknown[] {
		// Entries were captured before the deadline, so a store disposed in the meantime would
		// otherwise still run its effects and, for example, put a removed :for row back in the DOM.
		return entries
			.filter((entry) => !entry.store._disposed)
			.map((entry) => entry.observer.call(entry.store.proxify(entry.observer)));
	}

	async notify(key: string, debounceMillis: number = REACTIVE_DEBOUNCE_MILLIS): Promise<void> {
		// Capture observers NOW (at call time). This ensures constructor calls
		// don't trigger effects registered later.
		const owner = getAncestorKeyStore(this, key);
		const entries = Array.from(owner?.observers.get(key) || []);

		// Record writes that arrive while this key's observers are running, rather than
		// dropping them, and flush them once the in-flight run finishes. The observers'
		// own writes are filtered out below, not here.
		if (this._executing.has(key)) {
			this._dirty.add(key);
			return;
		}

		// Observers are already scheduled and will read the value this write just set,
		// so join that run rather than scheduling another. Leaving the existing deadline
		// alone is what keeps a continuously-written key from postponing itself forever.
		const scheduled = this._pending.get(key);
		if (scheduled) {
			for (const entry of entries) {
				if (!scheduled.entries.includes(entry)) scheduled.entries.push(entry);
			}
			return scheduled.done;
		}

		// Captured here, in the writer's own synchronous context, so a write made by an
		// observer joins the chain that observer belongs to and an outside write starts a
		// new one. Read at run time it would always be a new one, the timer having put a
		// task boundary in between.
		const cascade = currentCascade();

		const done = new Promise<void>((resolve) => {
			setTimeout(async () => {
				this._pending.delete(key);
				try {
					this._executing.add(key);

					// Invoking an observer runs its body up to its first await, so nothing
					// else can interleave here: any write recorded during this line came
					// from the observers themselves. Discarding those stops an observer
					// whose body writes its own key from rescheduling itself forever.
					// A self-write from an observer's awaited tail is indistinguishable
					// from an outside one, so that remains a cycle the caller must avoid.
					const running = runInCascade(cascade, key, () => this.runObservers(entries));
					this._dirty.delete(key);

					// Anything recorded from here on arrived from outside, and is honored.
					await Promise.all(running);
				} finally {
					this._executing.delete(key);

					// Flush any write that arrived while the observers were awaiting. In the
					// finally block so a throwing observer still can't swallow the write.
					//
					// Deliberately outside the cascade: a write recorded here is as likely to
					// be a click or a poll result as an observer's own awaited tail, and the
					// two are indistinguishable. Following it would let an outside write
					// arriving mid-run extend a chain that is behaving, so a self-write loop
					// through an observer's asynchronous tail goes unreported rather than
					// risk reporting correct code. That loop is the one `docs/03_reactivity.md`
					// already tells callers to avoid; the chain that is followed only ever
					// grows through writes an observer's synchronous body made, which are
					// unambiguous.
					if (this._dirty.delete(key)) void this.notify(key, debounceMillis);
				}

				// Lazy cleanup: remove observers whose store's $rootNode is orphaned.
				// This handles memory leaks from removed :for items, replaced :html content, etc.
				// Only applies to subrenderers (stores with $parent) - root renderer observers persist.
				// A node is considered orphaned if it's both disconnected AND has no parent node.
				// Nodes inside a DocumentFragment (e.g., during mount before DOM attachment)
				// have parentNode != null and should NOT be cleaned up.
				const observerSet = owner?.observers.get(key);
				if (observerSet) {
					for (const entry of entries) {
						const hasParent = entry.store._store.has("$parent");
						const rootNode = entry.store._store.get("$rootNode") as Node | undefined;
						if (hasParent && rootNode && !rootNode.isConnected && !rootNode.parentNode) {
							observerSet.delete(entry);
						}
					}
				}

				resolve();
			}, debounceMillis);
		});

		this._pending.set(key, { done, entries });
		return done;
	}

	get<T>(key: string, observer?: Observer<T>): unknown {
		if (observer) this.watch(key, observer);

		const stored = getAncestorValue(this, key);

		// Handle computed values: recompute if dirty, return the cached value.
		if (isComputedMarker(stored)) {
			if (stored.dirty) {
				this._computedDepth++;
				try {
					// Use the effect function as observer to register new dependencies.
					// This handles conditional dependencies that change based on execution path.
					const proxy = this.proxify(stored.effectFn) as ReactiveContext<StoreState>;
					stored.value = stored.fn.call(proxy, proxy);
					stored.dirty = false;
					// Tag any new observers with the computed key.
					if (stored.effectFn) {
						this.tagObserversForComputed(stored.effectFn, key);
					}
					// Mark dependents of this computed as dirty (cascading).
					this.markDependentComputedsDirty(key);
				} finally {
					this._computedDepth--;
				}
			}
			return stored.value;
		}

		return stored;
	}

	private setupComputed<R>(key: string, computedFn: ComputedFn<StoreState, R>): void {
		const store = this;

		// Create the marker with dirty: true for initial computation.
		const marker: ComputedMarker<R> = {
			[COMPUTED_MARKER]: true,
			fn: computedFn as ComputedFn<StoreState, R>,
			dirty: true,
		};
		this._store.set(key, marker);

		// Define the effect function that will update the marker.
		const effectFn = function (this: ReactiveContext<T>) {
			// Track computed depth for write guard warnings.
			store._computedDepth++;
			try {
				// Pass `this` as both the context and first argument, so arrow functions
				// can receive the reactive proxy as `$` parameter.
				const result = computedFn.call(this, this);
				const oldValue = marker.value;
				// Only notify if value actually changed.
				if (oldValue !== result) {
					marker.value = result;
					// Synchronously invoke observers of the computed key to ensure
					// cascading computed values update in the same tick.
					const owner = getAncestorKeyStore(store, key);
					const entries = Array.from(owner?.observers.get(key) || []);
					for (const entry of entries) {
						entry.observer.call(entry.store.proxify(entry.observer));
					}
				}
				marker.dirty = false;
			} finally {
				store._computedDepth--;
			}
		};

		// Store the effect function in the marker for use during lazy recomputation.
		marker.effectFn = effectFn as unknown as Observer<unknown>;

		// Run the effect to register observers and compute initial value.
		this.effect(effectFn, { directive: "computed", id: key });

		// Tag all observers created by this effect with the computed key.
		this.tagObserversForComputed(effectFn as unknown as Observer<unknown>, key);
	}

	/**
	 * Returns this store's deep-mutation subscriber for `key`. The same key always yields the
	 * same function, so subscriptions can be matched and removed. Created on demand, so a key
	 * that never holds an object never retains a closure.
	 */
	private mutationCallback(key: string): MutationSubscriber {
		const existing = this._mutationCallbacks.get(key);
		if (existing) return existing;

		const subscriber: MutationSubscriber = () => {
			this.markDependentComputedsDirty(key);
			void this.notify(key);
		};
		this._mutationCallbacks.set(key, subscriber);
		return subscriber;
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

		// Resolved through the chain even for a local set: a local set can shadow a key this
		// store only inherits, and the subscription to unwind is the one held on the inherited
		// value. Reading this store's map alone would leave that subscription behind as a stale
		// wake-up.
		const previous = getAncestorValue(this, key);

		// Note: Functions are NOT wrapped here. They are wrapped dynamically at access
		// time in proxify() to ensure the correct observer context is used.
		if (isMutableObject(value)) value = this.wrapObject(value);

		// Only a tracked object can report being mutated in place, so a key that holds neither
		// an old nor a new one needs no deep-mutation subscriber. Subscribing here rather than
		// inside wrapObject() is what lets a key that receives an object another store already
		// owns still learn about mutations to it, which is what a reused `:for` row needs.
		if (trackedRecord(value) || isMutableObject(previous)) {
			const subscriber = this.mutationCallback(key);

			// Stop listening to the value being replaced, so it no longer wakes this key.
			unsubscribeFromMutations(previous, subscriber);
			subscribeToMutations(value, subscriber);
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

		// Notify observers of the write itself.
		this.markDependentComputedsDirty(key);
		await this.notify(key);
	}

	async del(key: string): Promise<void> {
		// By setting to null, we trigger observers before deletion.
		await this.set(key, null);
		this._store.delete(key);
		this.observers.delete(key);
		this._mutationCallbacks.delete(key);
	}

	/**
	 * Releases this store and every store created from it, recording them in `disposed` for the
	 * single ancestor pass that follows. Observers registered on ancestors are deliberately left
	 * to the caller: every store here shares this store's ancestors, so removing them once for
	 * the whole subtree replaces a scan of every ancestor once per descendant.
	 */
	private disposeSubtree(disposed: Set<SignalStore>): void {
		if (disposed.has(this)) return;
		disposed.add(this);
		this._disposed = true;

		// Safe to iterate in place: a descendant detaches nothing from this set, and the guard
		// above stops a cycle in the store graph from recursing back into it.
		for (const child of this._children) child.disposeSubtree(disposed);
		this._children.clear();

		// Stop listening to values this store subscribed to, which also drops the references
		// those values hold to this store.
		for (const [key, subscriber] of this._mutationCallbacks) {
			unsubscribeFromMutations(getAncestorValue(this, key), subscriber);
		}
		this._mutationCallbacks.clear();

		// Clear local observers.
		for (const observerSet of this.observers.values()) {
			observerSet.clear();
		}
		this.observers.clear();
	}

	/**
	 * Disposes this store by clearing all observers.
	 * Call this when the store is no longer needed to prevent memory leaks.
	 * Also removes any observers this store registered on ancestor stores, disposes the stores
	 * created from this one, and stops listening to deep mutations of the values it holds.
	 */
	dispose(): void {
		// Detach from the creator, so a disposed store is neither disposed twice nor retained.
		(this._store.get("$parent") as SignalStore | undefined)?._children.delete(this);

		// Dispose stores created from this one. A subrenderer is reachable only from its creator
		// and from the node it renders, so unless disposal cascades, dropping a `:for` row or
		// replacing `:html` content leaves every subrenderer nested inside it alive, subscribed,
		// and rendering into detached nodes.
		const disposed = new Set<SignalStore>();
		this.disposeSubtree(disposed);

		// Remove observers registered on ancestors (for inherited keys). A store is only ever
		// adopted by the store it names as `$parent`, so the whole subtree hangs below this one
		// and one pass per ancestor removes every entry the subtree registered. Scanning them
		// once per disposed store instead would cost O(rows * ancestor observers).
		let ancestor = this._store.get("$parent") as SignalStore | undefined;
		while (ancestor) {
			for (const observerSet of ancestor.observers.values()) {
				for (const entry of observerSet) {
					if (disposed.has(entry.store)) observerSet.delete(entry);
				}
			}
			ancestor = ancestor._store.get("$parent") as SignalStore | undefined;
		}
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
	 * Creates a computed property that automatically updates when its dependencies change.
	 * The function is evaluated in a reactive effect, and the result is stored. When any
	 * reactive property accessed within the function changes, it re-evaluates and updates.
	 *
	 * **Important:** This method returns a marker object at runtime, but is typed as
	 * returning `R` to enable ergonomic property assignment without type casts. The return
	 * value must be assigned to a store property (via `set()` or `$.prop =`) - do not use
	 * it directly as a value.
	 *
	 * @example
	 * // Using function() to access reactive `this`:
	 * store.set('double', store.$computed(function() { return this.count * 2 }));
	 *
	 * // Using arrow function with $ parameter (for templates):
	 * store.set('double', store.$computed(($) => $.count * 2));
	 *
	 * // Direct property assignment (ergonomic typing):
	 * store.$.doubled = store.$computed(($) => $.count * 2);
	 */
	$computed<R>(fn: ComputedFn<T, R>): R {
		// Returns a marker object that signals to set() this is a computed property.
		// The return type is R (not ComputedMarker<R>) to allow ergonomic assignment
		// like `$.prop = $computed(fn)` without requiring type casts.
		return { [COMPUTED_MARKER]: true, fn: fn as ComputedFn<StoreState, R>, dirty: true } as R;
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
					// Warn if writing to reactive property inside a computed.
					if (this._computedDepth > 0) {
						console.warn(
							`[mancha] Computed wrote to '${prop}'. Computeds should be pure; use $effect for side effects.`,
						);
					}
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
