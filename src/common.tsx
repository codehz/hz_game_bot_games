import {
  css,
  customElement,
  CustomHTMLElement,
  mount,
  prop,
  select,
  shadow,
  watch,
} from "/js/ce.js";
import jsx from "/js/jsx.js";
import { debounce } from "/js/utils.js";

@customElement("keyboard-binding")
export class KeyboardBinding extends HTMLElement {
  #listener: (e: KeyboardEvent) => void;
  constructor(listener: (e: KeyboardEvent) => void) {
    super();
    this.#listener = listener;
  }
  connectedCallback() {
    window.addEventListener("keydown", this.#listener);
    window.addEventListener("keyup", this.#listener);
  }
  disconnectedCallback() {
    window.removeEventListener("keydown", this.#listener);
    window.removeEventListener("keyup", this.#listener);
  }
}

@customElement("number-value")
export class NumberValue extends HTMLElement {
  #value: number;
  #formatter: (value: number) => string;
  constructor({
    value = 0,
    formatter = (n) => "" + n,
  }: { value?: number; formatter?: (value: number) => string } = {}) {
    super();
    this.innerText = formatter(value);
    this.#value = value;
    this.#formatter = formatter;
  }

  set value(value: number) {
    this.innerText = this.#formatter(value);
    this.#value = value;
  }

  get value() {
    return this.#value;
  }
}

@customElement("auto-timer")
export class AutoTimer extends HTMLElement {
  #handle: number = -1;
  #interval: number;
  #handler: () => void;
  constructor({ handler, interval }: { handler: () => void; interval: number; }) {
    super();
    this.#handler = handler;
    this.#interval = interval;
  }

  connectedCallback() {
    this.#handle = setInterval(this.#handler, this.#interval);
  }
  disconnectedCallback() {
    clearInterval(this.#handle);
  }
  restart() {
    if (this.ownerDocument) {
      this.disconnectedCallback();
      this.connectedCallback();
    }
  }
}

@customElement("object-mapping")
export class ObjectMapping<T extends {}> extends CustomHTMLElement {
  #object: T;
  constructor({ value }: { value: T }) {
    super();
    this.#object = value;
  }
  @mount
  refresh() {
    this.replaceChildren(
      ...Object.entries(this.#object).map(([key, value]) => (
        <span field={key}>{value}</span>
      ))
    );
  }
}

@customElement("simple-router")
@shadow(<slot />)
@css`
  :host {
    display: block;
    position: relative;
    height: 0;
    transition: height ease 0.2s;
    overflow: hidden;
  }
  ::slotted(*) {
    position: absolute;
    opacity: 0;
    transition: all ease 0.2s;
    width: 100%;
    height: fit-content;
    z-index: 0;
  }
  ::slotted(.active) {
    opacity: 1;
    z-index: 1;
  }
`
export class SimpleRouter extends CustomHTMLElement {
  @prop()
  value!: string;

  @select(".active", { dynamic: true })
  active!: HTMLElement;

  @watch("value")
  @mount
  select({ value }: { value: string }) {
    for (const child of this.children) {
      if (child instanceof HTMLElement) {
        child.classList.toggle("active", child.dataset.value == value);
      }
    }
    this.refresh();
  }

  refresh = debounce(() => {
    const active = this.active;
    if (active) {
      this.style.height = `${active.offsetHeight}px`;
    }
  });
}
