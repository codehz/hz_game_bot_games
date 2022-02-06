import { getData, api } from "/js/utils.js";
import {
  css,
  customElement,
  watch,
  mount,
  CustomHTMLElement,
  shadow,
  id,
  listen,
  prop,
} from "./ce.js";
import jsx from "/js/jsx.js";
import "/js/common.js";
import { SimpleRouter } from "/js/common.js";

const { user_name } = getData() as { user_name: string };

@customElement("log-panel-page")
@shadow(
  <simple-router id="router" value="loading">
    <div data-value="loading" id="loading">
      Loading...
    </div>
    <div data-value="ok" id="container">
      <span>会话</span>
      <span>时间</span>
      <span>用户</span>
      <span>分数</span>
      <div id="content" />
    </div>
    <div data-value="error" id="error">
      Permission denied
    </div>
  </simple-router>
)
@css`
  :host {
    display: block;
  }

  #loading {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  #container {
    display: grid;
    grid-template-columns: repeat(4, auto);
    gap: 4px 8px;
    padding: 4px 8px;
  }

  #error {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  #content {
    display: contents;
  }
`
export class LogPanelPage extends CustomHTMLElement {
  @id("router")
  private router!: SimpleRouter;

  @id("content")
  content!: HTMLElement;

  @prop()
  page!: string;

  @watch("page")
  @mount
  async updatePage({ page }: { page: string }) {
    try {
      this.router.value = "loading";
      const list = await api(`log/${+page}`);
      this.router.value = "ok";
      this.content.replaceChildren(
        ...list.map(({ session_id, time, user_id, score }) => (
          <>
            <span>{session_id}</span>
            <span>{new Date(time).toISOString()}</span>
            <span>{user_id}</span>
            <span>{score}</span>
          </>
        ))
      );
    } catch {
      this.router.value = "error";
    }
  }
}

@customElement("query-input")
@shadow(
  <>
    <label id="label" for="input"></label>
    <input id="input" />
    <button id="clear">clear</button>
  </>
)
@css`
  :host {
    display: block;
  }
  label,
  input,
  button {
    display: block;
  }
`
export class QueryInput extends CustomHTMLElement {
  @id("label")
  label!: HTMLLabelElement;

  @id("input")
  input!: HTMLInputElement;

  value: string = "";

  @listen("input", "#input", true)
  update() {
    this.value = this.input.value;
  }

  @listen("click", "#clear", true)
  clear() {
    this.value = this.input.value = "";
  }

  @mount
  @watch("label", "type", "placeholder")
  init({
    label = "input",
    type = "text",
    placeholder,
  }: Record<"label" | "type" | "placeholder", string | undefined>) {
    console.log(type);
    this.label.textContent = label;
    this.input.type = type;
    if (placeholder) this.input.placeholder = placeholder;
  }
}

@customElement("log-panel")
@shadow(
  <>
    <form id="queryform">
      <QueryInput name="session" label="session id" />
      <QueryInput name="user" label="user id" />
      <QueryInput name="min_time" label="min time" type="datetime-local" />
      <QueryInput name="max_time" label="max time" type="datetime-local" />
    </form>
    <log-panel-page id="content" page="0" />
    <span class="button" id="prev">
      上一页
    </span>
    <span id="number">1</span>
    <span class="button" id="next">
      下一页
    </span>
  </>
)
@css`
  :host {
    display: block;
    user-select: none;
  }

  .button {
    cursor: pointer;
  }
`
export class LogPanel extends CustomHTMLElement {
  page: number = 0;
  @id("content")
  content!: LogPanelPage;
  @id("number")
  page_number!: HTMLElement;

  @listen("click", "#prev", true)
  go_prev() {
    this.page = Math.max(0, this.page - 1);
    this.page_number.textContent = this.page + 1 + "";
    this.content.page = this.page + "";
  }

  @listen("click", "#next", true)
  go_next() {
    this.page++;
    this.page_number.textContent = this.page + 1 + "";
    this.content.page = this.page + "";
  }
}

@customElement("admin-panel")
@shadow(
  <>
    <span class="welcome">Hello {user_name}</span>
    <LogPanel />
  </>
)
@css`
  :host {
    display: block;
    background: red;
  }
`
export class AdminPanel extends CustomHTMLElement {}
