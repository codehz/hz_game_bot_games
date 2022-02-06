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
