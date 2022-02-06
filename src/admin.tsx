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
    <div data-value="loading" id="loading">Loading...</div>
    <div data-value="ok" id="container">
      <span>会话</span>
      <span>时间</span>
      <span>用户</span>
      <span>分数</span>
      <div id="content" />
    </div>
    <div data-value="error" id="error">Permission denied</div>
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

@customElement("log-panel")
@shadow(
  <>
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
