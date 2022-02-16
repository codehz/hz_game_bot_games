import type { PartialComponent, Spawner, TaggedComponents } from "./types.js";

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
  T extends PartialComponent<"position" | "hitbox" | "life" | "scale">
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
  > {
  return {
    tag_player: true,
    spawn_bullets,
    rotate: 0,
    opacity: 1,
    team: "FRIENDLY",
    damage: player.life,
    max_life: player.life,
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
