import {
  withTriggerState,
  PartialComponent,
  Trigger,
  Vec2,
  Effect,
  TaggedPartialComponents,
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
    collision_effects: [Effect.damage(enemy.life)],
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
              collision_effects: [Effect.damage(100)],
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
              collision_effects: [Effect.damage(50)],
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

export function powerup(
  position: Vec2,
  kind: "count" | "damage" | "spread",
  text_atlas: TextureAtlas
): TaggedPartialComponents<
  | "position"
  | "atlas"
  | "rotate"
  | "scale"
  | "opacity"
  | "velocity"
  | "team"
  | "hitbox"
  | "collision_filter"
  | "collision_effects"
  | "random_walking",
  "bonus"
> {
  let atlas: AtlasDescriptor;
  switch (kind) {
    case "count":
      atlas = text_atlas.get("powerupBlue_bolt")!;
      break;
    case "damage":
      atlas = text_atlas.get("powerupRed_bolt")!;
      break;
    case "spread":
      atlas = text_atlas.get("powerupGreen_bolt")!;
      break;
  }
  return {
    tag_bonus: true,
    position: { ...position },
    atlas,
    rotate: 0,
    scale: 0.2,
    opacity: 1,
    velocity: { x: 0, y: 0.2 },
    team: "NATURAL",
    hitbox: { halfwidth: 3, halfheight: 3 },
    collision_filter({ tag_player }) {
      return !!tag_player;
    },
    collision_effects: [
      Effect.trigger(Trigger.update({ event_player_upgrade_weapon: kind })),
    ],
    random_walking: {
      timeout: 50,
      timeout_initial: 100,
      rate: 0.5,
      edge: 5,
    },
  };
}
