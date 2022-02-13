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
  }

  #canvas {
    height: var(--height);
    min-width: calc(var(--height) / 3);
    max-width: calc(var(--height) * 2 / 3);
    width: var(--width);
    background: #000;
  }

  #diag {
    position: absolute;
    top: 50%;
    left: 50%;
    width: fit-content;
    transform: translate(-50%, -50%);
    color: var(--fgcolor);
    font-family: "kenvector future thin";
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

  @listen_host("pointerdown")
  on_touch() {
    if (document.fullscreenElement != this) {
      this.requestFullscreen({
        navigationUI: "hide",
      }).catch(() => {});
    }
  }

  @mount
  on_connected() {
    this.#monitor.observe(this.canvas);
  }

  @unmount
  on_disconnected() {
    this.#monitor.unobserve(this.canvas);
  }

  #update({ inlineSize, blockSize }: ResizeObserverSize) {
    this.diag.innerText = `width: ${inlineSize} height: ${blockSize}`;
  }
}
