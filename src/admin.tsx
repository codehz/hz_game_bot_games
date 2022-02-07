import { getData } from "/js/utils.js";
import api, { LogInfo, User } from "/js/api.js";
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
  select,
} from "./ce.js";
import jsx from "/js/jsx.js";
import "/js/common.js";
import { DialogForm, FloatMenu, SimpleRouter, StyledButton, TabbedElement } from "/js/common.js";

const { user_name } = getData() as { user_name: string };

@customElement("log-panel-page")
@shadow(
  <simple-router id="router" value="loading">
    <div data-value="loading" id="loading">
      Loading...
    </div>
    <table data-value="ok" id="container">
      <thead>
        <tr>
          <th>会话</th>
          <th>玩家</th>
          <th>分数</th>
          <th>时间</th>
        </tr>
      </thead>
      <tbody id="content" />
    </table>
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

  table {
    border-collapse: collapse;
  }

  th:nth-child(even),
  td:nth-child(even) {
    background: #ccc7;
  }

  .line {
    cursor: help;
  }

  .line:hover {
    background-color: var(--theme-color);
    color: white;
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
  static format = new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "medium",
  });

  @id("router")
  private router!: SimpleRouter;

  @id("content")
  content!: HTMLElement;

  @prop()
  page!: string;

  @prop()
  query!: string;

  item!: LogInfo;

  @watch("page", "query")
  @mount
  async updatePage({
    page = this.page,
    query = this.query,
  }: {
    page?: string;
    query?: string;
  }) {
    try {
      this.router.value = "loading";
      const list = await api(`log/${+page}`, { query });
      this.router.value = "ok";
      this.content.replaceChildren(
        ...list.map((item) => (
          <tr class="line" _={{ item }}>
            <td>{item.session_id}</td>
            <td>{item.user_id}</td>
            <td>{item.score}</td>
            <td>{LogPanelPage.format.format(item.time)}</td>
          </tr>
        ))
      );
    } catch {
      this.router.value = "error";
    }
  }

  @listen("contextmenu", ".line")
  on_menu(e: PointerEvent) {
    e.preventDefault();
    const el = e.currentTarget as HTMLElement & {
      item: LogInfo;
    };
    this.item = el.item;
    this.dispatchEvent(
      new CustomEvent("detail", {
        bubbles: true,
        detail: {
          x: e.x,
          y: e.y,
        },
      })
    );
  }
}

@customElement("query-input")
@shadow(
  <>
    <input placeholder=" " tabindex="0" id="input" />
    <label id="label" for="input"></label>
    <button id="clear"></button>
  </>
)
@css`
  :host {
    position: relative;
    display: grid;
    grid-template:
      "label label"
      "input clear" / auto 30px;
    color: var(--fgcolor);
  }
  label,
  input,
  button {
    display: block;
    color: var(--fgcolor);
  }
  label {
    grid-area: label;
    font-size: 50%;
    padding: 0 4px;
    width: fit-content;
    z-index: 2;
    position: relative;
    background: var(--bgcolor);
  }
  input {
    grid-area: input;
    padding: 4px 8px;
    border: none;
    background: none;
    position: relative;
  }
  button {
    grid-area: clear;
    border: none;
    background: none;
    position: relative;
    cursor: pointer;
  }
  button::before,
  button::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%) rotate(var(--deg));
    width: 12px;
    height: 2px;
    background: var(--fgcolor);
  }
  button::before {
    --deg: 45deg;
  }
  button::after {
    --deg: -45deg;
  }
  :focus-visible {
    outline: 2px solid;
  }
  :host(:not([type*="time"])) label {
    position: absolute;
    top: 4px;
    left: 4px;
    font-size: 100%;
    transition: all ease 0.2s;
    pointer-events: none;
  }
  :host(:not([type*="time"])) input:focus + label,
  :host(:not([type*="time"])) input:not(:placeholder-shown) + label {
    top: -8px;
    left: 0;
    font-size: 50%;
  }

  ::-webkit-calendar-picker-indicator {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    cursor: pointer;
    opacity: 0;
  }
`
export class QueryInput extends CustomHTMLElement {
  @id("label")
  label!: HTMLLabelElement;

  @id("input")
  input!: HTMLInputElement;

  @prop()
  name!: string;

  get value() {
    return this.input.value;
  }
  set value(val) {
    this.input.value = val;
  }

  @listen("click", "#clear")
  clear() {
    this.value = "";
  }

  @mount
  @watch("label", "type")
  init({
    label = "input",
    type = "text",
  }: Record<"label" | "type" | "placeholder", string | undefined>) {
    this.label.textContent = label;
    this.input.type = type;
  }
}

@customElement("highscores-user")
@css`
  :host {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    font-family: monospace;
  }

  [data-type] {
    display: inline-flex;
    align-items: center;
    padding: 2px 6px;
    background: #fff;
    color: #000;
  }

  [data-type]::before {
    content: attr(data-type) ":";
    margin-right: 2px;
  }
`
export class HighScoresUser extends CustomHTMLElement {
  constructor({ id, username, first_name, last_name, language_code }: User) {
    super();
    this.shadowTemplate = (
      <>
        <span data-type="name">
          {first_name} {last_name}
        </span>
        {username && (
          <a
            data-type="username"
            href={`https://t.me/${username}`}
            target="_blank"
          >
            {username}
          </a>
        )}
        <span data-type="id">{id}</span>
        <span data-type="lang">{language_code ?? "unknown"}</span>
      </>
    );
  }
}

