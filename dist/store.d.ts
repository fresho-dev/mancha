import { Signal } from "./signal.js";
/**
 * Creates an evaluation function based on the provided code and arguments.
 * @param code The code to be evaluated.
 * @param args The arguments to be passed to the evaluation function. Default is an empty array.
 * @returns The evaluation function.
 */
export declare function makeEvalFunction(code: string, args?: string[]): Function;
export declare class SignalStore {
    protected readonly evalkeys: string[];
    protected readonly expressionCache: Map<string, Function>;
    protected readonly store: Map<string, Signal.Type<unknown>>;
    constructor(data?: {
        [key: string]: any;
    });
    private wrapFunction;
    effect<T>(fn: () => T): void;
    computed<T>(fn: () => T): import("ulive").Signal<T>;
    batch<T>(fn: () => T): void;
    untracked<T>(fn: () => T): void;
    get $(): SignalStore & {
        [key: string]: any;
    };
    /**
     * Retrieves or creates a cached expression function based on the provided expression.
     * @param expr - The expression to retrieve or create a cached function for.
     * @returns The cached expression function.
     */
    private cachedExpressionFunction;
    eval(expr: string, args?: {
        [key: string]: any;
    }): any;
}
