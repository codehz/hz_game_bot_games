import type GameCanvas from "/js/canvas.js";
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
import type { BuilderUnion, PickByType, UpdateMapped } from "/js/tsutils.js";

export interface Vec2 {
  x: number;
  y: number;
}

export interface Components {
  floating_deg: number;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  opacity: number;
  side: "left" | "right";
  location: number;
  length: number;
  dying: string;
  text: string;
  font: string;
  style: string;
  scale: number;

  event_relocate_wall: true;
  event_hiding: true;

  animate: {
    target: Partial<PickByType<Components, number>>;
    step: number;
    on_end?: Trigger<void, Partial<TaggableComponents>>;
  };
}

export type TaggableComponents<S extends string = string> = Components &
  Taggable<S>;
export type TaggedComponents<S extends string = string> = Components &
  HasTag<S>;

export type OurEntity = EntityProxy<Components>;
export type OurWorld = World<Components, Resource>;

export interface Trigger<
  State = void,
  Inputs extends Partial<TaggableComponents> = Partial<TaggableComponents>
> {
  (this: State, source: Inputs): Generator<TriggerResult>;
}
export const Trigger = Object.freeze({
  global_event(name: string, ...payloads: any[]) {
    return { type: "glonal_event", name, payloads } as const;
  },
  spawn(template: Partial<TaggableComponents>) {
    return { type: "spawn", template } as const;
  },
  update(template: Partial<TaggableComponents>) {
    return { type: "update", template } as const;
  },
  update_by(updater: Partial<UpdateMapped<Components>>) {
    return { type: "update_by", updater } as const;
  },
  remove(...components: (keyof Partial<TaggableComponents>)[]) {
    return { type: "remove", components } as const;
  },
  action(action: (entity: OurEntity) => void) {
    return { type: "action", action } as const;
  },
});

export type TriggerResult = BuilderUnion<typeof Trigger>;

export function processTriggerResult(
  world: OurWorld,
  target: Partial<TaggableComponents>,
  result: TriggerResult
) {
  if (result.type == "spawn") {
    world.defer_add(result.template);
  } else if (result.type == "update") {
    world.defer_update(target, result.template);
  } else if (result.type == "update_by") {
    world.defer_update_by(target, result.updater);
  } else if (result.type == "remove") {
    world.defer_remove_components(target, ...result.components);
  } else if (result.type == "action") {
    world.defer(target, result.action);
  } else if (result.type == "glonal_event") {
    world.emit(result.name, ...result.payloads);
  }
}

export function processTrigger(
  world: OurWorld,
  target: Partial<TaggableComponents>,
  gen: Iterable<TriggerResult> | undefined
) {
  if (!gen) return;
  for (const result of gen) {
    processTriggerResult(world, target, result);
  }
}

export interface Resource {
  gravity: number;
  wall_width: number;
  
  event_trigger?: true;
}

export type SystemBuilder<
  I = void,
  P extends any[] = []
> = GenericSystemBuilder<Components, Resource, I, P>;

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

type TransformView<R extends Record<string, ViewKey<Components>[]>> = {
  [K in keyof R]: View<Components, R[K][number]>
};

export function makeSystems<
  R extends Record<string, ViewKey<Components>[]>,
  I = void,
  P extends any[] = []
>(
  interests: R,
  f: (
    this: World<Components, Resource>,
    views: TransformView<R>,
    input: I,
    ...params: P
  ) => void
): SystemBuilder<I, P> {
  return (world, ...params) => {
    const views = {} as TransformView<R>;
    // @ts-ignore
    for (const key in interests) views[key] = world.view(...interests[key]);
    return (input) => f.call(world, views, input, ...params);
  };
}
