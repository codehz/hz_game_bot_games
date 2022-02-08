import jsx from "/js/jsx.js";
import { customElement, css, CustomHTMLElement, shadow } from "/js/ce.js";
import { GameCanvas } from "/js/canvas.js";
import AssLoader from "/js/assloader.js";
import { TextureAtlas, AtlasViewer } from "../atlas.js";

const assets = await AssLoader.load("/assets/space_shooter_game/assets.zip");

const img = assets.getImage("sheet")!;
const atlas = new TextureAtlas(assets.getXml("sheet")!);

console.log(...atlas.list());

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
`
export class GameContent extends CustomHTMLElement {}
