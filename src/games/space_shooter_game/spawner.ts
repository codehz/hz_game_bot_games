import { PartialComponent, Components, Spawner } from "./types.js";

export function bullet<
  T extends PartialComponent<
    "position" | "velocity" | "hitbox" | "damage" | "team" | "scale"
  >
>(o: T): T & Pick<Components, "opacity" | "rotate"> {
  return { opacity: 1, rotate: 0, ...o };
}

export function player<
  T extends PartialComponent<"position" | "hitbox" | "life" | "scale">
>(
  player: T,
  ...spawn_bullets: Spawner[]
): T &
  Pick<Components, "opacity" | "rotate" | "spawn_bullets" | "team" | "damage"> {
  return {
    spawn_bullets,
    rotate: 0,
    opacity: 1,
    team: "FRIENDLY",
    damage: player.life,
    ...player,
  };
}

export function enemy<
  T extends PartialComponent<"position" | "hitbox" | "life" | "scale">
>(
  player: T,
  ...spawn_bullets: Spawner[]
): T &
  Pick<Components, "opacity" | "rotate" | "spawn_bullets" | "team" | "damage"> {
  return {
    spawn_bullets,
    rotate: 0,
    opacity: 1,
    team: "HOSTILE",
    damage: player.life,
    ...player,
  };
}
