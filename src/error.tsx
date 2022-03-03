import { customElement, CustomHTMLElement, shadow, id, css } from "/js/ce.js";
import { DialogForm } from "/js/common.js";
import jsx from "/js/jsx.js";

@customElement("error-dialog")
@shadow(
  <DialogForm id="dialog" type="dialog" title="出错啦!">
    <span>
      <slot />
    </span>
  </DialogForm>
)
@css`
  span {
    white-space: pre-wrap
  }
`
class ErrorDialog extends CustomHTMLElement {
  @id("dialog")
  dialog!: DialogForm;
  show(message: string) {
    this.textContent = message;
    this.dialog.open().catch(console.log);
  }
}

const dialog = document.getElementById("error-dialog") as ErrorDialog;

export default function reportError(e: any) {
  if (e instanceof Error) {
    console.error(e);
    dialog.show(e.stack ?? e.message);
  } else dialog.show(e + "");
}
