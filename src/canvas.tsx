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
  select,
  shadow,
  tag,
} from "/js/ce.js";
import jsx from "/js/jsx.js";
import type { View } from "/js/ecs.js";

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

  #scale: number = 1;

  get scale() {
    return this.#scale / devicePixelRatio;
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

export function renderSprites<
  V extends {
    position: { x: number; y: number };
    rotate: number;
    scale: number;
    opacity: number;
    atlas: AtlasDescriptor;
  }
>({
  view,
  image,
}: {
  view: View<V>;
  image: ImageBitmap;
}) {
  return (ctx: CanvasRenderingContext2D) => {
    for (const {
      atlas,
      position: { x, y },
      rotate,
      scale,
      opacity,
    } of view) {
      const { width, height } = atlas;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotate);
      ctx.scale(scale, scale);
      ctx.translate(-width / 2, -height / 2);
      ctx.globalAlpha = opacity;
      atlas.blit(ctx, image);
      ctx.restore();
    }
  };
}
