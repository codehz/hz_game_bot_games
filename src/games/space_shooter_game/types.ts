import type { AtlasDescriptor } from "/js/atlas.js";
import type {
  EntityProxy,
  GenericSystemBuilder,
  HasTag,
  Taggable,
  View,
  ViewKey,
} from "/js/ecs.js";
import type World from "/js/ecs.js";

export type Team = "NATURAL" | "FRIENDLY" | "HOSTILE";

export type TriggerResult =
  | {
      type: "spawn";
      template: Partial<TaggableComponents>;
    }
  | {
      type: "update";
      template: Partial<TaggableComponents>;
    }
  | { type: "remove"; components: keyof Partial<TaggableComponents> };

export interface Trigger<
  State = void,
  Inputs extends Partial<TaggableComponents> = PartialComponent<"position">
> {
  (this: State, source: Inputs): Generator<TriggerResult>;
}

export namespace Trigger {
  export function spawn(template: Partial<TaggableComponents>): TriggerResult {
    return { type: "spawn", template };
  }
  export function update(template: Partial<TaggableComponents>): TriggerResult {
    return { type: "update", template };
  }
  export function remove(
    components: keyof Partial<TaggableComponents>
  ): TriggerResult {
    return { type: "remove", components };
  }
}

export function withTriggerState<
  State,
  Input extends PartialComponent<"position"> = PartialComponent<"position">
>(state: State, f: Trigger<State, Input>): Trigger<void> {
  return f.bind(state) as unknown as Trigger<void>;
}

export function processTrigger(
  world: OurWorld,
  target: Partial<TaggableComponents>,
  gen: Generator<TriggerResult> | undefined
) {
  if (!gen) return;
  for (const item of gen) {
    if (item.type == "spawn") {
      world.defer_add(item.template);
    } else if (item.type == "update") {
      world.defer_update(target, item.template);
    } else if (item.type == "remove") {
      world.defer_remove_components(target, ...(item.components as any));
    }
  }
}

export interface Vec2 {
  x: number;
  y: number;
}

type PickByType<T, Value> = {
  [P in keyof T as T[P] extends Value ? P : never]: T[P];
};

export interface Components {
  position: Vec2;
  ghost_position: Vec2;
  velocity: Vec2;
  atlas: AtlasDescriptor;
  player_model: {
    shape: 1 | 2 | 3;
    color: "blue" | "green" | "orange";
  };
  overlay: {
    atlas: AtlasDescriptor;
    mode: GlobalCompositeOperation;
  };
  event_player_set_overlay: number;
  player_overlay: number;
  animate: {
    target: Partial<PickByType<Components, number>>;
    step: number;
    on_end?: Trigger<void, Partial<TaggableComponents>>;
  };
  event_crash: string;
  rotate: number;
  auto_rotate: number;
  scale: number;
  opacity: number;
  team: Team;
  hitbox: { halfwidth: number; halfheight: number };
  life: number;
  max_life: number;
  damage: number;
  keep_alive: number;
  die_trigger: Trigger;
  frame_trigger: Trigger[];
  dying: string;
}

export type PartialComponent<S extends keyof Components> = Pick<Components, S> &
  Partial<Components>;

export const defaults: Components = {
  position: { x: 0, y: 0 },
  ghost_position: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  atlas: null as any,
  overlay: null as any,
  player_model: {
    color: "green",
    shape: 1,
  },
  event_player_set_overlay: 1,
  player_overlay: 0,
  animate: {
    target: {},
    step: 0,
  },
  event_crash: "crash",
  rotate: 0,
  auto_rotate: 0,
  scale: 0,
  opacity: 0,
  team: "NATURAL",
  hitbox: { halfwidth: 0, halfheight: 0 },
  life: 0,
  max_life: 0,
  damage: 0,
  keep_alive: 0,
  die_trigger: null as any,
  frame_trigger: [],
  dying: "unknown",
};

export type Resource = {
  height_limit: number;
  ghost_target?: Vec2;
};

export const resource: Resource = {
  height_limit: 100,
};

export type TaggableComponents<S extends string = string> = Components &
  Taggable<S>;

export type TaggedComponents<S extends string = string> = Components &
  HasTag<S>;

export type OurEntity = EntityProxy<Components>;

export type OurWorld = World<Components, Resource>;

export type SystemBuilder<
  I = void,
  P extends any[] = []
> = GenericSystemBuilder<Components, Resource, I, P>;

export function makePureSystem<I = void, P extends any[] = []>(
  f: (this: World<Components, Resource>, input: I, ...params: P) => void
): SystemBuilder<I, P> {
  return (world, ...params) =>
    (input) =>
      f.call(world, input, ...params);
}

export function makeSystem<
  R extends ViewKey<Components>,
  I = void,
  P extends any[] = []
>(
  interests: R[],
  f: (
    this: World<Components, Resource>,
    view: View<Components, R>,
    input: I,
    ...params: P
  ) => void
): SystemBuilder<I, P> {
  return (world, ...params) => {
    const view = world.view(...interests);
    return (input) => f.call(world, view, input, ...params);
  };
}
