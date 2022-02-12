export interface ViewLike {
  readonly interests: string[];
  try_add(obj: object): void;
  remove(obj: object): void;
}

type MixOptional<T, S extends keyof T> = Partial<T> & Pick<T, S>;

export class View<C extends Record<string, any>, R extends keyof C>
  implements ViewLike
{
  #required: string[];
  #data: Set<MixOptional<C, R>> = new Set();

  constructor(...required: string[]) {
    this.#required = required;
  }

  get interests(): string[] {
    return this.#required;
  }

  *[Symbol.iterator](): Generator<MixOptional<C, R>> {
    for (const item of this.#data) {
      yield item;
    }
  }

  try_add(obj: MixOptional<C, R>) {
    if (this.#data.has(obj)) return;
    if (this.#required.every((key) => key in obj)) {
      this.#data.add(obj);
    }
  }

  remove(obj: Partial<C>) {
    this.#data.delete(obj as any);
  }
}

type AutoProp<T extends Record<string, any>> = {
  readonly [K in `$${keyof T & string}`]: K extends `$${infer RK}`
    ? T[RK]
    : never;
};

export default class World<C extends Record<string, any>> {
  #template: C;
  #entities: Map<object, Partial<C> & AutoProp<C>> = new Map();
  #views: ViewLike[] = [];
  #viewref: {
    [key in keyof C]: ViewLike[];
  } = {} as any;

  constructor(template: C) {
    this.#template = template;
    for (const name in template) this.#viewref[name] = [];
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
        for (const view of this.#viewref[rk]) view.try_add(target);
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
        for (const view of this.#viewref[key]) view.try_add(target);
      return true;
    },
    deleteProperty: (target, key) => {
      if (typeof key == "symbol") return false;
      if (key.startsWith("$")) throw new TypeError("readonly view");
      if (key in target) {
        Reflect.deleteProperty(target, key);
        for (const view of this.#viewref[key]) view.remove(target);
        return true;
      }
      return false;
    },
  };

  add(obj: Partial<C> = Object.create(null)): Partial<C> & AutoProp<C> {
    Object.setPrototypeOf(obj, null);
    for (const key in obj)
      for (const view of this.#viewref[key]) view.try_add(obj);
    const proxy = new Proxy(obj, this.#handler) as Partial<C> & AutoProp<C>;
    this.#entities.set(obj, proxy);
    return proxy;
  }

  remove(obj: Partial<C>) {
    for (const view of this.#views) view.remove(obj);
    this.#entities.delete(obj);
  }

  get(obj: object): (Partial<C> & AutoProp<C>) | undefined {
    return this.#entities.get(obj);
  }

  view<V extends string & keyof C>(...keys: V[]): View<C, V> {
    const ret = new View<C, V>(...keys);
    this.view_by(ret);
    return ret;
  }

  view_by(view: ViewLike) {
    this.#views.push(view);
    for (const key of view.interests) this.#viewref[key].push(view);
    for (const [ent] of this.#entities) view.try_add(ent as any);
  }

  remove_view(view: ViewLike) {
    const idx = this.#views.indexOf(view);
    if (idx != -1) {
      this.#views.splice(idx, 1);
      for (const key of view.interests) {
        const list = this.#viewref[key];
        const idx = list.indexOf(view);
        list.splice(idx, 1);
      }
    }
  }
}
