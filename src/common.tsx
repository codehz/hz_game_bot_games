import {
  css,
  customElement,
  CustomHTMLElement,
  id,
  listen,
  listen_at,
  listen_host,
  mount,
  prop,
  select,
  shadow,
  unmount,
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
    user-select: none;
    cursor: pointer;
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

@customElement("field-set")
@shadow(
  <>
    <h3 id="title" />
    <slot />
  </>
)
@css`
  :host {
    display: contents;
  }
  h3 {
    margin: 0;
    margin-bottom: 10px;
    position: sticky;
    top: 0;
  }
`
export class FieldSet extends CustomHTMLElement {
  @id("title")
  title_el!: HTMLElement;

  @watch("title")
  @mount
  update_title({ title }: { title: string }) {
    this.title_el.textContent = title;
  }
}

@customElement("dialog-form")
@shadow(
  <dialog id="dialog">
    <div class="container">
      <h2 id="title" />
      <slot />
      <div class="bottombar">
        <slot name="bottom" />
        <StyledButton id="cancel">??????</StyledButton>
        <StyledButton id="confirm">??????</StyledButton>
        <StyledButton id="close">??????</StyledButton>
      </div>
    </div>
  </dialog>
)
@css`
  dialog::backdrop {
    background: none;
  }
  dialog {
    background: var(--theme-color);
    border: none;
    padding: 0;
    margin: 0;
    top: unset;
    bottom: 0;
    width: 100vw;
    max-width: unset;
    max-height: calc(100vh - 50px);
    box-sizing: border-box;
    --fgcolor: white;
    --bgcolor: var(--theme-color);
    box-shadow: 0 0 0 2px white;
  }

  dialog[open] {
    display: grid;
  }

  h2 {
    color: var(--fgcolor);
    margin: 0;
    padding-bottom: 10px;
  }

  .container {
    margin: 0 auto;
    padding: 20px 0;
    display: grid;
    grid-template-rows: max-content 1fr max-content;
    width: calc(100% - 80px);
    max-width: 600px;
    max-height: inherit;
    box-sizing: border-box;
  }

  slot:not([name]) {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overscroll-behavior: contain;
    flex: 1;
    gap: 10px;
    padding: 10px;
    margin: 0 -10px;
  }

  .bottombar {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  :host([type="form"]) #close {
    display: none;
  }

  :host([type="dialog"]) #cancel,
  :host([type="dialog"]) #confirm {
    display: none;
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
  on_close() {
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
    this.dialog.animate(
      [
        {
          transform: "translateY(100%)",
        },
        {
          transform: "translateY(0)",
        },
      ],
      { duration: 200, easing: "ease-in" }
    );
    return new Promise<void>((resolve, reject) => {
      this.#resolver = { resolve, reject };
    });
  }

  close(value: string) {
    this.dialog.close(value);
  }
}

@customElement("float-menu")
@shadow(
  <>
    <dialog id="dialog">
      <slot />
    </dialog>
  </>
)
@css`
  dialog[open] {
    margin: 0;
    padding: 0;
    border: none;
    box-sizing: border-box;
    box-shadow: 0 0 0 2px #0002;
    background: #fff;
    overflow: hidden;
  }
  dialog::backdrop {
    background: none;
  }

  slot {
    display: flex;
    flex-direction: column;
  }

  ::slotted(span) {
    padding: 4px 8px;
    cursor: pointer;
  }

  ::slotted(span:hover) {
    background: var(--theme-color);
    color: white;
  }
`
export class FloatMenu extends CustomHTMLElement {
  @id("dialog")
  dialog!: HTMLElement & {
    showModal(): void;
    close(): void;
  };

  @select("slot")
  container!: HTMLSlotElement;

  open({ x, y }: { x: number; y: number }) {
    this.dialog.showModal();
    const { offsetWidth: width, offsetHeight: height } = this.container;
    x = Math.min(x, window.innerWidth - width - 2);
    y = Math.min(y, window.innerHeight - height - 2);
    this.dialog.style.left = `${x}px`;
    this.dialog.style.top = `${y}px`;
    this.dialog.animate(
      [
        {
          height: "0",
        },
        {
          height: `${height}px`,
        },
      ],
      {
        duration: 100,
      }
    );
  }

  close() {
    this.dialog.close();
  }

  @listen("contextmenu")
  on_contextmenu(e: PointerEvent) {
    e.preventDefault();
    this.dialog.close();
  }

  @listen("click")
  on_click() {
    this.dialog.close();
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
export class SimpleRouter<T extends string = string> extends CustomHTMLElement {
  #observer = new ResizeObserver(
    ([
      {
        borderBoxSize: [{ blockSize: height }],
      },
    ]) => {
      this.#refresh(height);
    }
  );

  @prop()
  value!: T;

  @select(".active", { dynamic: true })
  active!: HTMLElement;

  @watch("value")
  @mount
  select({ value }: { value: string }) {
    const last = this.active;
    for (const child of this.children) {
      if (child instanceof HTMLElement) {
        child.classList.toggle("active", child.dataset.value == value);
      }
    }
    const now = this.active;
    if (last != now) {
      if (last) this.#observer.unobserve(last);
      this.#observer.observe(now);
    }
  }

  #old = 0;

  #refresh = debounce((height: number) => {
    if (this.#old != height && height != 0) {
      this.style.height = `${height}px`;
      this.#old = height;
    }
  });
}

@customElement("tabbed-element")
@shadow(
  <>
    <div id="tabbar" />
    <slot id="content" />
  </>
)
@css`
  :host {
    display: grid;
    grid-template-rows: max-content 1fr;
  }

  #tabbar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 10px;
    user-select: none;
    background: var(--theme-color);
    cursor: pointer;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  #tabbar > .item {
    display: inline-flex;
    align-items: center;
    padding: 0 10px;
    height: 30px;
    background: #fffc;
    color: black;
  }

  #tabbar > .item.active {
    background: white;
  }

  #slot {
    display: block;
  }

  ::slotted([data-tab]) {
    padding: 10px;
    z-index: 0;
  }

  ::slotted([data-tab]:not(.active)) {
    display: none;
  }
