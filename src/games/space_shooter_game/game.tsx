import jsx from "/js/jsx.js";
import {
  customElement,
  css,
  CustomHTMLElement,
  shadow,
  id,
  attach,
  listen_host,
  listen_closest,
  mount,
  unmount,
} from "/js/ce.js";
import GameCanvas from "/js/canvas.js";
import loading from "./loader.js";
import World from "/js/ecs.js";
import { Timer } from "/js/utils.js";
import { defaults, resource, createBulletSpawner } from "./types.js";
import * as rendering from "./render.js";
import * as logic from "./logic.js";
import * as spawner from "./spawner.js";
import { SizedContainer } from "/js/common.js";

const { sheet, atlas } = await loading;

@customElement("game-content")
@shadow(
  <SizedContainer>
    <GameCanvas id="canvas" />
  </SizedContainer>
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

  #canvas {
    height: var(--height);
    min-width: calc(var(--height) / 3);
    max-width: calc(var(--height) * 2 / 3);
    width: var(--width);
    overflow: none;
    background: #000;
  }
`
export class GameContent extends CustomHTMLElement {
  @id("canvas")
  canvas!: GameCanvas;

  #world = new World(defaults, resource);

  #player = this.#world.add(
    spawner.player(
      {
        life: 100,
        hitbox: { halfheight: 5, halfwidth: 3 },
        position: { x: 50, y: 100 },
        velocity: { x: 0, y: 0 },
        scale: 0.2,
        atlas: atlas.get("playerShip1_blue")!,
      },
      createBulletSpawner(new Timer(20), function ({ position: { x, y } }) {
        if (!this.next()) return;
        return spawner.bullet(
          {
            position: { x, y },
            velocity: { x: 0, y: -2 },
            scale: 0.2,
            atlas: atlas.get("laserBlue01")!,
            keep_alive: 100,
            damage: 50,
            team: "FRIENDLY",
            hitbox: { halfwidth: 0.5, halfheight: 3 },
          },
          {
            atlas: atlas.get("laserBlue08")!,
            scale: 0.2,
            keep_alive: 20,
          }
        );
      })
    )
  );
  #ghost = this.#world.add({
    tag_ghost: true,
    position: { x: 50, y: 100 },
    rotate: 0,
    scale: 0.2,
    opacity: 1,
    atlas: atlas.get("playerShip1_blue")!,
  });

  #move_player = logic.move_player(this.#world, this.#player, this.#ghost);
  #move_ghost = logic.move_ghost(this.#world, this.#ghost);
  #moving = logic.moving(this.#world);
  #keep_alive = logic.keep_alive(this.#world);
  #collision_detection = logic.collision_detection(this.#world);
  #spawn_bullets = logic.spawn_bullets(this.#world);
  #clean_range = logic.clean_range(this.#world);
  #clean_dying = logic.clean_dying(this.#world);
  #auto_rotate = logic.auto_rotate(this.#world);
  #rendering = rendering.sprite(this.#world, sheet);
  #debug_hitbox = rendering.debug_hitbox(this.#world);
  #life_view = this.#world.view("life");

  #offset?: { x: number; y: number };
  #current!: { x: number; y: number };
  // #ghost_target?: { x: number; y: number };

  #limit_player() {
    const { x, y } = this.#player.position!;
    if (x < 10) {
      this.#player.velocity!.x += 1;
    } else if (x > 90) {
      this.#player.velocity!.x -= 1;
    }
    if (y < 10) {
      this.#player.velocity!.y += 1;
    } else if (y > this.canvas.height - 10) {
      this.#player.velocity!.y -= 1;
    }
  }

  #enemy_timer = new Timer(100);
  #spawn_enemy() {
    if (!this.#enemy_timer.next()) return;
    this.#world.add(
      spawner.enemy(
        {
          hitbox: { halfwidth: 5, halfheight: 5 },
          life: 100,
          position: { x: Math.random() * 80 + 10, y: -10 },
          velocity: { x: 0, y: 0.5 },
          scale: 0.2,
          atlas: atlas.get("cockpitBlue_0")!,
        },
        createBulletSpawner(new Timer(40), function ({ position: { x, y } }) {
          if (!this.next()) return;
          return spawner.bullet(
            {
              position: { x, y },
              velocity: { x: 0, y: 1 },
              rotate: Math.PI,
              scale: 0.2,
              atlas: atlas.get("laserRed01")!,
              keep_alive: 500,
              team: "HOSTILE",
              hitbox: { halfwidth: 0.5, halfheight: 3 },
              damage: 10,
            },
            {
              scale: 0.2,
              atlas: atlas.get("laserRed08")!,
              keep_alive: 20,
            }
          );
        })
      )
    );
  }

  #clean_life() {
    this.#life_view
      .iter()
      .filter((o) => o.life <= 0)
      .forEach((o) => (this.#world.get(o)!.dying = "low life"));
  }

  @attach("prepare", "#canvas")
  on_prepare() {
    if (this.#offset && this.#current && this.#world.resource.ghost_target) {
      const [dx, dy] = [
        this.#current.x - this.#offset.x,
        this.#current.y - this.#offset.y,
      ];
      this.#offset = this.#current;
      this.#world.resource.ghost_target.x += dx;
      this.#world.resource.ghost_target.y += dy;
    }
    this.#world.resource.height_limit = this.canvas.height;

    this.#auto_rotate();
    this.#move_ghost();
    this.#move_player();
    this.#limit_player();
    this.#moving();
    this.#keep_alive();
    this.#clean_range();
    this.#collision_detection();
    this.#clean_life();
    this.#clean_dying();
    this.#spawn_bullets();
    this.#spawn_enemy();

    this.#world.sync();
  }

  @attach("frame", "#canvas")
  on_frame(ctx: CanvasRenderingContext2D) {
    this.#rendering(ctx);
    this.#debug_hitbox(ctx);

    ctx.fillStyle = "white";
    ctx.fillText("life: " + this.#player.life!, 0, 20);
  }

  #emit_altattack() {
    this.#world.add({
      position: { ...this.#player.position! },
      velocity: { x: 0, y: -0.5 },
      rotate: 0,
      auto_rotate: 0.05,
      opacity: 1,
      scale: 0.2,
      atlas: atlas.get("ufoBlue")!,
      keep_alive: 150,
      life: 500,
      team: "FRIENDLY",
      hitbox: { halfheight: 8, halfwidth: 8 },
      damage: 100,
      die_spawn: ({ position: { x, y } }) => ({
        position: { x, y },
        rotate: Math.random() * Math.PI * 2,
        scale: 0.5,
        opacity: 1,
        keep_alive: 50,
        life: 50,
        damage: 100,
        team: "FRIENDLY",
        hitbox: { halfheight: 10, halfwidth: 10 },
        atlas: atlas.get("laserBlue08")!,
      }),
      spawn_bullets: [0, 1, 2, 3]
        .map((x) => (x * Math.PI) / 2)
        .map((deg) =>
          createBulletSpawner(
            new Timer(4),
            function ({
              position,
              velocity: { x: vx, y: vy },
              rotate,
            }: {
              position: { x: number; y: number };
              velocity: { x: number; y: number };
              rotate: number;
            }) {
              if (!this.next()) return;
              return {
                position: { ...position },
                velocity: {
                  x: vx + Math.sin(rotate + deg) * 0.8,
                  y: vy + -Math.cos(rotate + deg) * 0.8,
                },
                rotate: rotate + deg,
                opacity: 1,
                scale: 0.15,
                atlas: atlas.get("laserBlue07")!,
                team: "FRIENDLY",
                hitbox: { halfwidth: 0.5, halfheight: 0.5 },
                damage: 20,
                die_spawn: ({
                  position: { x, y },
                }: {
                  position: { x: number; y: number };
                }) => ({
                  position: { x, y },
                  rotate: Math.random() * Math.PI * 2,
                  opacity: 1,
                  scale: 0.2,
                  atlas: atlas.get("laserBlue08")!,
                  keep_alive: 20,
                }),
              };
            }
          )
        ),
    });
  }

  @listen_closest("keypress", "body")
  on_keydown(e: KeyboardEvent) {
    if (e.code == "Space") {
      e.preventDefault();
      this.#emit_altattack();
    }
  }

  @listen_host("pointerdown")
  on_click({ x, y, isPrimary }: PointerEvent) {
    if (!isPrimary) {
      this.#emit_altattack();
      return;
    }
    const scale = this.canvas.scale;
    x /= scale;
    y /= scale;
    this.#current = this.#offset = { x, y };
    this.#ghost.position = { ...this.#player.position! };
    this.#ghost.opacity = 0.2;
    this.#world.resource.ghost_target = { ...this.#player.position! };
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

  @listen_host("pointerup")
  @listen_host("pointercancel")
  @listen_host("pointerout")
  on_cancel({ isPrimary }: PointerEvent) {
    if (!isPrimary) return;
    this.#offset = undefined;
  }

  #resize = () => {
    Object.assign(this.style, {
      width: `${window.innerWidth}px`,
      height: `${window.innerHeight}px`,
    });
  };

  @mount
  on_connected() {
    this.#resize();
    window.addEventListener("resize", this.#resize);
  }

  @unmount
  on_disconnected() {
    window.removeEventListener("resize", this.#resize);
  }
}
