import jsx from "/js/jsx.js";
import { customElement, css, CustomHTMLElement, shadow } from "/js/ce.js";
import { AtlasViewer } from "/js/atlas.js";
import loading from "./loader.js";

const { sheet, atlas } = await loading;

@customElement("game-content")
@shadow(
  <>
    <AtlasViewer image={sheet} atlas={atlas} />
  </>
)
@css`
  :host {
    display: block;
    width: 100vw;
    height: 100vh;
  }

  atlas-viewer {
    padding: 10px;
  }
`
export class GameContent extends CustomHTMLElement {}