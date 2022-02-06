import htm from "/deps/htm.js";

function toDash(name: string) {
  return name
    .replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`)
    .replace(/^\$/g, "--");
}

type ChildrenType = null | boolean | number | HTMLElement | ChildrenType[];

function processChildren(
  target: HTMLElement | DocumentFragment,
  children: ChildrenType[] = []
) {
  for (const child of children) {
    if (child == null || typeof child == "boolean") continue;
    if (Array.isArray(child)) processChildren(target, child);
    else if (child instanceof HTMLElement) target.appendChild(child);
    else target.appendChild(document.createTextNode("" + child));
  }
}

export function ce(
  name: string = "div",
  attr: Record<string, any>,
  ...children: ChildrenType[]
) {
  if (name == "") {
    const ret = document.createDocumentFragment();
    processChildren(ret, children);
    return ret;
  }
  const ret = typeof name == "string" ? document.createElement(name) : name;
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
      } else if (key == "style")
        for (const name in value)
          ret.style.setProperty(toDash(name), value[name]);
      else ret.setAttribute(key, value);
    } else if (key == "html") {
      ret.innerHTML = value;
    } else {
      ret.setAttribute(key, value);
    }
  }
  if (typeof children == "string") ret.innerHTML = children;
  else processChildren(ret, children);
  return ret;
}

export default htm.bind(ce);

export function css(strings: TemplateStringsArray, ...values: any[]) {
  const style = document.createElement("style");
  style.innerHTML = String.raw(strings, ...values);
  return style;
}
