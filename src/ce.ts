const $selector = Symbol("selector");
const $template = Symbol("template");
const $shadow = Symbol("shadow");
const $css = Symbol("css");
const $observed = Symbol("observed");
const $mounts = Symbol("mounts");
const $unmounts = Symbol("unmounts");
const $listeners = Symbol("listeners");
const $shadow_listeners = Symbol("shadow_listeners");

export abstract class CustomHTMLElement extends HTMLElement {
  [$selector]?: Map<
    string,
    { selector: string; shadow: boolean; all: boolean }
  >;
  [$template]?: Node;
  [$shadow]?: Node;
  [$css]?: CSSStyleSheet;
  [$observed]?: Record<string, Array<string | symbol>>;
  [$mounts]?: string[];
  [$unmounts]?: string[];
  [$listeners]?: Record<string, { selector?: string; name: string }[]>;
  [$shadow_listeners]?: Record<string, { selector?: string; name: string }[]>;
  #listeners = new Map<string, EventListener>();
  #shadow_listeners = new Map<string, EventListener>();

  constructor() {
    super();
    this.removeAttribute("placeholder");
  }

  attributeChangedCallback(name: string, _old: string, value: string) {
    if (!this.isConnected) return;
    const watchers = this[$observed]?.[name];
    if (watchers)
      for (const watcher of watchers) {
        const f = (this as any)[watcher];
        if (f instanceof Function) f.call(this, { [name]: value });
        else (this as any)[watcher] = value;
      }
  }

  connectedCallback() {
    const template = this[$template];
    if (template) {
      this.replaceChildren(template.cloneNode(true));
    }
    const listeners = this[$listeners];
    if (listeners)
      for (const [event, arr] of Object.entries(listeners)) {
        const callback = (e: Event) => {
          for (const { selector, name } of arr) {
            if (!selector || !(e.target as HTMLElement).matches(selector))
              continue;
            (this as any)[name](e);
          }
        };
        this.#listeners.set(event, callback);
        this.addEventListener(event, callback);
      }
    const shadow = this[$shadow];
    if (shadow) {
      const root = this.shadowRoot ?? this.attachShadow({ mode: "open" });
      root.replaceChildren(shadow.cloneNode(true));
      const css = this[$css];
      if (css) {
        root.adoptedStyleSheets = [css];
      }
      const listeners = this[$shadow_listeners];
      if (listeners)
        for (const [event, arr] of Object.entries(listeners)) {
          const callback = (e: Event) => {
            for (const { selector, name } of arr) {
              if (!selector || !(e.target as HTMLElement).matches(selector))
                continue;
              (this as any)[name](e);
            }
          };
          this.#shadow_listeners.set(event, callback);
          root.addEventListener(event, callback);
        }
    }
    this[$selector]?.forEach(({ selector, shadow, all }, name) => {
      const root = shadow ? this.shadowRoot : this;
      if (!root) return;
      if (all) {
        (this as any)[name] = [...root.querySelectorAll(selector)];
      } else {
        (this as any)[name] = root.querySelector(selector);
      }
    });
    const obj: Record<string, string | null> = {};
    for (const key in this[$observed]) {
      const value = this.getAttribute(key);
      if (value) obj[key] = value;
    }
    this[$mounts]?.forEach((name) => (this as any)[name](obj));
  }

  disconnectedCallback() {
    const setting = this[$unmounts];
    setting?.forEach((name) => (this as any)[name]());
    this.#listeners.forEach((f, k) => this.removeEventListener(k, f));
    this.#listeners.clear();
    if (this.#shadow_listeners.size) {
      const root = this.shadowRoot!;
      this.#shadow_listeners.forEach((f, k) => root.removeEventListener(k, f));
      this.#shadow_listeners.clear();
    }
  }
}

export const customElement =
  (name: string) =>
  <T extends CustomElementConstructor>(cls: T) => {
    if (cls.prototype instanceof CustomHTMLElement) {
      const observed = cls.prototype[$observed] ?? {};
      (cls as any)["observedAttributes"] = Object.keys(observed);
    }
    console.log("register", name, cls.name);
    customElements.define(name, cls);
    return cls;
  };

