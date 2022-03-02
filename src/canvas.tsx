import {
  css,
  customElement,
  CustomHTMLElement,
  frame,
  mount,
  prop,
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
    position: relative;
  }
  canvas {
    display: block;
    position: absolute;
    top: 0;
    left: 0;
  }
`
export default class GameCanvas extends CustomHTMLElement {
  @select("canvas")
  canvas!: HTMLCanvasElement;

  ctx!: CanvasRenderingContext2D;

  #alt: number = 0;
  #scale: number = 1;

  @prop("base")
  base!: string;

  private get axis() {
    return this.base == "height" ? "height" : "width";
  }

  get scale() {
    return this.#scale / devicePixelRatio;
  }

  get alt() {
    return this.#alt;
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
      this.#alt =
        this.axis == "width" ? (height / width) * 100 : (width / height) * 100;
      Object.assign(this.canvas, { width, height });
      this.#scale = (this.axis == "width" ? width : height) / 100;
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
