type Listener<T> = (curr: T | null, prev: T | null) => any | Promise<any>;
declare abstract class IDebouncer {
    timeout: ReturnType<typeof setTimeout> | null;
    debounce<T>(millis: number, callback: () => T): Promise<T>;
}
/** Default debouncer time in millis. */
export declare const REACTIVE_DEBOUNCE_MILLIS = 25;
export declare function proxifyObject<T extends object>(object: T, callback: () => void, deep?: boolean): T;
export declare class ReactiveProxy<T> extends IDebouncer {
    private value;
    private listeners;
    protected constructor(value?: T | null, ...listeners: Listener<T>[]);
    static from<T>(value: T | ReactiveProxy<T>, ...listeners: Listener<T>[]): ReactiveProxy<T>;
    get(): T;
    set(value: T | null): Promise<void>;
    watch(listener: Listener<T>): void;
    unwatch(listener: Listener<T>): void;
    trigger(prev?: T | null): Promise<void>;
}
export declare class InertProxy<T> extends ReactiveProxy<T> {
    static from<T>(value: T | InertProxy<T>, ...listeners: Listener<T>[]): InertProxy<T>;
    watch(_: Listener<T>): void;
    trigger(_?: T | null): Promise<void>;
}
export declare class ReactiveProxyStore extends IDebouncer {
    protected readonly store: Map<string, ReactiveProxy<any>>;
    protected tracing: boolean;
    protected readonly traced: Set<string>;
    lock: Promise<void>;
    private wrapFnValue;
    constructor(data?: {
        [key: string]: any;
    });
    get $(): ReactiveProxyStore & {
        [key: string]: any;
    };
    entries(): IterableIterator<[string, ReactiveProxy<any>]>;
    get<K extends string>(key: K): any;
    set<K extends string>(key: K, value: any): Promise<void>;
    del<K extends string>(key: K): boolean;
    has<K extends string>(key: K): boolean;
    /**
     * Updates the internal store with the provided data.
     * @param data data to add to the internal store.
     */
    update(data: {
        [key: string]: any;
    }): Promise<void>;
    watch(keys: string | string[], listener: (...value: any[]) => any): void;
    trigger(keys: string | string[]): Promise<void>;
    trace<T>(callback: () => T | Promise<T>): Promise<[T, string[]]>;
    /**
     * Computes the result of `callback` and stores it as `key` in the store. If any of the other
     * store elements referenced in `callback` change, the computed value will be updated.
     * @param key key of the computed property
     * @param callback function that computes property
     */
    computed<T>(key: string, callback: (this: {
        [key: string]: any;
    }) => T | Promise<T>): Promise<void>;
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
export declare function proxify(store: ReactiveProxyStore): ReactiveProxyStore & {
    [key: string]: any;
};
export {};
