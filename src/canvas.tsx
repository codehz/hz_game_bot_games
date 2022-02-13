import {
  css,
  customElement,
  CustomHTMLElement,
  frame,
  mount,
  select,
  shadow,
  tag,
} from "/js/ce.js";
import jsx from "/js/jsx.js";

@customElement("game-canvas")
@tag("canvas-context")
@shadow(<canvas />)
@css`
  :host {
    display: block;
  }
  canvas {
    display: block;
  }
`
export default class GameCanvas extends CustomHTMLElement {
  @select("canvas")
  canvas!: HTMLCanvasElement;

  ctx!: CanvasRenderingContext2D;

  #height: number = 0;
  #scale: number = 1;

  get scale() {
    return this.#scale / devicePixelRatio;
  }

  get height() {
    return this.#height;
  }

  #resizeObserver = new ResizeObserver(
    ([
      {
        contentBoxSize: [{ blockSize: rheight, inlineSize: rwidth }],
        devicePixelContentBoxSize: [
          {
            blockSize: height = (rheight * devicePixelRatio) | 0,
            inlineSize: width = (rwidth * devicePixelRatio) | 0,
          } = {},
        ] = [],
      },
    ]) => {
      Object.assign(this.canvas.style, {
        width: `${rwidth}px`,
        height: `${rheight}px`,
      });
      this.#height = height / width * 100;
      Object.assign(this.canvas, { width, height });
      this.#scale = width / 100;
    }
  );

  constructor() {
    super();
    this.#resizeObserver.observe(this);
  }

  @mount
  initContext() {
    this.ctx = this.canvas.getContext("2d")!;
  }

  @frame
  on_frame() {
    this.emit("prepare");
    this.ctx.resetTransform();
    this.ctx.scale(this.#scale, this.#scale);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.emit("frame", this.ctx);
  }
}
