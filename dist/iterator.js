"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Iterator = void 0;
class Iterator {
    iterable;
    constructor(iter) {
        this.iterable = iter;
    }
    filter(fn) {
        return new Iterator(Iterator.filterGenerator(fn, this.iterable));
    }
    map(fn) {
        return new Iterator(Iterator.mapGenerator(fn, this.iterable));
    }
    array() {
        return Array.from(this.iterable);
    }
    *generator() {
        for (const val of this.iterable) {
            yield val;
        }
    }
    static *filterGenerator(fn, iter) {
        for (const val of iter) {
            if (fn(val))
                yield val;
        }
    }
    static *mapGenerator(fn, iter) {
        for (const val of iter) {
            yield fn(val);
        }
    }
    static equals(a, b) {
        const aIter = a[Symbol.iterator]();
        const bIter = b[Symbol.iterator]();
        let aVal = aIter.next();
        let bVal = bIter.next();
        while (!aVal.done && !bVal.done) {
            if (aVal.value !== bVal.value)
                return false;
            aVal = aIter.next();
            bVal = bIter.next();
        }
        return aVal.done === bVal.done;
    }
}
exports.Iterator = Iterator;
