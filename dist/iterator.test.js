"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const mocha_1 = require("mocha");
const iterator_1 = require("./iterator");
(0, mocha_1.describe)("Iterator", () => {
    (0, mocha_1.describe)("filterGenerator", () => {
        (0, mocha_1.it)("filters an array", async () => {
            const arr = [1, 2, 3, 4, 5];
            const filtered = Array.from(iterator_1.Iterator.filterGenerator((val) => val % 2 === 0, arr));
            assert.deepStrictEqual(filtered, [2, 4]);
        });
        (0, mocha_1.it)("filters a generator", async () => {
            function* gen() {
                for (let i = 1; i <= 5; i++)
                    yield i;
            }
            const filtered = Array.from(iterator_1.Iterator.filterGenerator((val) => val % 2 === 0, gen()));
            assert.deepStrictEqual(filtered, [2, 4]);
        });
        (0, mocha_1.it)("chains multiple filters", async () => {
            const arr = [1, 2, 3, 4, 5];
            const filtered = Array.from(iterator_1.Iterator.filterGenerator((val) => val % 2 === 0, iterator_1.Iterator.filterGenerator((val) => val > 2, arr)));
            assert.deepStrictEqual(filtered, [4]);
        });
    });
    (0, mocha_1.describe)("mapGenerator", () => {
        (0, mocha_1.it)("maps an array", async () => {
            const arr = [1, 2, 3, 4, 5];
            const mapped = Array.from(iterator_1.Iterator.mapGenerator((val) => val * 2, arr));
            assert.deepStrictEqual(mapped, [2, 4, 6, 8, 10]);
        });
        (0, mocha_1.it)("maps a generator", async () => {
            function* gen() {
                for (let i = 1; i <= 5; i++)
                    yield i;
            }
            const mapped = Array.from(iterator_1.Iterator.mapGenerator((val) => val * 2, gen()));
            assert.deepStrictEqual(mapped, [2, 4, 6, 8, 10]);
        });
        (0, mocha_1.it)("chains multiple maps", async () => {
            const arr = [1, 2, 3, 4, 5];
            const mapped = Array.from(iterator_1.Iterator.mapGenerator((val) => val + 1, iterator_1.Iterator.mapGenerator((val) => val * 2, arr)));
            assert.deepStrictEqual(mapped, [3, 5, 7, 9, 11]);
        });
    });
    (0, mocha_1.describe)("class instance", () => {
        (0, mocha_1.it)("filters an array", () => {
            const iter = new iterator_1.Iterator([1, 2, 3, 4, 5]);
            const filtered = iter.filter((val) => val % 2 === 0);
            assert.deepStrictEqual(filtered.array(), [2, 4]);
        });
        (0, mocha_1.it)("filters a generator", () => {
            const iter = new iterator_1.Iterator((function* () {
                for (let i = 1; i <= 5; i++)
                    yield i;
            })());
            const filtered = iter.filter((val) => val % 2 === 0);
            assert.deepStrictEqual(filtered.array(), [2, 4]);
        });
        (0, mocha_1.it)("chains multiple filters", () => {
            const iter = new iterator_1.Iterator([1, 2, 3, 4, 5]);
            const filtered = iter.filter((val) => val % 2 === 0).filter((val) => val > 2);
            assert.deepStrictEqual(filtered.array(), [4]);
        });
        (0, mocha_1.it)("maps an array", () => {
            const iter = new iterator_1.Iterator([1, 2, 3, 4, 5]);
            const mapped = iter.map((val) => val * 2);
            assert.deepStrictEqual(mapped.array(), [2, 4, 6, 8, 10]);
        });
        (0, mocha_1.it)("maps a generator", () => {
            const iter = new iterator_1.Iterator((function* () {
                for (let i = 1; i <= 5; i++)
                    yield i;
            })());
            const mapped = iter.map((val) => val * 2);
            assert.deepStrictEqual(mapped.array(), [2, 4, 6, 8, 10]);
        });
        (0, mocha_1.it)("chains multiple maps", () => {
            const iter = new iterator_1.Iterator([1, 2, 3, 4, 5]);
            const mapped = iter.map((val) => val * 2).map((val) => val + 1);
            assert.deepStrictEqual(mapped.array(), [3, 5, 7, 9, 11]);
        });
    });
});