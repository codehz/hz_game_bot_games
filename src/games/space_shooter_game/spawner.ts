import {
  withTriggerState,
  PartialComponent,
  Trigger,
  Vec2,
  Effect,
  TaggedPartialComponents,
  Components,
  LootTable,
} from "./types.js";
import { AtlasDescriptor, TextureAtlas } from "/js/atlas.js";
import { range, Timer } from "/js/utils.js";

export function bullet<
  Bullet extends PartialComponent<
    | "position"
    | "velocity"
    | "hitbox"
    | "collision_effects"
    | "team"
    | "scale"
    | "atlas"
  >,
  DieSpawn extends PartialComponent<
    "keep_alive" | "scale" | "atlas"
  > = PartialComponent<"keep_alive" | "scale" | "atlas">
>(
  o: Bullet,
  die_spawn?: DieSpawn
): Bullet & TaggedPartialComponents<"opacity", "bullet"> {
  return {
    tag_bullet: true,
    opacity: 1,
    die_trigger: die_spawn
      ? function* ({ position }) {
          yield Trigger.spawn({
            opacity: 1,
            rotate: Math.random() * Math.PI * 2,
            position: { ...position! },
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
  ...weapons: Trigger[]
): T &
  TaggedPartialComponents<
    | "opacity"
    | "max_life"
    | "rotate"
    | "spawn_children"
    | "team"
    | "collision_effects"
    | "die_trigger"
    | "player_overlay",
    "player" | "crashable" | "collision_receiver"
  > {
  return {
    tag_collision_receiver: true,
    tag_player: true,
    tag_crashable: true,
    spawn_children: weapons.map((parent_trigger) => ({
      tag_weapon: true,
      parent_trigger,
    })),
    rotate: 0,
    opacity: 1,
    team: "FRIENDLY",
    collision_effects: [Effect.damage(player.life)],
    max_life: player.life,
    player_overlay: 0,
    *die_trigger() {
      yield Trigger.global_event("player_died");
    },
    ...player,
  };
}

export function enemy<
  T extends PartialComponent<"position" | "hitbox" | "life" | "scale">
>(
  enemy: T,
  ...weapons: Trigger[]
): T &
  TaggedPartialComponents<
    | "opacity"
    | "max_life"
    | "rotate"
    | "spawn_children"
    | "team"
    | "collision_effects",
    "enemy" | "crashable" | "collision_receiver"
  > {
  return {
    tag_collision_receiver: true,
    tag_enemy: true,
    tag_crashable: true,
    spawn_children: weapons.map((parent_trigger) => ({
      tag_weapon: true,
      parent_trigger,
    })),
    rotate: 0,
    opacity: 1,
    team: "HOSTILE",
    collision_effects: [Effect.sound("lose"), Effect.damage(enemy.life)],
    max_life: enemy.life,
    ...enemy,
  };
}

export function ufo(
  position: Vec2,
  ufoAtlas: AtlasDescriptor,
  bulletAtlas: AtlasDescriptor,
  bulletDieAtlas: AtlasDescriptor
): TaggedPartialComponents<
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
  | "collision_effects"
  | "spawn_children"
  | "tracking_player",
  "collision_receiver" | "crashable"
> {
  return {
    tag_collision_receiver: true,
    tag_crashable: true,
    position: structuredClone(position),
    velocity: { x: 0, y: -0.3 },
    rotate: Math.random() * Math.PI * 2,
    auto_rotate: 0.05,
    opacity: 1,
    scale: 0.2,
    atlas: ufoAtlas,
    keep_alive: 200,
    life: 500,
    team: "FRIENDLY",
    hitbox: { halfheight: 8, halfwidth: 8 },
    collision_effects: [Effect.damage(100)],
    tracking_player: {
      range: 100,
      rate: 0.2,
    },
    spawn_children: [...range(4)].map((i) => ({
      tag_weapon: true as const,
      *die_trigger({ position, rotate }) {
        for (let j = 0; j < 2; j++) {
          const deg = -((i * 2 + j) * Math.PI) / 4;
          const velocity = {
            x: Math.sin(rotate! + deg),
            y: -Math.cos(rotate! + deg),
          };
          yield Trigger.spawn(
            bullet({
              position: { ...position! },
              velocity,
              scale: 0.3,
              atlas: bulletAtlas,
              team: "FRIENDLY",
              hitbox: { halfwidth: 1, halfheight: 1 },
              collision_effects: [Effect.sound("laser2"), Effect.damage(100)],
              *die_trigger({ position }) {
                yield Trigger.spawn({
                  position: { ...position! },
                  rotate: Math.random() * Math.PI * 2,
                  opacity: 1,
                  scale: 0.2,
                  atlas: bulletDieAtlas,
                  keep_alive: 20,
                });
              },
            })
          );
        }
      },
      parent_trigger: withTriggerState(
        new Timer(8, i),
        function* ({ position, velocity, rotate }) {
          if (!this.next()) return;
          const { x: vx, y: vy } = velocity!;
          const deg = -(i * Math.PI) / 2;
          const vel = {
            x: vx + Math.sin(rotate! + deg) * 0.8,
            y: vy + -Math.cos(rotate! + deg) * 0.8,
          };
          yield Trigger.spawn(
            bullet({
              position: { ...position! },
              velocity: vel,
              scale: 0.2,
              atlas: bulletAtlas,
              team: "FRIENDLY",
              hitbox: { halfwidth: 0.5, halfheight: 0.5 },
              collision_effects: [Effect.sound("laser1"), Effect.damage(50)],
              *die_trigger({ position }) {
                yield Trigger.spawn({
                  position: { ...position! },
                  rotate: Math.random() * Math.PI * 2,
                  opacity: 1,
                  scale: 0.2,
                  atlas: bulletDieAtlas,
                  keep_alive: 20,
                });
              },
            })
          );
        }
      ),
    })),
  };
}
