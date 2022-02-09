import { AtlasDescriptor } from "/js/atlas.js";
import {
  attach,
  ClonableElement,
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
    width: 100%;
    height: 100%;
  }
  canvas {
    display: block;
  }
`
export class GameCanvas extends CustomHTMLElement {
  @select("canvas")
  canvas!: HTMLCanvasElement;

  ctx!: CanvasRenderingContext2D;

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

  @frame
  on_frame() {
    this.emit("prepare");
    this.ctx.resetTransform();
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.emit("frame", this.ctx);
  }
}

@customElement("simple-sprite")
export class SimpleSprite extends ClonableElement<{
  x: number;
  y: number;
  rotate?: number;
  scale?: number;
  atlas: AtlasDescriptor;
  image: ImageBitmap;
}> {
  @attach("frame", "<[canvas-context]")
  render(ctx: CanvasRenderingContext2D) {
    const { x, y, rotate = 0, scale = 1, atlas, image } = this.data;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotate);
    ctx.scale(scale, scale);
    ctx.translate(-atlas.width / 2, -atlas.height / 2);
    atlas.blit(ctx, image);
    ctx.restore();
  }
}
