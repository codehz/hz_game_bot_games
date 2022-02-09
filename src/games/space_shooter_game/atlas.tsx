import jsx from "/js/jsx.js";
import { customElement, css, CustomHTMLElement, shadow } from "/js/ce.js";
import { TextureAtlas, AtlasViewer } from "/js/atlas.js";
import { assets } from "./index.js";

const img = assets.getImage("sheet")!;
const atlas = new TextureAtlas(assets.getXml("sheet")!);

@customElement("game-content")
@shadow(
  <>
    <AtlasViewer image={img} atlas={atlas} />
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