export class Iterator<T> {
  private readonly iterable: Iterable<T>;
  constructor(iter: Iterable<T>) {
    this.iterable = iter;
  }
  filter(fn: (val: T) => boolean): Iterator<T> {
    return new Iterator(Iterator.filterGenerator(fn, this.iterable));
  }
  map<S>(fn: (val: T) => S): Iterator<S> {
    return new Iterator(Iterator.mapGenerator(fn, this.iterable));
  }
  array(): T[] {
    return Array.from(this.iterable);
  }
  *generator(): Iterable<T> {
    for (const val of this.iterable) {
      yield val;
    }
  }

  static *filterGenerator<T>(fn: (val: T) => boolean, iter: Iterable<T>): Iterable<T> {
    for (const val of iter) {
      if (fn(val)) yield val;
    }
  }
  static *mapGenerator<T, S>(fn: (val: T) => S, iter: Iterable<T>): Iterable<S> {
    for (const val of iter) {
      yield fn(val);
    }
  }

  static equals<T>(a: Iterable<T>, b: Iterable<T>): boolean {
    const aIter = a[Symbol.iterator]();
    const bIter = b[Symbol.iterator]();
    let aVal = aIter.next();
    let bVal = bIter.next();
    while (!aVal.done && !bVal.done) {
      if (aVal.value !== bVal.value) return false;
      aVal = aIter.next();
      bVal = bIter.next();
    }
    return aVal.done === bVal.done;
  }
}
