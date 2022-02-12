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
  concat(iter: Iterable<T>): Generator<T>;
  map<R>(callback: (item: T) => R): Generator<R>;
  filter(callback: (item: T) => boolean): Generator<R>;
  forEach(callback: (item: T) => void): void;
  reduce<R>(callback: (prev: R, item: T) => R, init: R): R;
  flatten(): FlattenedGenerator<T>;
  collect(): Array<T>;
}

interface Object {
  iter<T>(this: T): T extends { [Symbol.iterator](): infer I } ? I : never;
}
