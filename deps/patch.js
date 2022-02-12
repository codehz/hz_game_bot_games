let GeneratorPrototype = (function* () {})();
while (!GeneratorPrototype.hasOwnProperty("next"))
  GeneratorPrototype = Object.getPrototypeOf(GeneratorPrototype);
function* flatten(value) {
  if (Symbol.iterator in value) for (const item of value) yield* flatten(item);
  else yield value;
}
Object.assign(GeneratorPrototype, {
  *map(callback) {
    for (const item of this) yield callback(item);
  },
  *filter(callback) {
    for (const item of this) if (callback(item)) yield item;
  },
  *take(number) {
    for (const item of this) {
      if (number-- <= 0) break;
      yield item;
    }
  },
  *drop(number) {
    for (const item of this) {
      if (number-- <= 0) continue;
      yield item;
    }
  },
  *asIndexedPairs() {
    let i = 0;
    for (const item of this) {
      yield [i++, item];
    }
  },
  *flatMap(callback) {
    for (const item of this) yield* callback(item);
  },
  reduce(callback, init) {
    for (const item of this) init = callback(init, item);
    return init;
  },
  toArray() {
    const ret = [];
    for (const item of this) ret.push(item);
    return ret;
  },
  forEach(callback) {
    for (const item of this) callback(item);
  },
  some(callback) {
    for (const item of this) if (callback(item)) return true;
    return false;
  },
  every(callback) {
    for (const item of this) if (!callback(item)) return false;
    return true;
  },
  find(callback) {
    for (const item of this) if (callback(item)) return item;
  }
});
Object.defineProperty(Object.prototype, "iter", {
  get() {
    return this[Symbol.iterator];
  },
});
