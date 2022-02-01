export type Vector = [number, number];

export class mat3 implements Iterable<number> {
  readonly #value: readonly number[];
  constructor(arr: number[] = [1, 0, 0, 0, 1, 0, 0, 0, 1]) {
    this.#value = Object.freeze(arr);
  }
  [Symbol.iterator]() {
    return this.#value[Symbol.iterator]();
  }
  static translation(x: number, y: number) {
    // deno-fmt-ignore
    return new mat3([1, 0, 0, 0, 1, 0, x, y, 1]);
  }
  static scaling(sx: number, sy: number = sx) {
    // deno-fmt-ignore
    return new mat3([sx, 0, 0, 0, sy, 0, 0, 0, 1]);
  }
  static rotation(rot: number) {
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    // deno-fmt-ignore
    return new mat3([c, -s, 0, s, c, 0, 0, 0, 1]);
  }
  multiply(that: mat3): mat3 {
    const a00 = this.#value[0 * 3 + 0];
    const a01 = this.#value[0 * 3 + 1];
    const a02 = this.#value[0 * 3 + 2];
    const a10 = this.#value[1 * 3 + 0];
    const a11 = this.#value[1 * 3 + 1];
    const a12 = this.#value[1 * 3 + 2];
    const a20 = this.#value[2 * 3 + 0];
    const a21 = this.#value[2 * 3 + 1];
    const a22 = this.#value[2 * 3 + 2];
    const b00 = that.#value[0 * 3 + 0];
    const b01 = that.#value[0 * 3 + 1];
    const b02 = that.#value[0 * 3 + 2];
    const b10 = that.#value[1 * 3 + 0];
    const b11 = that.#value[1 * 3 + 1];
    const b12 = that.#value[1 * 3 + 2];
    const b20 = that.#value[2 * 3 + 0];
    const b21 = that.#value[2 * 3 + 1];
    const b22 = that.#value[2 * 3 + 2];
    return new mat3([
      b00 * a00 + b01 * a10 + b02 * a20,
      b00 * a01 + b01 * a11 + b02 * a21,
      b00 * a02 + b01 * a12 + b02 * a22,
      b10 * a00 + b11 * a10 + b12 * a20,
      b10 * a01 + b11 * a11 + b12 * a21,
      b10 * a02 + b11 * a12 + b12 * a22,
      b20 * a00 + b21 * a10 + b22 * a20,
      b20 * a01 + b21 * a11 + b22 * a21,
      b20 * a02 + b21 * a12 + b22 * a22,
    ]);
  }
  inverse() {
    const a00 = this.#value[0 * 3 + 0];
    const a01 = this.#value[0 * 3 + 1];
    const a02 = this.#value[0 * 3 + 2];
    const a10 = this.#value[1 * 3 + 0];
    const a11 = this.#value[1 * 3 + 1];
    const a12 = this.#value[1 * 3 + 2];
    const a20 = this.#value[2 * 3 + 0];
    const a21 = this.#value[2 * 3 + 1];
    const a22 = this.#value[2 * 3 + 2];
    // deno-fmt-ignore
    const det =
      a00 * (a11 * a22 - a21 * a12) -
      a01 * (a10 * a22 - a12 * a20) +
      a02 * (a10 * a21 - a11 * a20);
    const invdet = 1 / det;
    return new mat3([
      (a11 * a22 - a21 * a12) * invdet,
      (a02 * a21 - a01 * a22) * invdet,
      (a01 * a12 - a02 * a11) * invdet,
      (a12 * a20 - a10 * a22) * invdet,
      (a00 * a22 - a02 * a20) * invdet,
      (a10 * a02 - a00 * a12) * invdet,
      (a10 * a21 - a20 * a11) * invdet,
      (a20 * a01 - a00 * a21) * invdet,
      (a00 * a11 - a10 * a11) * invdet,
    ]);
  }
  transformPoint([x, y]: Vector): Vector {
    const a00 = this.#value[0 * 3 + 0];
    const a01 = this.#value[0 * 3 + 1];
    const a10 = this.#value[1 * 3 + 0];
    const a11 = this.#value[1 * 3 + 1];
    const a20 = this.#value[2 * 3 + 0];
    const a21 = this.#value[2 * 3 + 1];
    return [a00 * x + a10 * y + a20, a01 * x + a11 * y + a21];
  }
  dump() {
    return this.#value;
  }
  static create(...many: mat3[]): mat3 {
    return many.reduce((init, curr) => init.multiply(curr), new mat3());
  }
}
