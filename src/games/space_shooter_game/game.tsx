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
import { defaults, resource, withTriggerState, Trigger, Effect } from "./types.js";
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
        player_model: { color: "blue", shape: 1 },
      },
      withTriggerState(new Timer(20), function* ({ position }) {
        if (!this.next()) return;
        yield Trigger.spawn(
          spawner.bullet(
            {
              position: { ...position! },
              velocity: { x: 0, y: -2 },
              scale: 0.2,
              atlas: atlas.get("laserBlue01")!,
              keep_alive: 100,
              collision_effects: [Effect.damage(50)],
              team: "FRIENDLY",
              hitbox: { halfwidth: 0.5, halfheight: 3 },
            },
            {
              atlas: atlas.get("laserBlue08")!,
              scale: 0.2,
              keep_alive: 20,
            }
          )
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

  #spawn_children = logic.spawn_children(this.#world);
  #run_parent_trigger = logic.run_parent_trigger(this.#world);
  #cleanup_parent = logic.cleanup_parent(this.#world);
  #cleanup_children = logic.cleanup_children(this.#world);
  #attach_player_atlas = logic.attach_player_atlas(this.#world);
  #attach_player_overlay = logic.attach_player_overlay(this.#world);
  #set_player_overlay_based_on_health =
    logic.set_player_overlay_based_on_health(this.#world);
  #play_animate = logic.play_animate(this.#world);
  #start_crash_animate = logic.start_crash_animate(this.#world);
  #limit_player = logic.limit_player(this.#world, this.#player);
  #move_player = logic.move_player(this.#world, this.#player, this.#ghost);
  #move_ghost = logic.move_ghost(this.#world, this.#ghost);
  #moving = logic.moving(this.#world);
  #calc_rotate = logic.calc_rotate(this.#world);
  #keep_alive = logic.keep_alive(this.#world);
  #collision_detection = logic.collision_detection(this.#world);
  #clean_range = logic.clean_range(this.#world);
  #clean_dying = logic.clean_dying(this.#world);
  #auto_rotate = logic.auto_rotate(this.#world);
  #clean_lowlife = logic.clean_lowlife(this.#world);
  #tracking_player = logic.tracking_player(this.#world, this.#player);
  #random_walking = logic.random_walking(this.#world);
  #apply_effects = logic.apply_effects(this.#world);
  #rendering_sprite = rendering.sprite(this.#world, sheet);
  #rendering_bullet = rendering.bullet(this.#world, sheet);
  #draw_overlay = rendering.overlay(this.#world, sheet);
  #debug_hitbox = rendering.debug_hitbox(this.#world);
  #debug_entities = rendering.debug_entities(this.#world);
  #draw_helth = rendering.draw_health(this.#world, this.#player);

  #offset?: { x: number; y: number };
  #current!: { x: number; y: number };

  constructor() {
    super();

    this.#world.on("player_stopped", () => {
      this.#ghost.opacity = 0;
    });
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
          atlas: atlas.get("enemyBlack1")!,
          random_walking: {
            timeout: 50,
            timeout_initial: 100,
            rate: 1,
            edge: 10,
          },
        },
        withTriggerState(new Timer(40), function* ({ position }) {
          if (!this.next()) return;
          yield Trigger.spawn(
            spawner.bullet(
              {
                position: { ...position! },
                velocity: { x: 0, y: 1 },
                rotate: Math.PI,
                scale: 0.2,
                atlas: atlas.get("laserRed01")!,
                keep_alive: 500,
                team: "HOSTILE",
                hitbox: { halfwidth: 0.5, halfheight: 3 },
                collision_effects: [Effect.damage(10)],
                tracking_player: {
                  range: 100,
                  rate: 0.1,
                },
              },
              {
                scale: 0.2,
                atlas: atlas.get("laserRed08")!,
                keep_alive: 20,
              }
            )
          );
        })
      )
    );
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

    this.#spawn_children();
    this.#run_parent_trigger();
    this.#attach_player_atlas(atlas);
    this.#attach_player_overlay(atlas);
    this.#set_player_overlay_based_on_health();
    this.#play_animate();
    this.#start_crash_animate();
    this.#auto_rotate();
    this.#move_ghost();
    this.#move_player();
    this.#limit_player();
    this.#moving();
    this.#keep_alive();
    this.#clean_range();
    this.#collision_detection();
    this.#clean_lowlife();
    this.#cleanup_parent();
    this.#cleanup_children();
    this.#clean_dying();
    this.#spawn_enemy();
    this.#calc_rotate();
    this.#tracking_player();
    this.#random_walking();
    this.#apply_effects();

    this.#world.sync();
  }

  @attach("frame", "#canvas")
  on_frame(ctx: CanvasRenderingContext2D) {
    this.#rendering_bullet(ctx);
    this.#rendering_sprite(ctx);
    this.#draw_overlay(ctx);
    this.#debug_hitbox(ctx);
    this.#debug_entities(ctx);
    this.#draw_helth(ctx);
  }

  #emit_altattack() {
    this.#world.add(
      spawner.ufo(
        this.#player.position!,
        atlas.get("ufoBlue")!,
        atlas.get("laserBlue08")!,
        atlas.get("laserBlue07")!,
        atlas.get("laserBlue08")!
      )
    );
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
