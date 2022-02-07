import { CustomHTMLElement } from "./ce.js";

function toDash(name: string) {
  return name
    .replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`)
    .replace(/^\$/g, "--");
}

type ChildrenType = null | boolean | number | Node | ChildrenType[];

function processChildren(target: Node, children: ChildrenType[] = []) {
  for (const child of children) {
    if (child == null || typeof child == "boolean") continue;
    if (Array.isArray(child)) processChildren(target, child);
    else if (child instanceof Node) target.appendChild(child);
    else target.appendChild(document.createTextNode("" + child));
  }
}

const fragment: unique symbol = Symbol();

export type ComponentGenerator<
  T extends Record<string, any> = Record<string, any>,
  R extends HTMLElement = HTMLElement
> = new (attr: T | null) => R;

function createElement(
  _: typeof fragment,
  attr: null,
  ...children: ChildrenType[]
): DocumentFragment;
function createElement(
  name: string,
  attr: Record<string, any> | null,
  ...children: ChildrenType[]
): HTMLElement;
function createElement<T extends Record<string, any>, R extends HTMLElement>(
  name: ComponentGenerator<T, R>,
  attr: T | null,
  ...children: any[]
): R;
function createElement(
  name: string | typeof fragment | ComponentGenerator | (new () => HTMLElement),
  attr: Record<string, any> | null,
  ...children: any[]
) {
  if (name === fragment) {
    const ret = document.createDocumentFragment();
    processChildren(ret, children);
    return ret;
  } else if (typeof name == "function" && name.length == 1) {
    return new name({ ...attr, children });
  }
  const ret =
    typeof name == "function"
      ? new (name as any)()
      : document.createElement(name);
  if (attr)
    for (const key in attr) {
      const value = attr[key];
      if (typeof value != "string") {
        if (key == "data") Object.assign(ret.dataset, value);
        else if (key == "class") {
          if (Array.isArray(value))
            for (const name of value) ret.classList.add(toDash(name));
          else
            for (const name in value)
              ret.classList.toggle(toDash(name), !!value[name]);
        } else if (key == "style") {
          for (const name in value)
            ret.style.setProperty(toDash(name), value[name]);
        } else if (key == "_") {
          Object.assign(ret, value);
        } else ret.setAttribute(key, value);
      } else if (key == "html") {
        ret.innerHTML = value;
      } else {
        ret.setAttribute(key, value);
      }
    }
  processChildren(ret, children);
  return ret;
}

export default Object.assign(createElement, {
  fragment,
});

declare global {
  namespace JSX {
    type Element = HTMLElement;
    type ElementClass = HTMLElement;
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicElements {
      [key: string]: any;
    }
  }
}
