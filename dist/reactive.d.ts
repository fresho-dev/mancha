type Listener<T> = (curr: T | null, prev: T | null) => any | Promise<any>;
export declare function proxifyObject<T extends object>(object: T, callback: () => void, deep?: boolean): T;
export declare class ReactiveProxy<T> {
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
    watch(listener: Listener<T>): void;
    trigger(prev?: T | null): Promise<void>;
}
export declare class ReactiveProxyStore {
    protected readonly store: Map<string, ReactiveProxy<any>>;
    protected tracing: boolean;
    protected readonly traced: Set<string>;
    protected lock: Promise<void>;
    private wrapFnValue;
    constructor(data?: {
        [key: string]: any;
    });
    entries(): IterableIterator<[string, ReactiveProxy<any>]>;
    get<K extends string>(key: K): any;
    set<K extends string>(key: K, value: any): Promise<void>;
    del<K extends string>(key: K): boolean;
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
export declare function proxify(store: ReactiveProxyStore): {
    [key: string]: any;
};
export {};
