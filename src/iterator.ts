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
}
