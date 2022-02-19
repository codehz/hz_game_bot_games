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
  listen_external,
  listen_at,
  listen,
} from "/js/ce.js";
import GameCanvas from "/js/canvas.js";
import loading from "./loader.js";
import World from "/js/ecs.js";
import { randomSelect, Timer } from "/js/utils.js";
import {
  resource,
  withTriggerState,
  Trigger,
  Effect,
  Components,
  Resource,
  OurEntity,
} from "./types.js";
import * as rendering from "./render.js";
import * as logic from "./logic.js";
import * as spawner from "./spawner.js";
import {
  DialogForm,
  FieldSet,
  SizedContainer,
  StyledButton,
} from "/js/common.js";

const { assets, sheet, atlas } = await loading;

type GameState = "paused" | "playing" | "gameover";

@customElement("game-content-inner")
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
export class GameContentInner extends CustomHTMLElement {
  #state: GameState = "paused";

  @id("canvas")
  canvas!: GameCanvas;

  #world = new World<Components, Resource>(resource);

  #player = this.#world.add(
    spawner.player({
      life: 100,
      hitbox: { halfheight: 5, halfwidth: 3 },
      position: { x: 50, y: 100 },
      velocity: { x: 0, y: 0 },
      scale: 0.2,
      player_model: { color: "blue", shape: 1 },
      event_player_upgrade_weapon: "reset",
      player_weapon: {
        count: 1,
        damage: 1,
        spread: 1,
        stability: 1,
      },
    })
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
  #sync_player_weapon = logic.sync_player_weapon(this.#world, atlas);
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
  #apply_effects = logic.apply_effects(this.#world, assets);
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
    this.#world.on("player_died", () => {
      this.#state = "gameover";
      this.emit("gameover", 0);
    });
    queueMicrotask(() => {
      this.emit("setup_player", this.#player);
    });
  }

  #enemy_timer = new Timer(100);
  #spawn_enemy() {
    if (!this.#enemy_timer.next()) return;
    this.#world
      .defer_add(
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
                  collision_effects: [Effect.sound("lose"), Effect.damage(10)],
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
      )
      .then((o) => {
        if (Math.random() > 0.5) {
          o.die_trigger = function* ({ position }) {
            yield Trigger.spawn(
              spawner.powerup(
                position!,
                randomSelect(["count", "damage", "spread", "stability"]),
                atlas
              )
            );
          };
        }
      });
  }

  @attach("prepare", "#canvas")
  on_prepare() {
    if (this.#state != "playing") return;
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
    this.#sync_player_weapon();
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
    // this.#debug_hitbox(ctx);
    this.#debug_entities(ctx);
    this.#draw_helth(ctx);
  }

  #emit_altattack() {
    this.#world.add(
      spawner.ufo(
        this.#player.position!,
        atlas.get("ufoBlue")!,
        atlas.get("laserBlue07")!,
        atlas.get("laserBlue08")!
      )
    );
  }

  @listen_external("keydown", document.body)
  on_keydown(e: KeyboardEvent) {
    if (this.#state != "playing") return;
    if (e.code == "Space") {
      e.preventDefault();
      this.#emit_altattack();
    } else if (e.code == "Escape") {
      if (this.pause()) e.preventDefault();
    }
  }

  @listen_host("pointerdown")
  on_click({ x, y, isPrimary }: PointerEvent) {
    if (this.#state != "playing") return;
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

  @listen_external("resize", window)
  @mount
  on_resize() {
    Object.assign(this.style, {
      width: `${window.innerWidth}px`,
      height: `${window.innerHeight}px`,
    });
  }

  pause() {
    if (this.#state == "playing") {
      this.#state = "paused";
      this.emit("paused");
      return true;
    }
    return false;
  }

  resume() {
    if (this.#state == "paused") {
      this.#state = "playing";
      return true;
    }
    return false;
  }
}

@customElement("cheat-menu")
@shadow(
  <>
    <StyledButton id="open">Cheat menu</StyledButton>
    <DialogForm id="form" title="Cheat menu" type="form"></DialogForm>
  </>
)
@css`
  :host {
    font-family: "kenvector future thin";
    user-select: none;
  }

  .prop {
    display: flex;
    gap: 5px;
  }
  .prop::before {
    content: attr(data-key);
    width: 10em;
  }
  .value {
    width: 3em;
    text-align: center;
    background-color: #0002;
    border-radius: 10px;
  }
  .btn {
    cursor: pointer;
    display: flex;
    place-items: center;
    font-size: 80%;
    background: var(--fgcolor);
    color: var(--bgcolor);
    padding: 0 2px;
    border-radius: 10px;
  }
  .btn::before {
    content: attr(data-change);
  }
`
class CheatMenu extends CustomHTMLElement {
  @id("form")
  form!: DialogForm;

  player?: OurEntity;

  @listen_at("click", "#open")
  async open() {
    if (this.player?.player_weapon == null) return;
    try {
      this.form.replaceChildren(
        <FieldSet
          class="props"
          data-key="player_weapon"
          title="Weapon properities"
        >
          {Object.entries(this.player.player_weapon).map(([key, value]) => (
            <div class="prop" data-key={key}>
              <div class="btn" data-change="-1" />
              <div class="value">{value}</div>
              <div class="btn" data-change="+1" />
              <div class="btn" data-change="+10" />
            </div>
          ))}
        </FieldSet>
      );
      await this.form.open();
      for (const el of this.form.querySelectorAll("div.value")) {
        const value = +el.textContent!;
        const prop = el.parentElement!;
        const props = prop.parentElement!;
        const propkey = prop.dataset.key!;
        const rootkey = props.dataset.key!;
        // @ts-ignore
        this.player![rootkey][propkey] = value;
        this.player.event_player_upgrade_weapon = "reset";
      }
    } catch {}
  }

  @listen("click", ".btn")
  on_click_btn(e: PointerEvent) {
    const target = e.target as HTMLDivElement;
    const prop = target.parentElement!;
    const value = prop.querySelector(".value")!;
    const change = target.dataset.change!;
    value.textContent = "" + Math.max(0, +value.textContent! + +change);
  }
}

@customElement("game-content")
@shadow(
  <>
    <DialogForm id="paused_screen" type="dialog" title="游戏暂停">
      <CheatMenu id="cheat_menu" />
    </DialogForm>
    <DialogForm
      id="gameover_screen"
      type="dialog"
      title="游戏结束"
    ></DialogForm>
    <div id="pause_button" />
    <GameContentInner id="core" />
  </>
)
@css`
  #pause_button {
    position: fixed;
    top: 10px;
    right: 10px;
    width: 30px;
    height: 30px;
    display: flex;
    justify-content: center;
    gap: 2px;
    align-items: center;
    background: white;
    border-radius: 100%;
    box-shadow: 0 0 5px #0003;
  }

  #pause_button::before,
  #pause_button::after {
    content: "";
    height: 60%;
    width: 20%;
    background: black;
  }
`
export class GameContent extends CustomHTMLElement {
  @id("core")
  core!: GameContentInner;

  @id("paused_screen")
  paused_dialog!: DialogForm;

  @id("gameover_screen")
  gameover_dialog!: DialogForm;

  @id("cheat_menu")
  cheat_menu!: CheatMenu;

  @listen_external("visibilitychange", document)
  on_visibilitychange() {
    if (document.visibilityState == "hidden") {
      this.core.pause();
    }
  }

  @listen_at("click", "#pause_button")
  on_click_pause() {
    this.core.pause();
  }

  @mount
  @attach("paused", "#core")
  open_paused_dialog() {
    this.paused_dialog
      .open()
      .catch(() => {})
      .finally(() => this.core.resume());
  }

  @attach("gameover", "#core")
  open_gameover_dialog() {
    this.gameover_dialog
      .open()
      .catch(() => {})
      .finally(() => this.replaceWith(<game-content />));
  }

  @attach("setup_player", "#core")
  setup_player(player: OurEntity) {
    this.cheat_menu.player = player;
  }
}
