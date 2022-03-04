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
import type { PickByType } from "/js/tsutils.js";

export type Direction = {
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
};

export interface Components {
  x: number;
  y: number;
  axis: "x" | "y";
  track: number;
  position: number;
  speed: number;
  explode_step: number;

  shake: {
    direction: Direction;
    step: number;
  };

  animate: {
    target: Partial<PickByType<Components, number>>;
    step: number;
  };
}

export class MineMap {
  points: boolean[] = [];
  #size: number = 0;
  set size(value: number) {
    this.#size = value;
    const target = value * value;
    if (this.points.length != target)
      this.points = new Array(target).fill(false);
  }
  get size() {
    return this.#size;
  }

  constructor(size: number) {
    this.size = size;
  }

  #index(x: number, y: number) {
    const adj = (this.#size - 1) / 2;
    x += adj;
    y += adj;
    return x + this.#size * y;
  }

  get(x: number, y: number) {
    return this.points[this.#index(x, y)];
  }

  put(x: number, y: number) {
    this.points[this.#index(x, y)] = true;
  }

  clear() {
    this.points.fill(false);
  }

  *[Symbol.iterator]() {
    const adj = (this.#size - 1) / 2;
    let x = -adj;
    let y = -adj;
    for (const state of this.points) {
      if (state) yield { x, y } as const;
      if (++x > adj) {
        x = -adj;
        y++;
      }
    }
  }
}

export interface Resource {
  score: number;
  max_score: number;

  cell_size: number;
  grid_size: number;

  playermap: MineMap;
  ballmap: MineMap;
  bonusmap: MineMap;

  bonus_step: number;

  event_move?: Direction;
}

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
  [K in keyof R]: View<Components, R[K][number]>;
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

export function makePureSystem<I = void, P extends any[] = []>(
  f: (this: World<Components, Resource>, input: I, ...params: P) => void
): SystemBuilder<I, P> {
  return (world, ...params) =>
    (input) =>
      f.call(world, input, ...params);
}
