import Emitter from "/js/emit.js";

export interface ViewLike {
  readonly interests: string[];
  add_component(obj: object, name?: string): void;
  remove_component(obj: object, name: string): void;
  remove(obj: object): void;
}

export type ViewKey<T> = (string & keyof T) | `-${string & keyof T}`;

type MixOptional<T, S extends ViewKey<T>> = Omit<
  Partial<T> & Pick<T, S extends keyof T ? S : never>,
  S extends `-${infer N}` ? N : never
>;

export class View<C extends Record<string, any>, R extends ViewKey<C>>
  implements ViewLike
{
  #required: string[] = [];
  #negative: string[] = [];
  #data: Set<MixOptional<C, R>> = new Set();

  constructor(...inputs: R[]) {
    for (const name of inputs)
      if (name.startsWith("-")) this.#negative.push(name.slice(1));
      else this.#required.push(name);
  }

  get interests() {
    return [...this.#required, ...this.#negative];
  }

  *[Symbol.iterator](): Generator<MixOptional<C, R>> {
    for (const item of this.#data) yield item;
  }

  #checked_add(obj: any) {
    if (
      this.#required.every((key) => key in obj) &&
      this.#negative.every((key) => !(key in obj))
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

type AutoProp<T extends Record<string, any>> = {
  readonly [K in `$${keyof T & string}`]: K extends `$${infer RK}`
    ? T[RK]
    : never;
};

export default class World<C extends Record<string, any>> extends Emitter {
  #template: C;
  #entities: Map<object, Partial<C> & AutoProp<C>> = new Map();
  #views: ViewLike[] = [];
  #view_index: {
    [key in keyof C]: ViewLike[];
  } = {} as any;
  #deferred: Function[] = [];

  constructor(template: C) {
    super();
    this.#template = template;
    for (const name in template) {
      this.#view_index[name] = [];
    }
  }

  #handler: ProxyHandler<object> = {
    getPrototypeOf: (target) => target,
    setPrototypeOf: () => false,
    get: (target, key) => {
      if (typeof key == "symbol") return undefined;
      if (key.startsWith("$")) {
        const rk = key.slice(1);
        if (rk in target) return Reflect.get(target, rk);
        const ret = structuredClone(this.#template[rk]);
        Reflect.set(target, rk, ret);
        for (const view of this.#view_index[rk]) view.add_component(target, rk);
        return ret;
      } else return Reflect.get(target, key);
    },
    set: (target, key, value) => {
      if (typeof key == "symbol") return false;
      if (key.startsWith("$")) throw new TypeError("readonly view");
      console.assert(value != null);
      const skipUpdate = key in target;
      Reflect.set(target, key, value);
      if (!skipUpdate)
        for (const view of this.#view_index[key])
          view.add_component(target, key);
      return true;
    },
    deleteProperty: (target, key) => {
      if (typeof key == "symbol") return false;
      if (key.startsWith("$")) throw new TypeError("readonly view");
      if (key in target) {
        Reflect.deleteProperty(target, key);
        for (const view of this.#view_index[key])
          view.remove_component(target, key);
        return true;
      }
      return false;
    },
  };

  add(obj: Partial<C> = Object.create(null)): Partial<C> & AutoProp<C> {
    Object.setPrototypeOf(obj, null);
    for (const key in obj) {
      for (const view of this.#views) view.add_component(obj);
    }
    const proxy = new Proxy(obj, this.#handler) as Partial<C> & AutoProp<C>;
    this.#entities.set(obj, proxy);
    return proxy;
  }

  defer_add(obj: Partial<C>) {
    this.#deferred.push(() => this.add(obj));
  }

  remove(obj: Partial<C>) {
    for (const view of this.#views) view.remove(obj);
    this.#entities.delete(obj);
  }

  defer_remove(obj: Partial<C>) {
    this.#deferred.push(() => this.remove(obj));
  }

  get(obj: object): (Partial<C> & AutoProp<C>) | undefined {
    return this.#entities.get(obj);
  }

  defer_add_component<K extends keyof C>(obj: object, key: K, value: C[K]) {
    if (key in obj) (obj as any)[key] = value;
    else {
      const cache = this.get(obj)!;
      console.assert(cache != null);
      this.#deferred.push(() => (cache[key] = value));
    }
  }

  defer_remove_component(obj: object, key: keyof C) {
    if (key in obj) {
      const cache = this.get(obj)!;
      console.assert(cache != null);
      this.#deferred.push(() => delete cache[key]);
    }
  }

  sync() {
    this.#deferred.splice(0).forEach((f) => f());
  }

  view<V extends ViewKey<C>>(...keys: V[]): View<C, V> {
    const ret = new View<C, V>(...keys);
    this.view_by(ret);
    return ret;
  }

  view_by(view: ViewLike) {
    this.#views.push(view);
    for (const key of view.interests) this.#view_index[key].push(view);
    for (const [ent] of this.#entities) view.add_component(ent as any);
  }

  remove_view(view: ViewLike) {
    const idx = this.#views.indexOf(view);
    if (idx != -1) {
      this.#views.splice(idx, 1);
      for (const key of view.interests) {
        const list = this.#view_index[key];
        const idx = list.indexOf(view);
        list.splice(idx, 1);
      }
    }
  }
}

export type System<I = void> = (input: I) => void;
export type GenericSystemBuilder<C, I = void, P extends any[] = []> = (
  world: World<C>,
  ...params: P
) => System<I>;
