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
import { Timer } from "/js/utils.js";

const { sheet, atlas } = await loading;

type Team = "NATURAL" | "FRIENDLY" | "HOSTILE";

interface Spawner<State = void> {
  (
    this: State,
    position: { x: number; y: number },
    velocity: { x: number; y: number }
  ):
    | {
        position: {
          x: number;
          y: number;
        };
        velocity?: {
          x: number;
          y: number;
        };
        rotate: number;
        scale: number;
        opacity: number;
        atlas: AtlasDescriptor;
        team?: Team;
        hitbox?: { halfwidth: number; halfheight: number };
        life?: number;
        damage?: number;
        on_die?: Spawner;
      }
    | undefined;
}

function createBulletSpawner<State>(
  state: State,
  f: Spawner<State>
): Spawner<void> {
  return f.bind(state) as Spawner<void>;
}

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
    keep_alive: 0,
    spawn_bullets: [] as Array<Spawner>,
    team: "NATURAL" as Team,
    hitbox: { halfwidth: 10, halfheight: 10 },
    life: 100,
    damage: 100,
    dying: "",
    on_die: (() => undefined) as Spawner,
  });

  #moving_view = this.#world.view("position", "velocity");
  #bullet_view = this.#world.view("keep_alive");
  #collision_receive_view = this.#world.view(
    "position",
    "hitbox",
    "team",
    "life"
  );
  #collision_sender_view = this.#world.view(
    "position",
    "hitbox",
    "team",
    "damage"
  );
  #spawn_bullet_view = this.#world.view(
    "position",
    "velocity",
    "spawn_bullets"
  );
  #life_view = this.#world.view("life");
  #clean_range_view = this.#world.view("position", "velocity");
  #dying_view = this.#world.view("dying", "position", "velocity");
  #rendering = renderSprites({
    view: this.#world.view("position", "rotate", "scale", "opacity", "atlas"),
    image: sheet,
  });

  #player = this.#world.add({
    life: 100,
    damage: 100,
    team: "FRIENDLY",
    hitbox: { halfheight: 5, halfwidth: 5 },
    position: { x: 50, y: 100 },
    velocity: { x: 0, y: 0 },
    rotate: 0,
    scale: 0.2,
    opacity: 1,
    atlas: atlas.get("playerShip1_blue")!,
    spawn_bullets: [
      createBulletSpawner(new Timer(20), function ({ x, y }) {
        if (!this.next()) return;
        const velocity = { x: 0, y: -2 };
        return {
          position: { x, y },
          velocity,
          rotate: 0,
          opacity: 1,
          scale: 0.2,
          atlas: atlas.get("laserBlue01")!,
          keep_alive: 100,
          damage: 50,
          team: "FRIENDLY",
          hitbox: { halfwidth: 0, halfheight: 3 },
          on_die: ({ x, y }) => ({
            position: { x, y },
            rotate: Math.random() * Math.PI * 2,
            opacity: 1,
            scale: 0.2,
            atlas: atlas.get("laserBlue08")!,
            keep_alive: 20,
          }),
        };
      }),
    ],
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

  #kill_bullets() {
    this.#bullet_view
      .iter()
      .filter((obj) => obj.keep_alive-- <= 0)
      .toArray()
      .forEach((item) => this.#world.remove(item));
  }

  #spawn_bullets() {
    this.#spawn_bullet_view
      .iter()
      .flatMap(({ position, velocity, spawn_bullets }) =>
        spawn_bullets
          .map((info) => info(position, velocity)!)
          .filter((x) => x != null)
      )
      .toArray()
      .forEach((item) => this.#world.add(item));
  }

  #enemy_timer = new Timer(100);
  #spawn_enemy() {
    if (!this.#enemy_timer.next()) return;
    this.#world.add({
      hitbox: { halfwidth: 5, halfheight: 5 },
      team: "HOSTILE",
      damage: 100,
      life: 100,
      position: { x: Math.random() * 80 + 10, y: -10 },
      velocity: { x: 0, y: 0.5 },
      rotate: 0,
      opacity: 1,
      scale: 0.2,
      atlas: atlas.get("cockpitBlue_0")!,
      spawn_bullets: [
        createBulletSpawner(new Timer(40), function ({ x, y }) {
          if (!this.next()) return;
          const velocity = { x: 0, y: 1 };
          return {
            position: { x, y },
            velocity,
            rotate: Math.PI,
            opacity: 1,
            scale: 0.2,
            atlas: atlas.get("laserRed01")!,
            keep_alive: 500,
            team: "HOSTILE",
            hitbox: { halfwidth: 0, halfheight: 3 },
            damage: 10,
            on_die: ({ x, y }) => ({
              position: { x, y },
              rotate: Math.random() * Math.PI * 2,
              opacity: 1,
              scale: 0.2,
              atlas: atlas.get("laserRed08")!,
              keep_alive: 20,
            }),
          };
        }),
      ],
    });
  }

  #collision_detection() {
    for (const a of this.#collision_receive_view) {
      const {
        position: { x, y },
        hitbox: { halfwidth, halfheight },
      } = a;
      const [x_min, x_max] = [x - halfwidth, x + halfwidth];
      const [y_min, y_max] = [y - halfheight, y + halfheight];
      for (const b of this.#collision_sender_view) {
        const {
          position: { x, y },
          hitbox: { halfwidth, halfheight },
        } = b;
        if (a.team == b.team) continue;
        const [x_min2, x_max2] = [x - halfwidth, x + halfwidth];
        const [y_min2, y_max2] = [y - halfheight, y + halfheight];
        if (x_max < x_min2 || x_min > x_max2) continue;
        if (y_max < y_min2 || y_min > y_max2) continue;
        a.life -= b.damage;
        this.#world.get(b)!.dying = "self destructure";
      }
    }
  }

  #clean_life() {
    this.#life_view
      .iter()
      .filter((o) => o.life <= 0)
      .forEach((o) => (this.#world.get(o)!.dying = "low life"));
  }

  #clean_range() {
    this.#clean_range_view
      .iter()
      .filter(
        ({ position: { x, y }, velocity: { x: vx, y: vy } }) =>
          (x < -10 && vx <= 0) ||
          (x > 110 && vx >= 0) ||
          (y < -10 && vy <= 0) ||
          (y >= 160 && vy > 0)
      )
      .toArray()
      .forEach((o) => this.#world.remove(o));
  }

  #clean_dying() {
    const list = this.#dying_view.iter().toArray();
    list
      .map((o) => this.#world.get(o)!.on_die?.(o.position, o.velocity)!)
      .filter((o) => !!o)
      .forEach((o) => this.#world.add(o));
    list.forEach((o) => this.#world.remove(o));
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
    this.#kill_bullets();
    this.#clean_range();
    this.#collision_detection();
    this.#clean_life();
    this.#clean_dying();
    this.#spawn_bullets();
    this.#spawn_enemy();
  }

  @attach("frame", "#canvas")
  on_frame(ctx: CanvasRenderingContext2D) {
    this.#rendering(ctx);

    ctx.fillStyle = "white";
    ctx.fillText("life: " + this.#player.life!, 0, 20);
  }

  @listen_host("pointerup")
  @listen_host("pointercancel")
  @listen_host("pointerout")
  on_cancel({ isPrimary }: PointerEvent) {
    if (!isPrimary) return;
    this.#offset = undefined;
  }
}
