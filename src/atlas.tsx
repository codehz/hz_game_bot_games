import {
  css,
  customElement,
  CustomHTMLElement,
  frame,
  listen,
  mount,
  select,
  shadow,
} from "/js/ce.js";
import jsx from "/js/jsx.js";

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
      return { name, x, y, width, height };
    }
  }

  *list() {
    for (const e of this.document.querySelectorAll("SubTexture")) {
      const name = e.getAttribute("name")!.slice(0, -4);
      const x = +e.getAttribute("x")!;
      const y = +e.getAttribute("y")!;
      const width = +e.getAttribute("width")!;
      const height = +e.getAttribute("height")!;
      yield { name, x, y, width, height };
    }
  }
}

@customElement("atlas-viewer")
@css`
  :host,
  canvas {
    display: block;
  }
`
export class AtlasViewer extends CustomHTMLElement {
  @select("canvas")
  canvas!: HTMLCanvasElement;

  @select("select")
  list!: HTMLSelectElement;

  #image: HTMLImageElement;
  #atlas: TextureAtlas;

  constructor({
    image,
    atlas,
  }: {
    image: HTMLImageElement;
    atlas: TextureAtlas;
  }) {
    super();
    this.#image = image;
    this.#atlas = atlas;

    this.shadowTemplate = (
      <>
        <select>
          {[...this.#atlas.list()].map(({ name }) => (
            <option value={name}>{name}</option>
          ))}
        </select>
        <canvas />
      </>
    );
    // Object.assign(this.canvas, { width: image.width, height: image.height });
    // this.context.drawImage(image, 0, 0);
  }

  get selected() {
    return this.#atlas.get(this.list.value)!;
  }

  get context() {
    return this.canvas.getContext("2d")!;
  }

  @listen("change", "select")
  @mount
  on_select() {
    const { x, y, width, height } = this.selected;
    Object.assign(this.canvas, { width, height });
    this.context.drawImage(
      this.#image,
      x,
      y,
      width,
      height,
      0,
      0,
      width,
      height
    );
  }

  cloneNode(): Node {
    return new AtlasViewer({ image: this.#image, atlas: this.#atlas });
  }
}
