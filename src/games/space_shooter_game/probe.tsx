import jsx from "/js/jsx.js";
import {
  customElement,
  css,
  CustomHTMLElement,
  shadow,
  id,
  mount,
  unmount,
  listen_host,
} from "/js/ce.js";
import { SizedContainer } from "/js/common.js";

@customElement("game-content")
@shadow(
  <SizedContainer>
    <div id="canvas" />
    <div id="diag" />
  </SizedContainer>
)
@css`
  :host {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100vw;
    height: 100vh;
    background: red;
    position: relative;
    font-family: "kenvector future thin";
  }

  #canvas {
    height: var(--height);
    min-width: calc(var(--height) / 3);
    max-width: calc(var(--height) * 2 / 3);
    width: var(--width);
    background: green;
    position: relative;
  }
  #canvas::before {
    content: "TOP LEFT";
    top: 0;
    left: 0;
  }
  #canvas::after {
    content: "BOTTOM RIGHT";
    bottom: 0;
    right: 0;
  }
  #canvas::before,#canvas::after {
    position: absolute;
    background: white;
    padding: 2px 4px;
    color: black;
  }

  #diag {
    position: absolute;
    top: 50%;
    left: 50%;
    width: fit-content;
    transform: translate(-50%, -50%);
    color: var(--fgcolor);
  }
`
export class GameContent extends CustomHTMLElement {
  @id("canvas")
  canvas!: HTMLDivElement;
  @id("diag")
  diag!: HTMLDivElement;

  #monitor = new ResizeObserver(
    ([
      {
        contentBoxSize: [size],
      },
    ]) => this.#update(size)
  );

  #resize = () => {
    Object.assign(this.style, {
      width: `${window.innerWidth}px`,
      height: `${window.innerHeight}px`,
    });
  };

  @mount
  on_connected() {
    this.#monitor.observe(this.canvas);
    this.#resize();
    window.addEventListener("resize", this.#resize);
  }

  @unmount
  on_disconnected() {
    this.#monitor.unobserve(this.canvas);
    window.removeEventListener("resize", this.#resize);
  }

  #update({ inlineSize, blockSize }: ResizeObserverSize) {
    this.diag.innerText = `width: ${inlineSize} height: ${blockSize}`;
  }
}
