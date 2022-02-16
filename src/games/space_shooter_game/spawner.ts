import {
  createSpawner,
  PartialComponent,
  Spawner,
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
    die_spawn: die_spawn
      ? ({ position: { x, y } }) => ({
          opacity: 1,
          rotate: Math.random() * Math.PI * 2,
          position: { x, y },
          ...die_spawn,
        })
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
  ...spawn_bullets: Spawner[]
): T &
  Pick<
    TaggedComponents<"player">,
    | "opacity"
    | "max_life"
    | "rotate"
    | "spawn_bullets"
    | "team"
    | "damage"
    | "tag_player"
    | "player_overlay"
  > {
  return {
    tag_player: true,
    spawn_bullets,
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
  ...spawn_bullets: Spawner[]
): T &
  Pick<
    TaggedComponents<"enemy">,
    "opacity" | "max_life" | "rotate" | "spawn_bullets" | "team" | "damage"
  > {
  return {
    spawn_bullets,
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
  | "die_spawn"
  | "spawn_bullets"
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
      atlas: dieAtlas,
    }),
    spawn_bullets: [0, 1, 2, 3]
      .map((x) => (x * Math.PI) / 2)
      .map((deg) =>
        createSpawner(
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
            const vel = {
              x: vx + Math.sin(rotate + deg) * 0.8,
              y: vy + -Math.cos(rotate + deg) * 0.8,
            };
            const rot = Math.atan2(vel.x, -vel.y);
            return {
              position: { ...position },
              velocity: vel,
              rotate: rot,
              opacity: 1,
              scale: 0.15,
              atlas: bulletAtlas,
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
                atlas: bulletDieAtlas,
                keep_alive: 20,
              }),
            };
          }
        )
      ),
  };
}
