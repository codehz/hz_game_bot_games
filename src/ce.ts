const $selector = Symbol("selector");
const $template = Symbol("template");
const $shadow = Symbol("shadow");
const $css = Symbol("css");
const $observed = Symbol("observed");
const $mounts = Symbol("mounts");
const $unmounts = Symbol("unmounts");
const $host_listeners = Symbol("host_listeners");
const $listeners = Symbol("listeners");
const $closest_listeners = Symbol("closest_listeners");
const $direct_listeners = Symbol("direct_listeners");

export abstract class CustomHTMLElement extends HTMLElement {
  [$selector]?: Map<string, { selector: string; all: boolean } | string>;
  [$template]?: Node;
  [$shadow]?: Node;
  [$css]?: CSSStyleSheet[];
  [$observed]?: Record<string, Array<string | symbol>>;
  [$mounts]?: string[];
  [$unmounts]?: string[];
  [$host_listeners]?: { name: string; event: string }[];
  [$listeners]?: Record<string, { selector?: string; name: string }[]>;
  [$closest_listeners]?: { name: string; event: string; selector: string }[];
  [$direct_listeners]?: { name: string; event: string; selector: string }[];
  #listeners: { node: Node; event: string; listener: EventListener }[] = [];

  protected set shadowTemplate(node: Node) {
    this[$shadow] = node;
  }

  constructor() {
    super();
    this.removeAttribute("placeholder");

    this[$host_listeners]?.forEach(({ name, event }) =>
      this.addEventListener(event, (this as any)[name].bind(this))
    );
  }

  attributeChangedCallback(name: string, old: string, value: string) {
    if (!this.isConnected || old == value) return;
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
    this[$closest_listeners]?.forEach(({ name, event, selector }) => {
      const target = this.closest(selector);
      if (target) {
        const listener = (this as any)[name].bind(this);
        target.addEventListener(event, listener);
        this.#listeners.push({ node: target, event, listener });
      }
    });
    const shadow = this[$shadow];
    if (shadow) {
      const root = this.shadowRoot ?? this.attachShadow({ mode: "open" });
      root.replaceChildren(shadow.cloneNode(true));
      const css = this[$css];
      if (css) {
        root.adoptedStyleSheets = css;
      }
      const listeners = this[$listeners];
      if (listeners)
        for (const [event, arr] of Object.entries(listeners)) {
          const callback = (e: Event) => {
            for (const { selector, name } of arr) {
              if (selector) {
                const target = e.target as HTMLElement;
                const matched = target.closest(selector);
                if (matched) {
                  Object.defineProperty(e, "currentTarget", {
                    enumerable: false,
                    writable: false,
                    value: matched,
                  });
                  (this as any)[name](e);
                }
              } else {
                (this as any)[name](e);
              }
            }
          };
          this.#listeners.push({ node: root, event, listener: callback });
          root.addEventListener(event, callback);
        }

      this[$direct_listeners]?.forEach(({ name, event, selector }) => {
        const callback = (e: Event) => {
          (this as any)[name](e);
        };
        for (const el of root.querySelectorAll(selector)) {
          el.addEventListener(event, callback);
        }
      });

      this[$selector]?.forEach((target, name) => {
        if (typeof target == "string") {
          (this as any)[name] = root.getElementById(target);
        } else {
          const { selector, all } = target;
          if (all) {
            (this as any)[name] = [...root.querySelectorAll(selector)];
          } else {
            (this as any)[name] = root.querySelector(selector);
          }
        }
      });
    }
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
    this.#listeners.forEach(({ node, event, listener }) =>
      node.removeEventListener(event, listener)
    );
    this.#listeners = [];
    this.shadowRoot?.replaceChildren();
  }
}

export const customElement =
  (name: string) =>
  <T extends CustomElementConstructor>(cls: T) => {
    if (cls.prototype instanceof CustomHTMLElement) {
      const observed = cls.prototype[$observed] ?? {};
      (cls as any)["observedAttributes"] = Object.keys(observed);
    }
    console.log(
      "%c register %c %s %s",
      "background: black; color: white;",
      "background: unset; color: unset;",
      name,
      cls.name
    );
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

export function css(strings: TemplateStringsArray, ...values: any[]) {
  const style = new CSSStyleSheet();
  style.replaceSync(String.raw(strings, ...values));
  return <T extends CustomHTMLElement>(cls: new (...args: any[]) => T) => {
    cls.prototype[$css] = [...(cls.prototype[$css] ?? []), style];
  };
}

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
    { all = false, dynamic = false }: { all?: boolean; dynamic?: boolean } = {}
  ) =>
  <T extends CustomHTMLElement>(target: T, key: string) => {
    if (!dynamic) {
      const selectors = target[$selector] ?? (target[$selector] = new Map());
      selectors.set(key, { selector, all });
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
    selectors.set(key, id);
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
  (event: string, selector?: string) =>
  <T extends CustomHTMLElement>(target: T, key: string) => {
    let list = target[$listeners] ?? (target[$listeners] = {});
    const listeners = list[event] ?? [];
    list[event] = [...listeners, { selector, name: key }];
  };

export const listen_host =
  (event: string) =>
  <T extends CustomHTMLElement>(target: T, key: string) => {
    let list = target[$host_listeners] ?? [];
    target[$host_listeners] = [...list, { event, name: key }];
  };

export const listen_closest =
  (event: string, selector: string) =>
  <T extends CustomHTMLElement>(target: T, key: string) => {
    let list = target[$closest_listeners] ?? [];
    target[$closest_listeners] = [...list, { event, selector, name: key }];
  };

export const listen_at =
  (event: string, selector: string) =>
  <T extends CustomHTMLElement>(target: T, key: string) => {
    let list = target[$direct_listeners] ?? [];
    target[$direct_listeners] = [...list, { event, selector, name: key }];
  };
