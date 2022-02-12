interface CSSStyleSheet {
  replace(text: string): Promise<CSSStyleSheet>;
  replaceSync(text: string): void;
}

interface ShadowRoot {
  adoptedStyleSheets: CSSStyleSheet[];
}

interface Document {
  adoptedStyleSheets: CSSStyleSheet[];
}

interface ResizeObserverEntry {
  readonly devicePixelContentBoxSize?: ReadonlyArray<ResizeObserverSize>;
}

function structuredClone<T extends object>(input: T): T;

type FlattenedGenerator<T> = T extends Iterable<infer R>
  ? FlattenedGenerator<R>
  : Generator<T>;

interface Generator<T = unknown, TReturn = any, TNext = unknown>
  extends Iterator<T, TReturn, TNext> {
  map<R>(callback: (item: T) => R): Generator<R>;
  filter(callback: (item: T) => boolean): Generator<R>;
  take(num: number): Generator<R>;
  drop(num: number): Generator<R>;
  asIndexedPairs(): Generator<[number, R]>;
  flatMap<R>(callback: (item: T) => Iterable<R>): Generator<R>;
  reduce<R>(callback: (prev: R, item: T) => R, init: R): R;
  toArray(): Array<T>;
  forEach(callback: (item: T) => void): void;
  some(callback: (item: T) => boolean): boolean;
  every(callback: (item: T) => boolean): boolean;
}

interface Object {
  iter<T>(this: T): T extends { [Symbol.iterator](): infer I } ? I : never;
}
