type SignalStoreProxy = SignalStore & {
    [key: string]: any;
};
type Observer<T> = (this: SignalStoreProxy) => T;
declare abstract class IDebouncer {
    timeouts: Map<Function, ReturnType<typeof setTimeout>>;
    debounce<T>(millis: number, callback: () => T | Promise<T>): Promise<T>;
}
/** Default debouncer time in millis. */
export declare const REACTIVE_DEBOUNCE_MILLIS = 10;
export declare function getAncestorValue(store: Map<string, unknown>, key: string): unknown | undefined;
export declare function getAncestorKeyStore(store: Map<string, unknown>, key: string): Map<string, unknown> | null;
export declare function setAncestorValue(store: Map<string, unknown>, key: string, value: unknown): void;
export declare class SignalStore extends IDebouncer {
    protected readonly evalkeys: string[];
    protected readonly expressionCache: Map<string, Function>;
    protected readonly store: Map<string, unknown>;
    protected readonly observers: Map<string, Set<Observer<unknown>>>;
    protected _observer: Observer<unknown> | null;
    _lock: Promise<void>;
    constructor(data?: {
        [key: string]: any;
    });
    private wrapFunction;
    private wrapObject;
    protected watch<T>(key: string, observer: Observer<T>): void;
    protected notify(key: string, debounceMillis?: number): Promise<void>;
    get<T>(key: string, observer?: Observer<T>): unknown | null;
    set(key: string, value: unknown): Promise<void>;
    del(key: string): void;
    has(key: string): boolean;
    effect<T>(observer: Observer<T>): T;
    private proxify;
    get $(): SignalStoreProxy;
    /**
     * Creates an evaluation function for the provided expression.
     * @param expr The expression to be evaluated.
     * @returns The evaluation function.
     */
    private makeEvalFunction;
    /**
     * Retrieves or creates a cached expression function for the provided expression.
     * @param expr - The expression to retrieve or create a cached function for.
     * @returns The cached expression function.
     */
    private cachedExpressionFunction;
    eval(expr: string, args?: {
        [key: string]: any;
    }): unknown;
}
export {};
