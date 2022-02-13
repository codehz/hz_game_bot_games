export function EmitterMixin<T extends new (...args: any[]) => any>(Parent: T) {
  return class Emitter extends Parent {
    #handlers: Record<string, Function[]> = {};

    get [Symbol.toStringTag]() {
      return Parent.name;
    }

    on(event: string, handler: Function) {
      const handlers = this.#handlers[event] ?? [];
      this.#handlers[event] = [...handlers, handler];
    }

    off(event: string, handler: Function) {
      this.#handlers[event] = this.#handlers[event]!.filter(
        (x) => x != handler
      );
    }

    emit(event: string, ...args: any[]) {
      this.#handlers[event]?.forEach((handler) => handler.apply(this, args));
    }
  };
}

export default EmitterMixin(Object);
