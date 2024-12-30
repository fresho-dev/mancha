import { Iterator } from "./iterator.js";
import { assert } from "./test_utils.js";
describe("Iterator", () => {
    describe("filterGenerator", () => {
        it("filters an array", async () => {
            const arr = [1, 2, 3, 4, 5];
            const filtered = Array.from(Iterator.filterGenerator((val) => val % 2 === 0, arr));
            assert.deepEqual(filtered, [2, 4]);
        });
        it("filters a generator", async () => {
            function* gen() {
                for (let i = 1; i <= 5; i++)
                    yield i;
            }
            const filtered = Array.from(Iterator.filterGenerator((val) => val % 2 === 0, gen()));
            assert.deepEqual(filtered, [2, 4]);
        });
        it("chains multiple filters", async () => {
            const arr = [1, 2, 3, 4, 5];
            const filtered = Array.from(Iterator.filterGenerator((val) => val % 2 === 0, Iterator.filterGenerator((val) => val > 2, arr)));
            assert.deepEqual(filtered, [4]);
        });
    });
    describe("mapGenerator", () => {
        it("maps an array", async () => {
            const arr = [1, 2, 3, 4, 5];
            const mapped = Array.from(Iterator.mapGenerator((val) => val * 2, arr));
            assert.deepEqual(mapped, [2, 4, 6, 8, 10]);
        });
        it("maps a generator", async () => {
            function* gen() {
                for (let i = 1; i <= 5; i++)
                    yield i;
            }
            const mapped = Array.from(Iterator.mapGenerator((val) => val * 2, gen()));
            assert.deepEqual(mapped, [2, 4, 6, 8, 10]);
        });
        it("chains multiple maps", async () => {
            const arr = [1, 2, 3, 4, 5];
            const mapped = Array.from(Iterator.mapGenerator((val) => val + 1, Iterator.mapGenerator((val) => val * 2, arr)));
            assert.deepEqual(mapped, [3, 5, 7, 9, 11]);
        });
    });
    describe("class instance", () => {
        it("filters an array", () => {
            const iter = new Iterator([1, 2, 3, 4, 5]);
            const filtered = iter.filter((val) => val % 2 === 0);
            assert.deepEqual(filtered.array(), [2, 4]);
        });
        it("filters a generator", () => {
            const iter = new Iterator((function* () {
                for (let i = 1; i <= 5; i++)
                    yield i;
            })());
            const filtered = iter.filter((val) => val % 2 === 0);
            assert.deepEqual(filtered.array(), [2, 4]);
        });
        it("chains multiple filters", () => {
            const iter = new Iterator([1, 2, 3, 4, 5]);
            const filtered = iter.filter((val) => val % 2 === 0).filter((val) => val > 2);
            assert.deepEqual(filtered.array(), [4]);
        });
        it("maps an array", () => {
            const iter = new Iterator([1, 2, 3, 4, 5]);
            const mapped = iter.map((val) => val * 2);
            assert.deepEqual(mapped.array(), [2, 4, 6, 8, 10]);
        });
        it("maps a generator", () => {
            const iter = new Iterator((function* () {
                for (let i = 1; i <= 5; i++)
                    yield i;
            })());
            const mapped = iter.map((val) => val * 2);
            assert.deepEqual(mapped.array(), [2, 4, 6, 8, 10]);
        });
        it("chains multiple maps", () => {
            const iter = new Iterator([1, 2, 3, 4, 5]);
            const mapped = iter.map((val) => val * 2).map((val) => val + 1);
            assert.deepEqual(mapped.array(), [3, 5, 7, 9, 11]);
        });
        it("finds element in iterator", () => {
            const iter = new Iterator([1, 2, 3, 4, 5]);
            const found = iter.find((val) => val === 3);
            assert.equal(found, 3);
        });
    });
});
