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
const $attach_listeners = Symbol("attach_listeners");
const $tags = Symbol("tags");
const $frame = Symbol("frame");

export function cloneNode(node: Node): Node {
  const ret = node.cloneNode();
  if (node.cloneNode == Node.prototype.cloneNode) {
    for (const child of node.childNodes) {
      ret.appendChild(cloneNode(child));
    }
  }
  return ret;
}

export declare interface CustomHTMLElement {
  [$tags]?: string[];
  [$selector]?: Map<string, { selector: string; all: boolean } | string>;
  [$template]?: Node;
  [$shadow]?: Node;
  [$css]?: CSSStyleSheet[];
  [$observed]?: Record<string, Array<string | symbol>>;
  [$mounts]?: (string | ((obj: object) => void))[];
  [$unmounts]?: (string | (() => void))[];
  [$host_listeners]?: { name: string; event: string }[];
  [$listeners]?: Record<string, { selector?: string; name: string }[]>;
  [$closest_listeners]?: { name: string; event: string; selector: string }[];
  [$direct_listeners]?: { name: string; event: string; selector: string }[];
  [$attach_listeners]?: { name: string; event: string; selector: string }[];
  [$frame]?: number;
}

export abstract class CustomHTMLElement extends HTMLElement {
  #listeners: { node: Node; event: string; listener: EventListener }[] = [];
  #attached_listeners: {
    node: CustomHTMLElement;
    event: string;
    listener: Function;
  }[] = [];
  #handlers: Record<string, Function[]> = {};

  on(event: string, handler: Function) {
    const handlers = this.#handlers[event] ?? [];
    this.#handlers[event] = [...handlers, handler];
  }

  off(event: string, handler: Function) {
    this.#handlers[event] = this.#handlers[event]!.filter((x) => x != handler);
  }

  emit(event: string, ...args: any[]) {
    this.#handlers[event]?.forEach((handler) => handler.apply(this, args));
  }

  protected set shadowTemplate(shadow: Node) {
    const root = this.shadowRoot ?? this.attachShadow({ mode: "open" });
    root.replaceChildren(shadow);
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

  constructor() {
    super();
    this.removeAttribute("placeholder");

    this[$host_listeners]?.forEach(({ name, event }) =>
      this.addEventListener(event, (this as any)[name].bind(this))
    );

    this[$tags]?.forEach((name) => this.setAttribute(name, ""));
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
      this.replaceChildren(cloneNode(template));
    }
    this[$closest_listeners]?.forEach(({ name, event, selector }) => {
      const target = this.parentElement?.closest(selector);
      if (target) {
        const listener = (this as any)[name].bind(this);
        target.addEventListener(event, listener);
        this.#listeners.push({ node: target, event, listener });
      }
    });
    const shadow = this[$shadow];
    if (shadow) this.shadowTemplate = cloneNode(shadow);
    const obj: Record<string, string | null> = {};
    for (const key in this[$observed]) {
      const value = this.getAttribute(key);
      if (value) obj[key] = value;
    }
    this[$mounts]?.forEach((name) =>
      typeof name == "string" ? (this as any)[name](obj) : name.call(this, obj)
    );
    this[$attach_listeners]?.forEach(({ name, event, selector }) => {
      let node: Node | null | undefined;
      if (selector.startsWith("<")) {
        selector = selector.slice(1);
        node = this.parentElement?.closest(selector);
      } else {
        node = this.shadowRoot?.querySelector(selector);
      }
      if (node != null && node instanceof CustomHTMLElement) {
        const listener = (...args: any[]) => (this as any)[name](...args);
        node.on(event, listener);
        this.#attached_listeners.push({ node, event, listener });
      }
    });
  }

  disconnectedCallback() {
    this[$unmounts]?.forEach((name) =>
      typeof name == "string" ? (this as any)[name]() : name.call(this)
    );
    if (this[$shadow]) {
      this.#listeners.forEach(({ node, event, listener }) =>
        node.removeEventListener(event, listener)
      );
      this.#listeners = [];
      this.shadowRoot!.replaceChildren();
    }
    this.#attached_listeners.forEach(({ node, event, listener }) => {
      node.off(event, listener);
    });
  }
}

export class ClonableElement<T> extends CustomHTMLElement {
  #data: T;
  constructor(data: T & { id?: string }) {
    super();
    if (data.id) this.id = data.id;
    this.#data = data;
  }

  get data() {
    return this.#data;
  }

  cloneNode() {
    const clazz = Object.getPrototypeOf(this).constructor;
    return new clazz(this.#data);
  }
}

export class ClonableElementWithChildren<T> extends ClonableElement<T> {
  constructor(data: T & { id?: string; children: Element[] }) {
    super(data);
    this.replaceChildren(...data.children.map(cloneNode));
  }
}

export const customElement =
  (name: string) =>
  <T extends CustomElementConstructor>(cls: T) => {
    if (cls.prototype instanceof CustomHTMLElement) {
      const observed = cls.prototype[$observed] ?? {};
      (cls as any)["observedAttributes"] = Object.keys(observed);
      if (cls.prototype instanceof ClonableElement) {
        Object.defineProperty(cls, "length", { value: 1 });
      }
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

export const tag =
  (...tags: string[]) =>
  <T extends CustomHTMLElement>(cls: new (...args: any[]) => T) => {
    const list = cls.prototype[$tags] ?? [];
    cls.prototype[$tags] = [...list, ...tags];
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

export const frame = <T extends CustomHTMLElement>(target: T, key: string) => {
  const mounts = target[$mounts] ?? (target[$mounts] = []);
  const unmounts = target[$unmounts] ?? (target[$unmounts] = []);
  mounts.push(function cb(this: CustomHTMLElement, o: object) {
    (this as any)[key](o);
    this[$frame] = requestAnimationFrame(() => cb.call(this, o));
  });
  unmounts.push(function (this: CustomHTMLElement) {
    if (this[$frame]) cancelAnimationFrame(this[$frame]!);
  });
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

export const attach =
  (event: string, selector: string) =>
  <T extends CustomHTMLElement>(target: T, key: string) => {
    let list = target[$attach_listeners] ?? [];
    target[$attach_listeners] = [...list, { event, selector, name: key }];
  };
