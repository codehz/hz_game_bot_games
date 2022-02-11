class View<C extends Record<string, any>> {
  #required: string[];
  #list: Map<{}, C> = new Map();

  constructor(...keys: string[]) {
    this.#required = keys;
  }

  values() {
    return this.#list.values();
  }

  try_add(key: {}, fetcher: (key: string) => any) {
    const tmp: any = {};
    for (const required of this.#required) {
      const val = fetcher(required);
      if (!val) return;
      tmp[required] = val;
    }
    this.#list.set(key, tmp);
  }

  try_remove(key: {}, fetcher: (key: string) => any) {
    for (const required of this.#required) {
      const val = fetcher(required);
      if (!val) {
        this.#list.delete(key);
        return;
      }
    }
  }
}

export default class World<C extends Record<string, any>> {
  #storage: {
    [key in keyof C]: Map<{}, C[key]>;
  } = {} as any;
  #views: View<any>[] = [];
  #viewref: {
    [key in keyof C]: View<any>[];
  } = {} as any;

  constructor(...names: (keyof C)[]) {
    for (const name of names) {
      this.#storage[name as keyof C] = new Map();
      this.#viewref[name as keyof C] = [];
    }
  }

  #handler: ProxyHandler<{}> = {
    get: (target: {}, name: string) => this.#storage[name].get(target),
    deleteProperty: (target: {}, name: string) => {
      if (!this.#storage[name].delete(target)) return false;
      for (const ref of this.#viewref[name])
        ref.try_remove(target, (name) => this.#storage[name].get(target));
      return true;
    },
    defineProperty: () => false,
    getOwnPropertyDescriptor: () => undefined,
    getPrototypeOf: (target) => target,
    has: (target, name: string) => this.#storage[name].has(target),
    isExtensible: () => true,
    ownKeys: (target) =>
      Object.entries(this.#storage)
        .filter(([, map]) => map.has(target))
        .map(([name]) => name),
    preventExtensions: () => false,
    set: (target: {}, name: string, value: any) => {
      this.#storage[name].set(target, value);
      for (const ref of this.#viewref[name])
        ref.try_add(target, (name) => this.#storage[name].get(target));
      return true;
    },
    setPrototypeOf: () => false,
  };

  create(): Partial<C> {
    return new Proxy(Object.create(null), this.#handler);
  }

  remove(entity: Partial<C>) {
    const key = Object.getPrototypeOf(entity) as {};
    for (const [, map] of Object.entries(this.#storage)) {
      map.delete(key);
    }
    for (const view of this.#views) {
      view.try_remove(key, () => false);
    }
  }

  view<K extends keyof C>(...names: K[]): View<Pick<C, K>> {
    const ret = new View<Pick<C, K>>(...names as any);
    this.#views.push(ret);
    for (const name of names) {
      this.#viewref[name].push(ret);
    }
    return ret;
  }
}
