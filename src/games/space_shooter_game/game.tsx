import jsx from "/js/jsx.js";
import {
  customElement,
  css,
  CustomHTMLElement,
  shadow,
  id,
  mount,
  listen,
  frame,
  attach,
} from "/js/ce.js";
import { GameCanvas, SimpleSprite } from "/js/canvas.js";
import { atlas, sheet } from "./loader.js";

@customElement("game-content")
@shadow(
  <>
    <GameCanvas id="canvas">
      <SimpleSprite
        id="player"
        x={0}
        y={0}
        atlas={atlas.get("playerShip1_blue")!}
        image={sheet}
      />
    </GameCanvas>
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
export class GameContent extends CustomHTMLElement {
  @id("canvas")
  canvas!: GameCanvas;

  @id("player")
  player!: SimpleSprite;

  #offset?: { x: number; y: number };
  #current!: { x: number; y: number };

  @listen("pointerdown")
  on_click({ x, y, isPrimary }: PointerEvent) {
    if (!isPrimary) return;
    this.#offset = { x, y };
    // TODO: Start game
  }

  @listen("pointermove")
  on_move({ x, y, isPrimary }: PointerEvent) {
    if (!isPrimary) return;
    this.#current = { x, y };
  }

  @attach("prepare", "#canvas")
  on_hook() {
    if (this.#offset) {
      const [x, y] = [
        this.#current.x - this.#offset.x,
        this.#current.y - this.#offset.y,
      ];
      this.#offset = this.#current;
      this.player.data.x += x;
      this.player.data.y += y;
    }
  }

  @listen("pointerup")
  @listen("pointercancel")
  on_cancel({ isPrimary }: PointerEvent) {
    if (!isPrimary) return;
    this.#offset = undefined;
  }
}