`
export class TabbedElement extends CustomHTMLElement {
  #moniter = new MutationObserver(() => this.refresh());
  constructor() {
    super();
    this.#moniter.observe(this, { childList: true });
  }

  @prop()
  selected?: string;

  @select("[data-tab]", { all: true, dynamic: true })
  tabcontents!: HTMLElement[];

  @id("tabbar")
  tabbar!: HTMLDivElement;

  @mount
  refresh() {
    this.tabbar?.replaceChildren(
      ...this.tabcontents.map((div) => (
        <div class="item">{div.dataset.tab}</div>
      ))
    );
  }

  @watch("selected")
  @mount
  on_select({ selected }: { selected?: string }) {
    if (selected) {
      for (const tabcontent of this.tabcontents) {
        tabcontent.classList.toggle(
          "active",
          tabcontent.dataset.tab == selected
        );
      }
      for (const tab of this.tabbar.children) {
        tab.classList.toggle("active", tab.textContent == selected);
      }
    }
  }

  @listen("click", "#tabbar > .item")
  on_select_tab(e: MouseEvent) {
    this.selected = (e.currentTarget as HTMLDivElement).innerText;
  }
}

@customElement("async-loader")
@shadow(
  <SimpleRouter id="router" value="loading">
    <div class="other" data-value="loading">
      ?????????
    </div>
    <div class="other" data-value="error">
      ????????????
    </div>
    <div class="target" data-value="ok">
      <slot />
    </div>
  </SimpleRouter>
)
@css`
  :host {
    display: block;
  }
  .other {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .target {
    display: grid;
  }
`
export class AsyncLoader extends CustomHTMLElement {
  @id("router")
  router!: SimpleRouter<"loading" | "ok" | "error">;
  set load(call: () => Promise<void>) {
    this.router.value = "loading";
    call()
      .then(() => (this.router.value = "ok"))
      .catch(() => (this.router.value = "error"));
  }
}

@customElement("page-selector")
@shadow(
  <>
    <div id="prev">?????????</div>
    <input id="number" type="number" value="1" min="1" />
    <div id="next">?????????</div>
  </>
)
@css`
  :host {
    display: flex;
    gap: 10px;
    user-select: none;
  }

  input {
    appearance: none;
    border: none;
    width: 4ex;
    text-align: center;
  }

  input::-webkit-inner-spin-button {
    display: none;
  }

  input:focus-visible {
    outline: none;
    box-shadow: inset 0 -2px black;
  }
`
export class PageSelector extends CustomHTMLElement {
  @id("number")
  input!: HTMLInputElement;

  get value() {
    return this.input.valueAsNumber - 1;
  }

  #oldvalue = 0;

  #notifyIfNeeded() {
    const value = this.value;
    if (value == this.#oldvalue) {
      return;
    }
    this.#oldvalue = value;
    this.dispatchEvent(new CustomEvent("set_page", { detail: value }));
  }

  @listen_at("change", "input")
  normalize_value() {
    this.input.valueAsNumber = Math.max(1, +this.input.value || 1);
    this.#notifyIfNeeded();
  }

  @listen("click", "#prev")
  go_prev() {
    this.input.valueAsNumber = Math.max(1, this.input.valueAsNumber - 1);
    this.#notifyIfNeeded();
  }

  @listen("click", "#next")
  go_next() {
    this.input.valueAsNumber++;
    this.#notifyIfNeeded();
  }
}

@customElement("sized-container")
@shadow(
  <>
    <div id="sensor" aria-hidden="true" />
    <slot />
  </>
)
@css`
  :host {
    display: contents;
  }
  #sensor {
    display: block;
    position: absolute;
    inset: 0;
    pointer-events: none;
    user-select: none;
  }
`
export class SizedContainer extends CustomHTMLElement {
  @id("sensor")
  sensor!: HTMLDivElement;
  #observer = new ResizeObserver(() => {
    this.style.setProperty("--width", this.sensor.offsetWidth + "px");
    this.style.setProperty("--height", this.sensor.offsetHeight + "px");
  });

  @mount
  mount() {
    this.#observer.observe(this.sensor);
  }

  @unmount
  unmount() {
    this.#observer.unobserve(this.sensor);
  }
}
