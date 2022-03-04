import jsx from "/js/jsx.js";
import World from "/js/ecs.js";
import GameCanvas from "/js/canvas.js";
import {
  customElement,
  CustomHTMLElement,
  shadow,
  css,
  attach,
  id,
  listen_external,
  listen_host,
  listen_at,
} from "/js/ce.js";
import { DialogForm, SizedContainer, StyledButton } from "/js/common.js";
import { Components, MineMap, Resource } from "./types.js";
import * as render from "./render.js";
import * as logic from "./logic.js";
import { randomSelect, range } from "/js/utils.js";
import * as index from "/js/index.js";

@customElement("game-instance")
@shadow(<GameCanvas id="canvas" />)
@css`
  :host {
    display: block;
    position: relative;
    font-family: monospace;
  }
  #canvas {
    width: 100%;
    height: 100%;
  }
`
class GameInstance extends CustomHTMLElement {
  pause: boolean = true;
  blocked: boolean = false;

  #touch?: { x: number; y: number; identifier: number };

  @id("canvas")
  canvas!: GameCanvas;

  #world = new World<Components, Resource>({
    score: 0,
    max_score: 0,
    cell_size: 40 / 3,
    grid_size: 3,
    playermap: new MineMap(3),
    ballmap: new MineMap(3),
    bonusmap: new MineMap(3),
  });

  #logic_player_move = logic.player_move(this.#world);
  #logic_player_track = logic.player_track(this.#world);
  #logic_ball_move = logic.ball_move(this.#world);
  #logic_ball_track = logic.ball_track(this.#world);
  #logic_animate = logic.animate(this.#world);

  #render_playground = render.playground(this.#world);
  #render_debug_maps = render.debug_maps(this.#world);
  #render_player = render.player(this.#world);
  #render_bonus = render.bonus(this.#world);
  #render_ball = render.ball(this.#world);
  #render_score = render.score(this.#world);
  #render_pause = render.pause(this.#world);

  #playground = this.#world.add({ tag_playground: true });
  #player = this.#world.add({ tag_player: true, x: 0, y: 0 });

  #timer = 0;

  constructor() {
    super();
    this.#world.resource.playermap.put(0, 0);
    this.generate_bonus();
    this.#world.on("bonus", () => {
      this.generate_bonus();
      this.#world.resource.score++;
    });
    this.#world.on("crash", () => {
      if (this.#world.resource.score > this.#world.resource.max_score) {
        this.#world.resource.max_score = this.#world.resource.score;
        this.blocked = true;
        this.pause = true;
        this.dispatchEvent(
          new CustomEvent("gameover", {
            detail: this.#world.resource.score,
            bubbles: true,
            composed: true,
          })
        );
      }
      this.#world.resource.score = 0;
    });
  }

  generate_bonus() {
    while (true) {
      const limit = (this.#world.resource.grid_size - 1) / 2;
      const x = randomSelect(range(limit + 1, -limit).toArray());
      const y = randomSelect(range(limit + 1, -limit).toArray());
      if (this.#world.resource.playermap.get(x, y)) continue;
      this.#world.resource.bonusmap.put(x, y);
      break;
    }
  }

  @attach("prepare", "#canvas")
  prepare() {
    if (this.pause) return;
    this.#timer++;
    if (this.#timer == 50) {
      this.#timer = 0;
      const axis = randomSelect(["x", "y"] as const);
      const limit = (this.#world.resource.grid_size - 1) / 2;
      const track = randomSelect(range(limit + 1, -limit).toArray());
      let [position, speed] = randomSelect<[number, number]>([
        [-55, 1],
        [55, -1],
      ]);
      speed *= 0.5 + 0.5 * Math.random();
      this.#world.add({ track, axis, position, speed });
    }
    this.#logic_player_move();
    this.#logic_player_track();
    this.#logic_ball_move();
    this.#logic_ball_track();
    this.#logic_animate();
    this.#world.sync();
    delete this.#world.resource.event_move;
  }

  @attach("frame", "#canvas")
  render(ctx: CanvasRenderingContext2D) {
    this.#render_playground(ctx);
    this.#render_debug_maps(ctx);
    this.#render_player(ctx);
    this.#render_bonus(ctx);
    this.#render_ball(ctx);
    this.#render_score(ctx);
    if (this.pause) {
      this.#render_pause(ctx);
    }
  }

  @listen_external("blur", window)
  on_blur() {
    this.pause = true;
  }

  @listen_external("keydown", window)
  on_keydown(e: KeyboardEvent) {
    if (e.repeat || this.blocked) return;
    switch (e.code) {
      case "ArrowLeft":
        this.#world.resource.event_move = { x: -1, y: 0 };
        this.pause = false;
        break;
      case "ArrowRight":
        this.#world.resource.event_move = { x: 1, y: 0 };
        this.pause = false;
        break;
      case "ArrowUp":
        this.#world.resource.event_move = { x: 0, y: -1 };
        this.pause = false;
        break;
      case "ArrowDown":
        this.#world.resource.event_move = { x: 0, y: 1 };
        this.pause = false;
        break;
      case "Escape":
        this.pause = true;
        break;
    }
  }

  @listen_external("touchstart", window)
  on_touchstart(e: TouchEvent) {
    if (this.blocked) return;
    this.pause = false;
    const touch = e.touches[0];
    this.#touch = {
      x: touch.clientX,
      y: touch.clientY,
      identifier: touch.identifier,
    };
  }

  @listen_external("touchmove", window)
  on_touchmove(e: TouchEvent) {
    if (this.#touch) {
      const target = [...e.changedTouches].find(
        ({ identifier }) => identifier == this.#touch!.identifier
      );
      if (target) {
        const dx = target.clientX - this.#touch.x;
        const dy = target.clientY - this.#touch.y;

        if (dx ** 2 + dy ** 2 > (this.canvas.clientWidth / 6) ** 2) {
          if (dx > dy) {
            if (dx > -dy) {
              this.#touch.x = target.clientX;
              this.#world.resource.event_move = { x: 1, y: 0 };
            } else {
              this.#touch.y = target.clientY;
              this.#world.resource.event_move = { x: 0, y: -1 };
            }
          } else {
            if (dx > -dy) {
              this.#touch.y = target.clientY;
              this.#world.resource.event_move = { x: 0, y: 1 };
            } else {
              this.#touch.x = target.clientX;
              this.#world.resource.event_move = { x: -1, y: 0 };
            }
          }
        }
      }
    }
  }
}

@customElement("game-over")
@shadow(
  <DialogForm id="dialog" type="dialog" title="游戏结束">
    <div id="score">
      分数：
      <slot />
    </div>
    <table id="container">
      <thead>
        <tr>
          <th>排名</th>
          <th>分数</th>
          <th>ID</th>
        </tr>
      </thead>
      <tbody id="list" />
    </table>
    <StyledButton id="share">分享</StyledButton>
  </DialogForm>
)
@css`
  :host {
    font-family: monospace;
  }
  #score {
    font-size: 20px;
  }
  #share {
    align-self: end;
  }
`
class GameOver extends CustomHTMLElement {
  @id("list")
  list!: HTMLTableSectionElement;
  @id("dialog")
  dialog!: DialogForm;
  async show(score: number) {
    console.log("show");
    this.textContent = "" + score;
    try {
      const scorelist = await index.score(score);
      scorelist.sort((a, b) => a.position - b.position);

      this.list.replaceChildren(
        ...scorelist.map(
          ({ score, position, user: { first_name, last_name } }) => {
            const name = first_name + (last_name ? " " + last_name : "");
            return (
              <tr>
                <td>{position}</td>
                <td>{score}</td>
                <td>{name}</td>
              </tr>
            );
          }
        )
      );
    } catch {}
    try {
      await this.dialog.open();
    } catch {}
  }

  @listen_at("click", "#share")
  on_share() {
    TelegramGameProxy.shareScore();
  }
}

@customElement("game-content")
@shadow(
  <>
    <SizedContainer>
      <GameInstance id="instance" />
    </SizedContainer>
    <GameOver id="gameover" />
  </>
)
@css`
  :host {
    display: grid;
    width: 100%;
    height: 100%;
    place-items: center;
    background-color: #111;
  }
  #gameover {
    position: absolute;
  }
  #instance {
    height: var(--height);
    max-width: calc(var(--height));
    max-height: calc(var(--width));
    width: var(--width);
    background-color: var(--theme-color);
    box-shadow: 0 0 50px 10px rgba(255 255 255 / 5%);
  }
`
export class GameContent extends CustomHTMLElement {
  @id("gameover")
  gameover!: GameOver;
  @id("instance")
  instance!: GameInstance;
  @listen_host("gameover")
  show_gameover(e: CustomEvent<number>) {
    this.gameover.show(e.detail).then(() => {
      this.instance.blocked = false;
    });
  }
}
