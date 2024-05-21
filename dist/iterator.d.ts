export declare class Iterator<T> {
    private readonly iterable;
    constructor(iter: Iterable<T>);
    filter(fn: (val: T) => boolean): Iterator<T>;
    map<S>(fn: (val: T) => S): Iterator<S>;
    array(): T[];
    generator(): Iterable<T>;
    static filterGenerator<T>(fn: (val: T) => boolean, iter: Iterable<T>): Iterable<T>;
    static mapGenerator<T, S>(fn: (val: T) => S, iter: Iterable<T>): Iterable<S>;
    static equals<T>(a: Iterable<T>, b: Iterable<T>): boolean;
}
