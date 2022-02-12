import { AtlasDescriptor } from "/js/atlas.js";

export type Team = "NATURAL" | "FRIENDLY" | "HOSTILE";

export interface Spawner<
  State = void,
  Inputs extends Partial<Components> = PartialComponent<"position">
> {
  (this: State, source: Inputs): Partial<Components> | undefined;
}

export function createBulletSpawner<
  State,
  Input extends {
    position: { x: number; y: number };
  } & Partial<Components> = {
    position: { x: number; y: number };
  } & Partial<Components>
>(state: State, f: Spawner<State, Input>): Spawner<void> {
  return f.bind(state) as unknown as Spawner<void>;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface Components {
  tag_player: true;
  position: Vec2;
  ghost_position: Vec2;
  velocity: Vec2;
  atlas: AtlasDescriptor;
  rotate: number;
  auto_rotate: number;
  scale: number;
  opacity: number;
  team: Team;
  hitbox: { halfwidth: number; halfheight: number };
  life: number;
  damage: number;
  keep_alive: number;
  die_spawn: Spawner;
  spawn_bullets: Spawner[];
  dying: string;
}

export type PartialComponent<S extends keyof Components> = Pick<Components, S> &
  Partial<Components>;

export const defaults: Components = {
  tag_player: true,
  position: { x: 0, y: 0 },
  ghost_position: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  atlas: null as any,
  rotate: 0,
  auto_rotate: 0,
  scale: 0,
  opacity: 0,
  team: "NATURAL",
  hitbox: { halfwidth: 0, halfheight: 0 },
  life: 0,
  damage: 0,
  keep_alive: 0,
  die_spawn: null as any,
  spawn_bullets: [],
  dying: "unknown",
};
