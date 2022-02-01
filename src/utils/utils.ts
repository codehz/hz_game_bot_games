export function ohno(e: string): never {
  throw new Error(e);
}

export function mixinPrototype<T extends {}, R extends {}>(
  target: T,
  mixin: R,
) {
  const proto = Object.getPrototypeOf(mixin);
  for (const [k, v] of Object.entries(proto)) {
    if (k in target) continue;
    if (typeof v == "function") {
      Object.defineProperty(target, k, {
        value(...args: any) {
          // @ts-ignore
          return mixin[k](...args);
        },
        writable: false,
      });
    } else {
      Object.defineProperty(target, k, {
        // @ts-ignore
        value: mixin[k],
        writable: false,
      });
    }
  }
}

const PAGESIZE = 64 * 1024;
let GLOBAL_CACHE = new WebAssembly.Memory({ initial: 1 });
export function getBuffer(size: number) {
  if (size > GLOBAL_CACHE.buffer.byteLength) {
    const grow = Math.ceil((size - GLOBAL_CACHE.buffer.byteLength) / PAGESIZE) *
      PAGESIZE;
    GLOBAL_CACHE.grow(grow);
  }
  return GLOBAL_CACHE.buffer.slice(0, size);
}