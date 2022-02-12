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
import GameCanvas, { renderSprites } from "/js/canvas.js";
import loading from "./loader.js";
import World from "/js/ecs.js";
import { AtlasDescriptor } from "/js/atlas.js";

const { sheet, atlas } = await loading;

@customElement("game-content")
@shadow(
  <>
    <GameCanvas id="canvas" />
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

  #world = new World({
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    rotate: 0,
    scale: 0,
    opacity: 0,
    atlas: null as unknown as AtlasDescriptor,
  });

  #moving_view = this.#world.view("position", "velocity");
  #rendering = renderSprites({
    view: this.#world.view("position", "rotate", "scale", "opacity", "atlas"),
    image: sheet,
  });

  #player = this.#world.add({
    position: { x: 50, y: 100 },
    velocity: { x: 0, y: 0 },
    rotate: 0,
    scale: 0.2,
    opacity: 1,
    atlas: atlas.get("playerShip1_blue")!,
  });
  #ghost = this.#world.add({
    position: { x: 50, y: 100 },
    rotate: 0,
    scale: 0.2,
    opacity: 1,
    atlas: atlas.get("playerShip1_blue")!,
  });

  #offset?: { x: number; y: number };
  #current!: { x: number; y: number };
  #ghost_target?: { x: number; y: number };
  #maxspeed = 10;

  @listen_host("pointerdown")
  on_click({ x, y, isPrimary }: PointerEvent) {
    if (!isPrimary) return;
    const scale = this.canvas.scale;
    x /= scale;
    y /= scale;
    this.#current = this.#offset = { x, y };
    this.#ghost.position = { ...this.#player.position! };
    this.#ghost.opacity = 0.2;
    this.#ghost_target = { ...this.#player.position! };
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

  #limit_player_speed() {
    const { x, y } = this.#player.velocity!;
    const speed = (x ** 2 + y ** 2) ** 0.5;
    const base = speed > this.#maxspeed ? this.#maxspeed / speed : 0.9;
    this.#player.velocity = {
      x: x * base,
      y: y * base,
    };
  }

  #move_ghost() {
    if (this.#ghost_target) {
      let { x, y } = this.#ghost_target;
      this.#ghost.position!.x = Math.min(Math.max(x, 10), 90);
      this.#ghost.position!.y = Math.min(Math.max(y, 10), 140);
    }
  }

  #move_player() {
    const [gdx, gdy] = [
      this.#ghost.position!.x - this.#player.position!.x,
      this.#ghost.position!.y - this.#player.position!.y,
    ];
    const glen = (gdx ** 2 + gdy ** 2) ** 0.5;
    if (glen > 0) {
      this.#maxspeed = glen > 10 ? 10 : glen;
      const df = glen < 50 ? 0.5 + (glen / 50) * 4.5 : 5;
      this.#player.velocity!.x += (gdx / glen) * df;
      this.#player.velocity!.y += (gdy / glen) * df;
      this.#limit_player_speed();
    } else if (this.#offset == null) {
      this.#ghost.opacity = 0;
    }
  }

  #limit_player() {
    const { x, y } = this.#player.position!;
    if (x < 10) {
      this.#player.velocity!.x += 1;
    } else if (x > 90) {
      this.#player.velocity!.x -= 1;
    }
    if (y < 10) {
      this.#player.velocity!.y += 1;
    } else if (y > 140) {
      this.#player.velocity!.y -= 1;
    }
  }

  #iter_velocity() {
    for (const { position, velocity } of this.#moving_view) {
      position.x += velocity.x;
      position.y += velocity.y;
    }
  }

  @attach("prepare", "#canvas")
  on_prepare() {
    if (this.#offset && this.#current && this.#ghost_target) {
      const [dx, dy] = [
        this.#current.x - this.#offset.x,
        this.#current.y - this.#offset.y,
      ];
      this.#offset = this.#current;
      this.#ghost_target.x += dx;
      this.#ghost_target.y += dy;
    }

    this.#move_ghost();
    this.#move_player();
    this.#limit_player();
    this.#iter_velocity();
  }

  @attach("frame", "#canvas")
  on_frame(ctx: CanvasRenderingContext2D) {
    this.#rendering(ctx);
  }

  @listen_host("pointerup")
  @listen_host("pointercancel")
  @listen_host("pointerout")
  on_cancel({ isPrimary }: PointerEvent) {
    if (!isPrimary) return;
    this.#offset = undefined;
  }
}
