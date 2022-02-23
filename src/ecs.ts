import type { PickByType, UpdateMapped } from "/js/tsutils.js";
import Emitter from "/js/emit.js";

export interface ViewLike {
  readonly interests: string[];
  add_component(obj: object, name?: string): void;
  remove_component(obj: object, name: string): void;
  remove(obj: object): void;
}

export type ViewKey<T> =
  | ((string & keyof T) | `tag_${string}`)
  | `-${(string & keyof T) | `tag_${string}`}`;

export type ViewFilter<T> = (obj: T) => boolean;

export type MixOptional<T, S extends ViewKey<T>> = Omit<
  Taggable & Partial<T> & Pick<T, S extends keyof T ? S : never>,
  S extends `-${infer N}` ? N : never
>;

export class View<C extends Record<string, any>, R extends ViewKey<C>>
  implements ViewLike
{
  #required: string[] = [];
  #negative: string[] = [];
  #additional: ViewFilter<MixOptional<C, R>>[] = [];
  #data: Set<MixOptional<C, R>> = new Set();

  constructor(...inputs: (R | ViewFilter<MixOptional<C, R>>)[]) {
    for (const name of inputs)
      if (typeof name == "string") {
        if (name.startsWith("-")) this.#negative.push(name.slice(1));
        else this.#required.push(name);
      } else {
        this.#additional.push(name);
      }
  }

  get interests() {
    return [...this.#required, ...this.#negative];
  }

  *[Symbol.iterator](): Generator<MixOptional<C, R>> {
    for (const item of this.#data) yield item;
  }

  one(): MixOptional<C, R> | void {
    for (const item of this.#data) return item;
  }

  get size() {
    return this.#data.size;
  }

  #checked_add(obj: any) {
    if (
      this.#required.every((key) => key in obj) &&
      this.#negative.every((key) => !(key in obj)) &&
      this.#additional.every((f) => f(obj))
    )
      this.#data.add(obj);
  }

  add_component(obj: any, name?: string) {
    if (this.#data.has(obj)) {
      if (
        name
          ? this.#negative.includes(name)
          : this.#negative.some((key) => key in obj)
      )
        this.#data.delete(obj);
    } else this.#checked_add(obj);
  }

  remove_component(obj: any, name: string) {
    if (this.#data.has(obj)) {
      console.assert(this.#required.includes(name));
      this.#data.delete(obj);
    } else this.#checked_add(obj);
  }
  remove(obj: any) {
    this.#data.delete(obj);
  }
}

export type Taggable<S extends string = string> = {
  [key in `tag_${S}`]?: true;
};

export type HasTag<S extends string = string> = {
  [key in `tag_${S}`]: true;
};

function getRawObject<T extends object>(obj: T): T {
  let proto: any;
  while ((proto = Object.getPrototypeOf(obj)) != null) obj = proto;
  return obj;
}

export default class World<
  C extends Record<string, any>,
  R extends Record<string, any>
> extends Emitter {
  #resource: R;
  #entities: Map<object, EntityProxy<C>> = new Map();
  #views: ViewLike[] = [];
  #view_index: {
    [key in keyof C | `tag_${string}`]?: ViewLike[];
  } = {};
  #deferred: Function[] = [];

  constructor(resource: R) {
    super();
    this.#resource = structuredClone(resource);
  }

  get resource() {
    return this.#resource;
  }

  get entities() {
    return this.#entities.values();
  }

  get entitiesCount() {
    return this.#entities.size;
  }

  #index(key: keyof C | `tag_${string}`): ViewLike[] {
    return this.#view_index[key] ?? (this.#view_index[key] = []);
  }

  #handler: ProxyHandler<object> = {
    getPrototypeOf: (target) => target,
    setPrototypeOf() {
      throw new TypeError("misuse");
    },
    get: (target, key) => {
      if (typeof key == "symbol") return undefined;
      return Reflect.get(target, key);
    },
    set: (target, key, value) => {
      if (typeof key == "symbol") return false;
      console.assert(value != null);
      if (value == null) {
        if (key in target) {
          Reflect.deleteProperty(target, key);
          for (const view of this.#index(key))
            view.remove_component(target, key);
          return true;
        }
        return false;
      } else {
        const skipUpdate = key in target;
        Reflect.set(target, key, value);
        if (!skipUpdate)
          for (const view of this.#index(key)) view.add_component(target, key);
        return true;
      }
    },
    deleteProperty: (target, key) => {
      if (typeof key == "symbol") return false;
      if (key in target) {
        Reflect.deleteProperty(target, key);
        for (const view of this.#index(key)) view.remove_component(target, key);
        return true;
      }
      return false;
    },
  };

  add(obj: Partial<C> & Taggable = Object.create(null)): EntityProxy<C> {
    Object.setPrototypeOf(obj, null);
    for (const key in obj)
      for (const view of this.#views) view.add_component(obj);
    const proxy = new Proxy(obj, this.#handler) as EntityProxy<C>;
    this.#entities.set(obj, proxy);
    return proxy;
  }

  defer_add(obj: Partial<C> & Taggable): Promise<EntityProxy<C>> {
    return new Promise((resolve) =>
      this.#deferred.push(() => resolve(this.add(obj)))
    );
  }

  remove(obj: Partial<C>) {
    obj = getRawObject(obj);
    for (const view of this.#views) view.remove(obj);
    this.#entities.delete(obj);
  }

  defer_remove(obj: Partial<C>) {
    this.#deferred.push(() => this.remove(obj));
  }

  get(obj: object): EntityProxy<C> | undefined {
    obj = getRawObject(obj);
    return this.#entities.get(obj);
  }

  defer_add_component<K extends keyof C>(
    obj: object,
    key: `tag_${string}`,
    value: true
  ): void;
  defer_add_component<K extends keyof C>(
    obj: object,
    key: K,
    value: C[K]
  ): void;
  defer_add_component<K extends string & keyof C>(
    obj: object,
    key: K | `tag_${string}`,
    value: C[K]
  ): void {
    if (key in obj) (obj as any)[key] = value;
    else {
      const cache = this.get(obj)!;
      if (cache != null) this.#deferred.push(() => (cache[key] = value));
    }
  }

  defer_push_array<K extends keyof PickByType<C, any[]>>(
    obj: object,
    key: K,
    ...values: C[K] extends (infer V)[] ? V[] : never
  ) {
    if (values.length == 0) return;
    const cache = this.get(obj)!;
    if (cache != null)
      this.#deferred.push(() => {
        const orig = cache[key] ?? ([] as C[K]);
        // @ts-ignore
        cache[key] = [...orig, ...values];
      });
  }

  defer_filter_array<K extends keyof PickByType<C, any[]>>(
    obj: object,
    key: K,
    filter: C[K] extends (infer V)[] ? (target: V) => boolean : never
  ) {
    if (!(key in obj)) return;
    const cache = this.get(obj)!;
    if (cache != null)
      this.#deferred.push(() => {
        const orig = cache[key]!;
        // @ts-ignore
        cache[key] = orig.filter(filter);
      });
  }

  defer_update(obj: object, value: Partial<C> & Taggable) {
    const cache = this.get(obj)!;
    if (cache != null) this.#deferred.push(() => Object.assign(cache, value));
  }

  defer_update_by(obj: object, value: Partial<UpdateMapped<C>>) {
    const cache = this.get(obj)!;
    if (cache != null)
      this.#deferred.push(() => {
        for (const key in value) {
          // @ts-ignore
          if (key in cache) cache[key] = value[key](cache[key], cache);
        }
      });
  }

  defer_remove_component(
    obj: object,
    key: (string & keyof C) | `tag_${string}`
  ) {
    if (key in obj) {
      const cache = this.get(obj)!;
      if (cache != null) this.#deferred.push(() => delete cache[key]);
    }
  }

  defer_remove_components(
    obj: object,
    ...keys: ((string & keyof C) | `tag_${string}`)[]
  ) {
    keys = keys.filter((key) => key in obj);
    if (keys.length > 0) {
      const cache = this.get(obj)!;
      if (cache != null)
        this.#deferred.push(() => keys.forEach((key) => delete cache[key]));
    }
  }

  defer(obj: object, action: (entity: EntityProxy<C>) => void) {
    const cache = this.get(obj)!;
    if (cache != null) this.#deferred.push(() => action(cache));
  }

  sync() {
    this.#deferred.splice(0).forEach((f) => f());
  }

  view<V extends ViewKey<C>>(
    ...keys: (V | ViewFilter<MixOptional<C, V>>)[]
  ): View<C, V> {
    const ret = new View<C, V>(...keys);
    this.view_by(ret);
    return ret;
  }

  view_by(view: ViewLike) {
    this.#views.push(view);
    for (const key of view.interests) this.#index(key).push(view);
    for (const [ent] of this.#entities) view.add_component(ent as any);
  }

  remove_view(view: ViewLike) {
    const idx = this.#views.indexOf(view);
    if (idx != -1) {
      this.#views.splice(idx, 1);
      for (const key of view.interests) {
        const list = this.#index(key);
        const idx = list.indexOf(view);
        list.splice(idx, 1);
      }
    }
  }
}

export function excludeEntity(a: object) {
  return (b: object) => getRawObject(a) != getRawObject(b);
}

export type EntityProxy<C> = Partial<C> & Taggable;
export type System<I = void> = (input: I) => void;
export type GenericSystemBuilder<C, R, I = void, P extends any[] = []> = (
  world: World<C, R>,
  ...params: P
) => System<I>;
