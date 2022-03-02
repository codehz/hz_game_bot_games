import jsx from "/js/jsx.js";
import World from "/js/ecs.js";
import GameCanvas from "/js/canvas.js";
import {
  customElement,
  CustomHTMLElement,
  shadow,
  css,
  attach,
  mount,
  id,
  listen_external,
  listen_host,
} from "/js/ce.js";
import { Components, Resource, Trigger } from "./types.js";
import * as render from "./render.js";
import * as logic from "./logic.js";
import { Sound } from "./sound.js";
import { DialogForm, StyledButton } from "/js/common.js";
import * as index from "/js/index.js";

@customElement("game-instance")
@shadow(<GameCanvas base="height" id="canvas" />)
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
  gameover = false;
  #score: number = 0;

  get score() {
    return this.#score;
  }

  set score(value: number) {
    this.#score = value;
    this.#score_element.text = "" + value;
    this.#score_element.tag_hidden = value > 0 ? undefined : true;
    this.#score_element.scale = 1.5;
    this.#score_element.animate = {
      step: 20,
      target: {
        scale: 1,
      },
    };
  }

  @id("canvas")
  canvas!: GameCanvas;

  #sound = new Sound();

  #world = new World<Components, Resource>({
    gravity: 0.1,
    wall_width: 2,
  });

  #score_element = this.#world.add({
    text: "0",
    font: "12px monospace",
    style: "white",
    opacity: 0.3,
    position: { x: 75, y: 50 },
    tag_hidden: true,
    scale: 1,
  });

  #tip = this.#world.add({
    tag_start: true,
    text: "press space to jump",
    font: "6px monospace",
    style: "white",
    opacity: 1,
    position: { x: 75, y: 30 },
    scale: 0,
    animate: {
      step: 20,
      target: {
        scale: 1,
      },
    },
  });

  #ball = this.#world.add({
    tag_ball: true,
    floating_deg: 0,
    position: { x: 75, y: 50 },
    velocity: { x: 0, y: 0 },
    radius: 2,
  });

  #gen_wall(side: "left" | "right") {
    return this.#world.add({
      tag_wall: true,
      side,
      location: 0.5,
      length: 30,
    });
  }

  #left = this.#gen_wall("left");
  #right = this.#gen_wall("right");

  #logic_floating = logic.floating(this.#world);
  #logic_gravity = logic.gravity(this.#world);
  #logic_moving = logic.moving(this.#world);
  #logic_relocate_wall = logic.relocate_wall(this.#world);
  #logic_hit_wall = logic.hit_wall(this.#world);
  #logic_hit_edge = logic.hit_edge(this.#world);
  #logic_dying_ghost = logic.dying_ghost(this.#world);
  #logic_cleanup_dying = logic.cleanup_dying(this.#world);
  #logic_ball_trigger = logic.ball_trigger(this.#world);
  #logic_hide_start = logic.hide_start(this.#world);
  #logic_detect_gameover = logic.detect_gameover(this.#world);
  #logic_animate = logic.animate(this.#world);
  #render_ball = render.ball(this.#world);
  #render_wall = render.wall(this.#world);
  #render_ghost = render.ghost(this.#world);
  #render_text = render.text(this.#world);

  constructor() {
    super();
    console.log("create");
    this.#world.on("score", (delta: number) => {
      this.score += delta;
      this.#sound.play(150, 150, 0.5);
    });
    this.#world.on("gameover", () => {
      this.dispatchEvent(
        new CustomEvent("gameover", {
          detail: this.score,
          bubbles: true,
          composed: true,
        })
      );
      this.gameover = true;
    });
  }

  @listen_external("keydown", document.body)
  on_keydown(e: KeyboardEvent) {
    if (this.gameover) return;
    if (e.repeat) return;
    if (e.code == "Space") {
      e.preventDefault();
      this.trigger();
    }
  }

  @listen_host("pointerdown")
  trigger() {
    if (this.gameover) return;
    this.#world.resource.event_trigger = true;
    this.#sound.play(150, 180, 0.5);
  }

  @attach("prepare", "#canvas")
  prepare() {
    this.#logic_floating();
    this.#logic_gravity();
    this.#logic_moving();
    this.#logic_relocate_wall();
    this.#logic_hit_wall();
    this.#logic_hit_edge();
    this.#logic_dying_ghost();
    this.#logic_cleanup_dying();
    this.#logic_ball_trigger();
    this.#logic_hide_start();
    if (!this.gameover) this.#logic_detect_gameover();
    this.#logic_animate();
    this.#world.sync();
    delete this.#world.resource.event_trigger;
  }
  @attach("frame", "#canvas")
  render(ctx: CanvasRenderingContext2D) {
    this.#render_ball(ctx);
    this.#render_wall(ctx);
    this.#render_ghost(ctx);
    this.#render_text(ctx);
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
  </DialogForm>
)
@css`
  :host {
    font-family: monospace;
  }
  #score {
    font-size: 20px;
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
}

@customElement("game-content")
@shadow(
  <>
    <details>
      <summary>Flappy Pong</summary>
      对经典游戏 Pong Game 和 Flappy Bird 的致敬，玩法：
      <ol>
        <li>点击画板以开始游戏。</li>
        <li>每次点击将会使得小球跳跃。</li>
        <li>和你想象一样，球拍会击打小球使得其向反方向运动。</li>
        <li>尝试让小球保持在屏幕中。</li>
      </ol>
      创意来自
      <a href="https://www.lessmilk.com/almost-pong/" target="_blank">
        Lessmilk
      </a>
    </details>
    <GameInstance id="instance" />
    <GameOver id="gameover" />
  </>
)
@css`
  :host {
    font-family: monospace;
    display: grid;
    place-content: center;
    width: 100vw;
    height: 100vh;
    gap: 10px;
    user-select: none;
    overflow: hidden;
  }
  a {
    padding: 0.5em;
  }
  #instance {
    max-width: 600px;
    width: 100vw;
    aspect-ratio: 3/2;
    border: solid 2px white;
  }

  @media (min-aspect-ratio: 3/2) {
    :host {
      grid-template-columns: max-content max-content;
    }

    details {
      width: 20vw;
    }

    #instance {
      max-width: unset;
      width: unset;
      height: 100vh;
      max-height: 400px;
    }
  }
`
export class GameContent extends CustomHTMLElement {
  @id("gameover")
  gameover!: GameOver;
  @listen_host("gameover")
  show_gameover({ detail: score }: CustomEvent<number>) {
    this.gameover.show(score).then(() => {
      this.shadowRoot!.getElementById("instance")!.replaceWith(
        <GameInstance id="instance" />
      );
    });
  }
}
