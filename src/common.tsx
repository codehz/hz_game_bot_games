import {
  css,
  customElement,
  CustomHTMLElement,
  id,
  listen,
  listen_at,
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
  constructor({
    handler,
    interval,
  }: {
    handler: () => void;
    interval: number;
  }) {
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

@customElement("x-button")
@shadow(<slot></slot>)
@css`
  :host {
    display: inline-block;
    padding: 5px 20px;
    background: var(--fgcolor);
    color: var(--bgcolor);
  }

  :host(:hover) {
    box-shadow: inset 0 -2px 0 var(--hover-color, var(--bgcolor));
  }
  :host(:focus-visible) {
    outline: 2px dashed var(--fgcolor);
    outline-offset: 2px;
  }

  :host(:active) {
    background: var(--bgcolor);
    color: var(--fgcolor);
    --hover-color: var(--fgcolor);
  }
`
export class StyledButton extends CustomHTMLElement {
  constructor() {
    super();
    this.tabIndex = 0;
  }
}

@customElement("dialog-form")
@shadow(
  <dialog id="dialog">
    <div class="container">
      <h2 id="title"></h2>
      <slot />
      <div class="bottombar">
        <StyledButton id="cancel">取消</StyledButton>
        <StyledButton id="confirm">确认</StyledButton>
      </div>
    </div>
  </dialog>
)
@css`
  dialog::backdrop {
    background: #000c;
  }
  dialog {
    background: var(--theme-color);
    border: none;
    padding: 0;
    margin-left: 0;
    margin-right: 0;
    width: 100%;
    max-width: unset;
    box-sizing: border-box;
    --fgcolor: white;
    --bgcolor: var(--theme-color);
  }

  h2 {
    color: var(--fgcolor);
    margin: 0;
    padding-bottom: 10px;
  }

  .container {
    margin: 20px auto;
    display: flex;
    gap: 10px;
    flex-direction: column;
    width: calc(100% - 80px);
    max-width: 600px;
  }

  .bottombar {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
`
export class DialogForm extends CustomHTMLElement {
  @id("dialog")
  dialog!: HTMLElement & {
    readonly returnValue: string;
    showModal(): void;
    close(value: string): void;
  };

  @id("title")
  title_el!: HTMLElement;

  @id("form")
  form!: HTMLFormElement;

  #resolver?: {
    resolve: () => void;
    reject: (e: Error) => void;
  };

  @listen_at("click", "x-button")
  on_click(e: MouseEvent) {
    e.preventDefault();
    this.dialog.close((e.target! as HTMLElement).id);
  }

  @listen_at("close", "#dialog")
  on_close(e: MouseEvent) {
    if (this.#resolver) {
      if (this.dialog.returnValue == "confirm") {
        this.#resolver.resolve();
      } else {
        this.#resolver.reject(new Error(this.dialog.returnValue));
      }
      this.#resolver = undefined;
    }
  }

  @listen("click", "#dialog")
  on_clickoutside(e: MouseEvent) {
    const rect = this.dialog.getBoundingClientRect();

    const clickedInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;

    if (!clickedInDialog) this.dialog.close("cancel");
  }

  @watch("title")
  @mount
  update_title({ title }: { title: string }) {
    this.title_el.textContent = title;
  }

  open() {
    this.dialog.showModal();
    return new Promise<void>((resolve, reject) => {
      this.#resolver = { resolve, reject };
    });
  }

  close(value: string) {
    this.dialog.close(value);
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
