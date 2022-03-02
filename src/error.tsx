import { customElement, CustomHTMLElement, shadow, id } from "/js/ce.js";
import { DialogForm } from "/js/common.js";
import jsx from "/js/jsx.js";

@customElement("error-dialog")
@shadow(
  <DialogForm id="dialog" tyoe="dialog" title="出错啦!">
    <slot />
  </DialogForm>
)
class ErrorDialog extends CustomHTMLElement {
  @id("dialog")
  dialog!: DialogForm;
  show(message: string) {
    this.textContent = message;
    this.dialog.open().catch(console.log);
  }
}

export default function reportError(e: any) {
  dialog.show(e + "");
}

const dialog = document.getElementById("error-dialog") as ErrorDialog;

window.onerror = (e) => {
  reportError("" + e);
};