export const template =
  (content: Node) =>
  <T extends CustomHTMLElement>(cls: new (...args: any[]) => T) => {
    cls.prototype[$template] = content;
  };

export const shadow =
  (content: Node) =>
  <T extends CustomHTMLElement>(cls: new (...args: any[]) => T) => {
    cls.prototype[$shadow] = content;
  };

export const css = (strings: TemplateStringsArray, ...values: any[]) => {
  const style = new CSSStyleSheet();
  style.replaceSync(String.raw(strings, ...values));
  return <T extends CustomHTMLElement>(cls: new (...args: any[]) => T) => {
    cls.prototype[$css] = style;
  };
};

export function defineCustomElement<S extends string = string>(
  name: string,
  cb: (
    this: HTMLElement,
    args: { html: string; self: HTMLElement } & Record<S, string>
  ) =>
    | HTMLElement
    | DocumentFragment
    | Promise<HTMLElement | DocumentFragment>
    | void
) {
  customElements.define(
    name,
    class extends HTMLElement {
      connectedCallback() {
        const html = this.innerHTML.trim();
        this.innerHTML = "";
        const ret = cb.call(this, {
          html,
          self: this,
          ...this.dataset,
        } as unknown as {
          html: string;
          self: HTMLElement;
        } & Record<S, string>);
        if (ret) {
          Promise.resolve(ret).then((e) => this.replaceWith(e));
        }
      }
    }
  );
}

export const prop =
  (name?: string) =>
  <T extends CustomHTMLElement>(target: T, key: string) => {
    if (!name) name = key;
    const symbol = Symbol(`value for ${key}`);
    Object.defineProperty(target, key, {
      configurable: false,
      get() {
        return this[symbol] ?? (this[symbol] = this.getAttribute(name));
      },
      set(value) {
        this.setAttribute(name, value);
      },
    });
    const observed = target[$observed] ?? (target[$observed] = {});
    const keyd = observed[name] ?? (observed[name] = []);
    keyd.push(symbol);
  };

export const watch =
  (...names: string[]) =>
  <T extends CustomHTMLElement>(target: T, key: string) => {
    const observed = target[$observed] ?? (target[$observed] = {});
    for (const name of names) {
      const keyd = observed[name] ?? (observed[name] = []);
      keyd.push(key);
    }
  };

export const select =
  (
    selector: string,
    {
      shadow = false,
      all = false,
      dynamic = false,
    }: { shadow?: boolean; all?: boolean; dynamic?: boolean } = {}
  ) =>
  <T extends CustomHTMLElement>(target: T, key: string) => {
    if (!dynamic) {
      const selectors = target[$selector] ?? (target[$selector] = new Map());
      selectors.set(key, { selector, shadow, all });
    } else {
      Object.defineProperty(target, key, {
        configurable: false,
        get() {
          if (all) return [...this.querySelectorAll(selector)];
          return this.querySelector(selector);
        },
      });
    }
  };

export const id =
  (id: string) =>
  <T extends CustomHTMLElement>(target: T, key: string) => {
    const selectors = target[$selector] ?? (target[$selector] = new Map());
    selectors.set(key, { selector: `#${id}`, shadow: true, all: false });
  };

export const mount = <T extends CustomHTMLElement>(target: T, key: string) => {
  const mounts = target[$mounts] ?? (target[$mounts] = []);
  mounts.push(key);
};

export const unmount = <T extends CustomHTMLElement>(
  target: T,
  key: string
) => {
  const unmounts = target[$unmounts] ?? (target[$unmounts] = []);
  unmounts.push(key);
};

export const listen =
  (event: string, selector?: string, shadow: boolean = false) =>
  <T extends CustomHTMLElement>(target: T, key: string) => {
    const m = shadow ? $shadow_listeners : $listeners;
    let list = target[m] ?? (target[m] = {});
    const listeners = list[event] ?? [];
    list[event] = [...listeners, { selector, name: key }];
  };
