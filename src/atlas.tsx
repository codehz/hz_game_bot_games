import {
  css,
  customElement,
  CustomHTMLElement,
  select,
} from "/js/ce.js";
import jsx from "/js/jsx.js";

export class AtlasDescriptor {
  constructor(
    public name: string,
    public x: number,
    public y: number,
    public width: number,
    public height: number
  ) {}

  blit(ctx: CanvasRenderingContext2D, image: ImageBitmap, x = 0, y = 0) {
    ctx.drawImage(
      image,
      this.x,
      this.y,
      this.width,
      this.height,
      x,
      y,
      this.width,
      this.height
    );
  }
}

export class TextureAtlas {
  constructor(public document: Document) {}

  get(name: string) {
    const e = this.document.querySelector(
      `SubTexture[name="${name}.png"]`
    ) as Element;
    if (e) {
      const x = +e.getAttribute("x")!;
      const y = +e.getAttribute("y")!;
      const width = +e.getAttribute("width")!;
      const height = +e.getAttribute("height")!;
      return new AtlasDescriptor(name, x, y, width, height);
    }
  }

  *list(): Generator<AtlasDescriptor> {
    for (const e of this.document.querySelectorAll("SubTexture")) {
      const name = e.getAttribute("name")!.slice(0, -4);
      const x = +e.getAttribute("x")!;
      const y = +e.getAttribute("y")!;
      const width = +e.getAttribute("width")!;
      const height = +e.getAttribute("height")!;
      yield new AtlasDescriptor(name, x, y, width, height);
    }
  }
}

@customElement("atlas-preview")
@css`
  :host {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    position: relative;
  }
  canvas {
    display: block;
    margin: auto;
  }
  output {
    user-select: all;
    font-size: 12px;
    display: block;
    color: white;
    padding: 2px 8px;
    border-radius: 100px;
    font-family: "kenvector future thin";
  }

  .dim {
    opacity: 0;
    font-size: 9px;
    position: absolute;
    bottom: 20px;
    left: 50%;
    width: max-content;
    background: #0007;
    transform: translateX(-50%);
    user-select: none;
    transition: all ease 0.2s;
  }

  :host(:hover) .dim {
    opacity: 1;
  }
`
class AtlasPreview extends CustomHTMLElement {
  @select("canvas")
  canvas!: HTMLCanvasElement;

  constructor(data: { image: ImageBitmap; attr: AtlasDescriptor }) {
    super();
    const { image, attr } = data;
    const { name, width, height } = attr;

    this.shadowTemplate = (
      <>
        <canvas />
        <output>{name}</output>
        <output class="dim">
          {width}, {height}
        </output>
      </>
    );
    Object.assign(this.canvas, { width, height });
    const context = this.canvas.getContext("2d")!;
    attr.blit(context, image);
  }

  cloneNode(): Node {
    throw new Error("not allowed");
  }
}

@customElement("atlas-viewer")
@css`
  :host {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    background-color: #000000;
    opacity: 1;
    background-image: linear-gradient(#2c2c2c 2.2px, transparent 2.2px),
      linear-gradient(90deg, #2c2c2c 2.2px, transparent 2.2px),
      linear-gradient(#2c2c2c 1.1px, transparent 1.1px),
      linear-gradient(90deg, #2c2c2c 1.1px, #000000 1.1px);
    background-size: 55px 55px, 55px 55px, 11px 11px, 11px 11px;
    background-position: -2.2px -2.2px, -2.2px -2.2px, -1.1px -1.1px,
      -1.1px -1.1px;
    background-attachment: fixed;
  }
`
export class AtlasViewer extends CustomHTMLElement {
  #image: ImageBitmap;
  #atlas: TextureAtlas;

  constructor({ image, atlas }: { image: ImageBitmap; atlas: TextureAtlas }) {
    super();
    this.#image = image;
    this.#atlas = atlas;

    this.shadowTemplate = (
      <>
        {[...this.#atlas.list()].map((attr) => (
          <AtlasPreview image={image} attr={attr} />
        ))}
      </>
    );
  }

  cloneNode(): Node {
    return new AtlasViewer({ image: this.#image, atlas: this.#atlas });
  }
}
