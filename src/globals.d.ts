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