@customElement("highscores-panel")
@shadow(
  <simple-router id="router" value="loading">
    <div data-value="loading">加载中...</div>
    <div data-value="ok">
      <table>
        <thead>
          <tr>
            <th data-type="position">排行</th>
            <th data-type="user">玩家信息</th>
            <th data-type="score">分数</th>
          </tr>
        </thead>
        <tbody id="content" />
      </table>
    </div>
    <div data-value="error">加载失败</div>
  </simple-router>
)
@css`
  :host {
    color: var(--fgcolor);
  }

  table {
    width: 100%;
    display: grid;
    grid-template-columns: minmax(40px, max-content) 1fr minmax(
        40px,
        max-content
      );
    gap: 8px;
  }

  thead,
  tbody,
  tr {
    display: contents;
  }

  td[data-type="position"] {
    text-align: right;
  }
`
export class HighScoresPanel extends CustomHTMLElement {
  @id("router")
  router!: SimpleRouter<"loading" | "ok" | "error">;
  @id("content")
  content!: HTMLElement;

  @prop()
  session?: string;

  @prop()
  user?: string;

  @watch("session", "user")
  @mount
  async load({
    session = this.session,
    user = this.user,
  }: Record<"session" | "user", string | undefined>) {
    this.router.value = "loading";
    console.log(session, user);
    if (!session || !user) return;
    try {
      const scores = await api(`session/${+session}/${+user}`);
      this.content.replaceChildren(
        ...scores.map((obj) => (
          <tr class="line" _={obj}>
            <td data-type="position">{obj.position}</td>
            <td data-type="user">
              <HighScoresUser {...obj.user} />
            </td>
            <td data-type="score">{obj.score}</td>
          </tr>
        ))
      );
      this.router.value = "ok";
    } catch {
      this.router.value = "error";
    }
  }
}

@customElement("log-panel")
@shadow(
  <>
    <DialogForm type="form" id="queryform" title="过滤器设置">
      <QueryInput name="session_id" label="会话ID" type="number" />
      <QueryInput name="user_id" label="用户ID" type="number" />
      <QueryInput name="min_time" label="开始时间" type="datetime-local" />
      <QueryInput name="max_time" label="结束时间" type="datetime-local" />
    </DialogForm>
    <FloatMenu id="menu">
      <span data-action="highscores">查询用户排名</span>
      <span data-action="filter" data-type="session_id">
        过滤当前会话
      </span>
      <span data-action="filter" data-type="user_id">
        过滤当前用户
      </span>
    </FloatMenu>
    <DialogForm type="dialog" id="highscores_form" title="高分榜">
      <HighScoresPanel id="highscores" />
    </DialogForm>
    <StyledButton id="filter">打开过滤器</StyledButton>
    <log-panel-page id="content" page="0" query="" />
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
  @id("menu")
  menu!: FloatMenu;
  @id("highscores_form")
  highscores_form!: DialogForm;
  @id("highscores")
  highscores!: HighScoresPanel;

  @id("queryform")
  queryform!: DialogForm;

  @select("query-input", { all: true })
  data!: QueryInput[];

  @listen("click", "#filter")
  async open_filter() {
    try {
      await this.queryform.open();
      this.content.query = new URLSearchParams(
        this.data
          .filter(({ value }) => value)
          .map(({ name, value }) => [name, value])
      ).toString();
    } catch {}
  }

  @listen("click", "#prev")
  go_prev() {
    this.page = Math.max(0, this.page - 1);
    this.page_number.textContent = this.page + 1 + "";
    this.content.page = this.page + "";
  }

  @listen("click", "#next")
  go_next() {
    this.page++;
    this.page_number.textContent = this.page + 1 + "";
    this.content.page = this.page + "";
  }

  @listen("detail")
  open_menu({ detail }: CustomEvent<{ item: {}; x: number; y: number }>) {
    this.menu.open(detail);
  }

  @listen("click", "float-menu > span")
  click_menu(e: MouseEvent) {
    const target = e.target as HTMLElement;
    switch (target.dataset.action) {
      case "filter": {
        const selector = `[name="${target.dataset.type}"]`;
        const input = this.shadowRoot!.querySelector(selector) as QueryInput;
        input.value = (this.content.item as any)[target.dataset.type!];
        this.open_filter();
        break;
      }
      case "highscores": {
        this.highscores.session = this.content.item.session_id + "";
        this.highscores.user = this.content.item.user_id + "";
        this.highscores_form.open().catch(() => {});
      }
    }
  }
}

@customElement("admin-panel")
@shadow(
  <>
    <TabbedElement selected="日志面板">
      <LogPanel data-tab="日志面板" />
    </TabbedElement>
  </>
)
@css`
  :host {
    display: block;
  }
`
export class AdminPanel extends CustomHTMLElement {}
