import { getData } from "./utils.js";
import html, { css, defineCustomElement } from "/js/html.js";

const { user_name } = getData() as { user_name: string };

defineCustomElement("admin-panel", () => html`<div>Hello ${user_name}</div>`);
