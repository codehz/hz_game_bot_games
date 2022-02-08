import { css, customElement, CustomHTMLElement, mount, select, shadow } from "./ce.js";
import jsx from "./jsx.js";

@customElement("game-canvas")
@shadow(<canvas />)
@css`
  :host {
    display: block;
    overflow: hidden;
    width: 100%;
    height: 100%;
    position: relative;
  }
  canvas {
    display: block;
    position: absolute;
    inset: 0;
  }
`
export class GameCanvas extends CustomHTMLElement {
  @select("canvas")
  canvas!: HTMLCanvasElement;

  ctx!: CanvasRenderingContext2D

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
      Object.assign(this.canvas, { width, height });
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
}
