import { AtlasDescriptor } from "/js/atlas.js";
import {
  attach,
  ClonableElement,
  ClonableElementWithChildren,
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
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // this.ctx.fillStyle = "black";
    // this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.emit("frame", this.ctx);
  }
}

@customElement("simple-sprite")
export class SimpleSprite extends ClonableElement<{
  x: number;
  y: number;
  opacity?: number;
  rotate?: number;
  scale?: number;
  atlas: AtlasDescriptor;
  image: ImageBitmap;
}> {
  @attach("frame", "<[canvas-context]")
  render(ctx: CanvasRenderingContext2D) {
    const {
      x,
      y,
      opacity = 1,
      rotate = 0,
      scale = 1,
      atlas,
      image,
    } = this.data;
    if (opacity <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotate);
    ctx.scale(scale, scale);
    ctx.translate(-atlas.width / 2, -atlas.height / 2);
    ctx.globalAlpha = opacity;
    atlas.blit(ctx, image);
    ctx.restore();
  }
}

@customElement("transform-context")
@tag("canvas-context")
export class TransformContext extends ClonableElementWithChildren<{
  x?: number;
  y?: number;
  rotate?: number;
  scale?: number;
}> {
  @attach("frame", "<[canvas-context]")
  wrap_frame(ctx: CanvasRenderingContext2D) {
    const { x = 0, y = 0, rotate, scale } = this.data;
    ctx.save();
    ctx.translate(x, y);
    if (rotate) ctx.rotate(rotate);
    if (scale) ctx.scale(scale, scale);
    this.emit("frame", ctx);
    ctx.restore();
  }
}
