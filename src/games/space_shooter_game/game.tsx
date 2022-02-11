import jsx from "/js/jsx.js";
import {
  customElement,
  css,
  CustomHTMLElement,
  shadow,
  id,
  attach,
  listen_host,
} from "/js/ce.js";
import { GameCanvas, SimpleSprite, TransformContext } from "/js/canvas.js";
import loading from "./loader.js";

const { sheet, atlas } = await loading;

@customElement("game-content")
@shadow(
  <>
    <GameCanvas id="canvas">
      <SimpleSprite
        id="ghost"
        x={50}
        y={100}
        opacity={0}
        scale={0.2}
        atlas={atlas.get("playerShip1_blue")!}
        image={sheet}
      />
      <SimpleSprite
        id="player"
        x={50}
        y={100}
        scale={0.2}
        atlas={atlas.get("playerShip1_blue")!}
        image={sheet}
      />
    </GameCanvas>
  </>
)
@css`
  :host {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100vw;
    height: 100vh;
    background: #222;
  }

  atlas-viewer {
    padding: 10px;
  }

  #canvas {
    height: 150vw;
    width: 100vw;
    overflow: none;
    background: #000;
  }

  @media (min-aspect-ratio: 2/3) {
    #canvas {
      height: 100vh;
      width: calc(100vh * 2 / 3);
    }
  }
`
export class GameContent extends CustomHTMLElement {
  @id("canvas")
  canvas!: GameCanvas;

  @id("player")
  player!: SimpleSprite;

  @id("ghost")
  ghost!: SimpleSprite;

  #offset?: { x: number; y: number };
  #current!: { x: number; y: number };
  #ghost?: { x: number; y: number };
  #speed = { x: 0, y: 0 };
  #maxspeed = 10;

  @listen_host("pointerdown")
  on_click({ x, y, isPrimary }: PointerEvent) {
    if (!isPrimary) return;
    const scale = this.canvas.scale;
    x /= scale;
    y /= scale;
    this.#current = this.#offset = { x, y };
    Object.assign(this.ghost.data, { ...this.player.data, opacity: 0.2 });
    this.#ghost = { x: this.ghost.data.x, y: this.ghost.data.y };
    // TODO: Start game
  }

  @listen_host("pointermove")
  on_move({ x, y, isPrimary }: PointerEvent) {
    if (!isPrimary) return;
    const scale = this.canvas.scale;
    x /= scale;
    y /= scale;
    this.#current = { x, y };
  }

  #limit_speed() {
    const { x, y } = this.#speed;
    const len = (x ** 2 + y ** 2) ** 0.5;
    const base = len > this.#maxspeed ? this.#maxspeed / len : 0.9;
    this.#speed = {
      x: x * base,
      y: y * base,
    };
  }

  #move_ghost() {
    if (this.#ghost) {
      let { x, y } = this.#ghost;
      x = Math.min(Math.max(x, 10), 90);
      y = Math.min(Math.max(y, 10), 140);
      Object.assign(this.ghost.data, { x, y });
    }
  }

  #move_player() {
    const [gdx, gdy] = [
      this.ghost.data.x - this.player.data.x,
      this.ghost.data.y - this.player.data.y,
    ];
    const glen = (gdx ** 2 + gdy ** 2) ** 0.5;
    if (glen > 0) {
      this.#maxspeed = glen > 10 ? 10 : glen;
      const df = glen < 50 ? 0.5 + (glen / 50) * 4.5 : 5;
      this.#speed.x += (gdx / glen) * df;
      this.#speed.y += (gdy / glen) * df;
      this.#limit_speed();
      this.player.data.x += this.#speed.x;
      this.player.data.y += this.#speed.y;
    } else if (this.#offset == null) {
      this.ghost.data.opacity = 0;
    }
  }

  #limit_player() {
    const { x, y } = this.player.data;
    if (x < 10) {
      this.#speed.x += 1;
    } else if (x > 90) {
      this.#speed.x -= 1;
    }
    if (y < 10) {
      this.#speed.y += 1;
    } else if (y > 140) {
      this.#speed.y -= 1;
    }
  }

  @attach("prepare", "#canvas")
  on_hook() {
    if (this.#offset && this.#current && this.#ghost) {
      const [dx, dy] = [
        this.#current.x - this.#offset.x,
        this.#current.y - this.#offset.y,
      ];
      this.#offset = this.#current;
      this.#ghost.x += dx;
      this.#ghost.y += dy;
    }

    this.#move_ghost();
    this.#move_player();
    this.#limit_player();
  }

  @listen_host("pointerup")
  @listen_host("pointercancel")
  @listen_host("pointerout")
  on_cancel({ isPrimary }: PointerEvent) {
    if (!isPrimary) return;
    this.#offset = undefined;
  }
}
