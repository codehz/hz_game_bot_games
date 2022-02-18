import type { AtlasDescriptor } from "/js/atlas.js";
import type {
  EntityProxy,
  GenericSystemBuilder,
  HasTag,
  MixOptional,
  Taggable,
  View,
  ViewFilter,
  ViewKey,
} from "/js/ecs.js";
import type World from "/js/ecs.js";
import type { BuilderUnion, PickByType } from "/js/tsutils.js";

export type Team = "NATURAL" | "FRIENDLY" | "HOSTILE";

export interface Trigger<
  State = void,
  Inputs extends Partial<TaggableComponents> = Partial<TaggableComponents>
> {
  (this: State, source: Inputs): Generator<TriggerResult>;
}

export const Trigger = Object.freeze({
  spawn(template: Partial<TaggableComponents>) {
    return { type: "spawn", template } as const;
  },
  update(template: Partial<TaggableComponents>) {
    return { type: "update", template } as const;
  },
  remove(components: keyof Partial<TaggableComponents>) {
    return { type: "remove", components } as const;
  },
  action(action: (entity: OurEntity) => void) {
    return { type: "action", action } as const;
  },
  filter_children(
    filter: (obj: Partial<TaggableComponents>) => boolean,
    reason: string = "removed by trigger"
  ) {
    return { type: "filter_children", filter, reason } as const;
  },
  spawn_children(...templates: Omit<Partial<TaggableComponents>, "parent">[]) {
    return { type: "spawn_children", templates } as const;
  },
});

export type TriggerResult = BuilderUnion<typeof Trigger>;

export function withTriggerState<
  State,
  Input extends Partial<TaggableComponents> = Partial<TaggableComponents>
>(state: State, f: Trigger<State, Input>): Trigger<void, Input> {
  return f.bind(state) as unknown as Trigger<void, Input>;
}

export function processTriggerResult(
  world: OurWorld,
  target: Partial<TaggableComponents>,
  result: TriggerResult
) {
  if (result.type == "spawn") {
    world.defer_add(result.template);
  } else if (result.type == "update") {
    world.defer_update(target, result.template);
  } else if (result.type == "remove") {
    world.defer_remove_components(target, ...(result.components as any));
  } else if (result.type == "filter_children") {
    target.children
      ?.filter((child) => !result.filter(child))
      .forEach((child) =>
        world.defer_update(child, {
          dying: result.reason,
          position: target.position ?? { x: 0, y: 0 },
        })
      );
  } else if (result.type == "spawn_children") {
    world.defer_push_array(target, "spawn_children", ...result.templates);
  } else if (result.type == "action") {
    world.defer(target, result.action);
  }
}

export function processTrigger(
  world: OurWorld,
  target: Partial<TaggableComponents>,
  gen: Generator<TriggerResult> | undefined
) {
  if (!gen) return;
  for (const result of gen) {
    processTriggerResult(world, target, result);
  }
}

export const Effect = Object.freeze({
  damage(value: number) {
    return { type: "damage", value } as const;
  },
  trigger(trigger: TriggerResult) {
    return { type: "trigger", trigger } as const;
  },
});

export type Effect = BuilderUnion<typeof Effect>;

export interface EffectGenerator<
  State = void,
  Inputs extends Partial<TaggableComponents> = Partial<TaggableComponents>
> {
  (this: State, source: Inputs): Generator<Effect>;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface Components {
  parent: Partial<TaggableComponents>;
  parent_trigger: Trigger;
  children: Partial<TaggableComponents>[];
  spawn_children: Omit<Partial<TaggableComponents>, "parent">[];
  position: Vec2;
  ghost_position: Vec2;
  velocity: Vec2;
  velocity_limit: number;
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
  player_weapon: {
    count: number;
    damage: number;
    spread: number;
  };
  event_player_upgrade_weapon: "count" | "damage" | "spread" | "reset";
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
  keep_alive: number;
  die_trigger: Trigger;
  dying: string;
  tracking_player: {
    range: number;
    rate: number;
  };
  random_walking: {
    timeout: number;
    timeout_initial: number;
    rate: number;
    edge: number;
  };
  collision_filter: (input: Partial<TaggableComponents>) => boolean;
  collision_effects: Effect[] | EffectGenerator;
  effects: Effect[];
}

export type PartialComponent<S extends keyof Components> = Pick<Components, S> &
  Partial<Components>;

export const defaults: Components = {
  parent: null as any,
  parent_trigger: null as any,
  children: [],
  spawn_children: [],
  position: { x: 0, y: 0 },
  ghost_position: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  velocity_limit: 0,
  atlas: null as any,
  overlay: null as any,
  player_model: {
    color: "green",
    shape: 1,
  },
  event_player_set_overlay: 1,
  player_weapon: null as any,
  event_player_upgrade_weapon: null as any,
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
  keep_alive: 0,
  die_trigger: null as any,
  dying: "unknown",
  tracking_player: null as any,
  random_walking: {
    timeout: 0,
    timeout_initial: 0,
    rate: 0,
    edge: 0,
  },
  collision_filter: null as any,
  collision_effects: [],
  effects: [],
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

export type TaggedPartialComponents<
  S extends keyof Components = keyof Components,
  T extends string = string
> = PartialComponent<S> & HasTag<T>;

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
  interests: (R | ViewFilter<MixOptional<Components, R>>)[],
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
