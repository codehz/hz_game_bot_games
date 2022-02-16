import {
  withTriggerState,
  PartialComponent,
  Trigger,
  TaggedComponents,
  Vec2,
} from "./types.js";
import { AtlasDescriptor } from "/js/atlas.js";
import { Timer } from "/js/utils.js";

export function bullet<
  Bullet extends PartialComponent<
    "position" | "velocity" | "hitbox" | "damage" | "team" | "scale" | "atlas"
  >,
  DieSpawn extends PartialComponent<
    "keep_alive" | "scale" | "atlas"
  > = PartialComponent<"keep_alive" | "scale" | "atlas">
>(
  o: Bullet,
  die_spawn?: DieSpawn
): Bullet &
  Pick<TaggedComponents<"bullet">, "opacity" | "rotate" | "tag_bullet"> {
  return {
    tag_bullet: true,
    opacity: 1,
    rotate: 0,
    die_trigger: die_spawn
      ? function* ({ position: { x, y } }) {
          yield Trigger.spawn({
            opacity: 1,
            rotate: Math.random() * Math.PI * 2,
            position: { x, y },
            ...die_spawn,
          });
        }
      : undefined,
    ...o,
  };
}

export function player<
  T extends PartialComponent<
    "position" | "hitbox" | "life" | "scale" | "player_model"
  >
>(
  player: T,
  frame_trigger: Trigger
): T &
  Pick<
    TaggedComponents<"player" | "crashable">,
    | "opacity"
    | "max_life"
    | "rotate"
    | "frame_trigger"
    | "team"
    | "damage"
    | "tag_player"
    | "player_overlay"
  > {
  return {
    tag_player: true,
    tag_crashable: true,
    frame_trigger,
    rotate: 0,
    opacity: 1,
    team: "FRIENDLY",
    damage: player.life,
    max_life: player.life,
    player_overlay: 0,
    ...player,
  };
}

export function enemy<
  T extends PartialComponent<"position" | "hitbox" | "life" | "scale">
>(
  enemy: T,
  frame_trigger: Trigger
): T &
  Pick<
    TaggedComponents<"enemy" | "crashable">,
    "opacity" | "max_life" | "rotate" | "frame_trigger" | "team" | "damage"
  > {
  return {
    tag_enemy: true,
    tag_crashable: true,
    frame_trigger,
    rotate: 0,
    opacity: 1,
    team: "HOSTILE",
    damage: enemy.life,
    max_life: enemy.life,
    ...enemy,
  };
}

export function ufo(
  position: Vec2,
  ufoAtlas: AtlasDescriptor,
  dieAtlas: AtlasDescriptor,
  bulletAtlas: AtlasDescriptor,
  bulletDieAtlas: AtlasDescriptor
): PartialComponent<
  | "position"
  | "velocity"
  | "rotate"
  | "auto_rotate"
  | "opacity"
  | "scale"
  | "atlas"
  | "keep_alive"
  | "life"
  | "team"
  | "hitbox"
  | "damage"
  | "die_trigger"
  | "frame_trigger"
> {
  return {
    position: structuredClone(position),
    velocity: { x: 0, y: -0.5 },
    rotate: 0,
    auto_rotate: 0.05,
    opacity: 1,
    scale: 0.2,
    atlas: ufoAtlas,
    keep_alive: 150,
    life: 500,
    team: "FRIENDLY",
    hitbox: { halfheight: 8, halfwidth: 8 },
    damage: 100,
    *die_trigger({ position: { x, y } }) {
      yield Trigger.spawn({
        position: { x, y },
        rotate: Math.random() * Math.PI * 2,
        scale: 0.5,
        opacity: 1,
        keep_alive: 50,
        life: 50,
        damage: 100,
        team: "FRIENDLY",
        hitbox: { halfheight: 10, halfwidth: 10 },
        atlas: dieAtlas,
      });
    },
    frame_trigger: withTriggerState(
      new Timer(4),
      function* ({ position, velocity, rotate }) {
        if (!this.next()) return;
        const { x: vx, y: vy } = velocity!;
        for (let i = 0; i < 4; i++) {
          const deg = (i * Math.PI) / 2;
          const vel = {
            x: vx + Math.sin(rotate! + deg) * 0.8,
            y: vy + -Math.cos(rotate! + deg) * 0.8,
          };
          const rot = Math.atan2(vel.x, -vel.y);
          yield Trigger.spawn({
            position: { ...position },
            velocity: vel,
            rotate: rot,
            opacity: 1,
            scale: 0.15,
            atlas: bulletAtlas,
            team: "FRIENDLY",
            hitbox: { halfwidth: 0.5, halfheight: 0.5 },
            damage: 20,
            *die_trigger({
              position: { x, y },
            }: {
              position: { x: number; y: number };
            }) {
              yield Trigger.spawn({
                position: { x, y },
                rotate: Math.random() * Math.PI * 2,
                opacity: 1,
                scale: 0.2,
                atlas: bulletDieAtlas,
                keep_alive: 20,
              });
            },
          });
        }
      }
    ),
  };
}
