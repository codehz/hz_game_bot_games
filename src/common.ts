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
  #formatter: (value: number) => string;
  constructor(
    value: number = 0,
    formatter: (value: number) => string = (n) => "" + n
  ) {
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
  restart() {
    if (this.ownerDocument) {
      this.disconnectedCallback();
      this.connectedCallback();
    }
  }
}
customElements.define("auto-timer", AutoTimer);
