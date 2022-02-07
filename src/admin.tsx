import api, { GameHighScore, LogInfo, User } from "/js/api.js";
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
  listen_at,
} from "./ce.js";
import jsx from "/js/jsx.js";
import "/js/common.js";
import {
  AsyncLoader,
  DialogForm,
  FloatMenu,
  PageSelector,
  StyledButton,
  TabbedElement,
} from "/js/common.js";

@customElement("log-panel-page")
@shadow(
  <AsyncLoader id="loader">
    <table id="container">
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
  </AsyncLoader>
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

  @id("loader")
  private loader!: AsyncLoader;

  @id("content")
  content!: HTMLElement;

  @prop()
  page!: string;

  @prop()
  query!: string;

  item!: LogInfo;

  @watch("page", "query")
  @mount
  updatePage({
    page = this.page,
    query = this.query,
  }: {
    page?: string;
    query?: string;
  }) {
    this.loader.load = async () => {
      const list = await api(`log/${+page}`, { query });
      this.content.replaceChildren(
        ...list.map((item) => (
          <tr class="line" _={{ item }}>
            <td>
              {item.game}({item.session_id})
            </td>
            <td>{item.user_id}</td>
            <td>{item.score}</td>
            <td>{LogPanelPage.format.format(item.time)}</td>
          </tr>
        ))
      );
    };
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
  <>
    <FloatMenu id="menu">
      <span data-action="block">阻止用户</span>
    </FloatMenu>
    <DialogForm id="confirm_block" type="form" title="确认阻止用户">
      <QueryInput id="block_reason" label="阻止理由" type="text" />
    </DialogForm>
    <AsyncLoader id="loader">
      <div>
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
    </AsyncLoader>
  </>
)
@css`
  :host {
    color: var(--fgcolor);
  }

  table {
    width: 100%;
    display: grid;
    --side-column: minmax(40px, max-content);
    grid-template-columns: var(--side-column) 1fr var(--side-column);
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
  @id("loader")
  loader!: AsyncLoader;
  @id("content")
  content!: HTMLElement;
  @id("menu")
  menu!: FloatMenu;
  @id("confirm_block")
  confirm_block!: DialogForm;
  @id("block_reason")
  block_reason!: QueryInput;

  item!: GameHighScore;

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
    if (!session || !user) return;
    this.loader.load = async () => {
      const scores = await api(`session/${+session}/${+user}`);
      this.content.replaceChildren(
        ...scores.map((item) => (
          <tr class="line" _={{ item }}>
            <td data-type="position">{item.position}</td>
            <td data-type="user">
              <HighScoresUser {...item.user} />
            </td>
            <td data-type="score">{item.score}</td>
          </tr>
        ))
      );
    };
  }

  @listen("contextmenu", ".line")
  on_contextmenu(e: PointerEvent) {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement & { item: GameHighScore };
    this.item = target.item;
    this.menu.open(e);
  }

  @listen("click", "#menu > span")
  on_menuclick(e: MouseEvent) {
    const target = e.currentTarget as HTMLElement;
    switch (target.dataset.action) {
      case "block": {
        this.confirm_block
          .open()
          .then(async () => {
            const reason = this.block_reason.value;
            if (reason) {
              await api(`block/${this.item.user.id}`, { body: reason });
              console.log("TODO");
            }
          })
          .catch(() => {});
        break;
      }
    }
  }
}

@customElement("log-panel")
@shadow(
  <>
    <DialogForm type="form" id="queryform" title="过滤器设置">
      <QueryInput name="session_id" label="会话ID" type="number" />
      <QueryInput name="user_id" label="用户ID" type="number" />
      <QueryInput name="min_score" label="最低分数" type="number" />
      <QueryInput name="max_score" label="最高分数" type="number" />
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
    <div id="body">
      <div id="fiterbar">
        <StyledButton id="filter">打开过滤器</StyledButton>
      </div>
      <log-panel-page id="content" page="0" query="" />
      <PageSelector />
    </div>
  </>
)
@css`
  :host {
    display: block;
  }

  #body {
    display: flex;
    flex-direction: column;
    gap: 10px;
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

  @listen_at("set_page", "page-selector")
  set_page({ detail }: CustomEvent<number>) {
    this.content.page = detail + "";
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

@customElement("blocklist-page")
@shadow(
  <AsyncLoader id="loader">
    <table>
      <thead>
        <tr>
          <th>用户ID</th>
          <th>阻止理由</th>
        </tr>
      </thead>
      <tbody id="content" />
    </table>
  </AsyncLoader>
)
export class BlocklistPage extends CustomHTMLElement {
  @id("loader")
  loader!: AsyncLoader;

  @id("content")
  content!: HTMLElement;

  @prop()
  page!: string;

  @watch("page")
  @mount
  async updatePage({ page }: { page?: string }) {
    if (!page) return;
    this.loader.load = async () => {
      const list = await api(`blocklist/${+page}`);
      this.content.replaceChildren(
        ...list.map((opt) => (
          <tr class="line" _={opt}>
            <td>{opt.user_id}</td>
            <td>{opt.desc}</td>
          </tr>
        ))
      );
    };
  }
}

@customElement("blocklist-panel")
@shadow(
  <>
    <BlocklistPage id="content" page="0" />
    <PageSelector />
  </>
)
@css`
  :host {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
`
export class BlocklistPanel extends CustomHTMLElement {
  @id("content")
  content!: BlocklistPage;

  @listen("set_page", "page-selector")
  set_page({ detail }: CustomEvent<number>) {
    this.content.page = detail + "";
  }
}

@customElement("admin-panel")
@shadow(
  <>
    <TabbedElement selected="日志">
      <LogPanel data-tab="日志" />
      <BlocklistPanel data-tab="阻止列表" />
    </TabbedElement>
  </>
)
@css`
  :host {
    display: block;
  }
`
export class AdminPanel extends CustomHTMLElement {}
