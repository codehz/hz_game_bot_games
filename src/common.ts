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
customElements.define("keyboard-binding", KeyboardBinding);

export class NumberValue extends HTMLElement {
  #value: number;
  constructor(value: number = 0) {
    super();
    this.innerText = "" + value;
    this.#value = value;
  }

  set value(value: number) {
    this.innerText = "" + value;
    this.#value = value;
  }

  get value() {
    return this.#value;
  }
}
customElements.define("number-value", NumberValue);

export class AutoTimer extends HTMLElement {
  #handle: number = -1;
  #interval: number;
  #handler: () => void;
  constructor(handler: () => void, interval: number) {
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
}
customElements.define("auto-timer", AutoTimer);
