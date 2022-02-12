let GeneratorPrototype = (function* () {})();
while (!GeneratorPrototype.hasOwnProperty("next"))
  GeneratorPrototype = Object.getPrototypeOf(GeneratorPrototype);
function* flatten(value) {
  if (Symbol.iterator in value) for (const item of value) yield* flatten(item);
  else yield value;
}
Object.assign(GeneratorPrototype, {
  *concat(another) {
    for (const item of this) yield item;
    for (const item of another) yield item;
  },
  *map(callback) {
    for (const item of this) yield callback(item);
  },
  *filter(callback) {
    for (const item of this) if (callback(item)) yield item;
  },
  forEach(callback) {
    for (const item of this) callback(item);
  },
  reduce(callback, init) {
    for (const item of this) init = callback(init, item);
    return init;
  },
  *flatten() {
    for (const item of this) yield* flatten(item);
  },
  collect() {
    const ret = [];
    for (const item of this) ret.push(item);
    return ret;
  },
});
Object.defineProperty(Object.prototype, "iter", {
  get() {
    return this[Symbol.iterator];
  },
});
