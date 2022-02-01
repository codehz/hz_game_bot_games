import html, { css, defineCustomElement } from "/js/html.js";
import { AutoTimer, KeyboardBinding, NumberValue } from "/js/common.js";
import * as index from "/js/index.js";

const ver = new URL(import.meta.url).search.slice(1);

const friendvername = { v2: "加强版", inf: "无尽模式" }[ver] ?? "";
const specialrule =
  {
    v2: "增加可选长条滑块\n同时按住以获取时间奖励",
    inf: "无时间限制\n但是需要保持5秒内平均TPS\n标准将会逐渐提高",
  }[ver] ?? "";

class AudioLoader {
  audio: HTMLAudioElement;
  #promise: Promise<void>;
  constructor(name: string) {
    this.audio = new Audio();
    this.#promise = new Promise((resolve, reject) => {
      this.audio.addEventListener("error", reject);
      this.audio.addEventListener("canplay", () => resolve());
    });
    this.audio.preload = "auto";
    this.audio.src = `/assets/new_concept_music_game/${name}.mp3`;
    this.audio.load();
  }

  get handle() {
    return this.#promise;
  }

  play() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.audio.play();
  }
}

const effects = {
  end: new AudioLoader("effect_end"),
  err: new AudioLoader("effect_err"),
  tap: new AudioLoader("effect_tap"),
};

document.head.appendChild(css`
  @keyframes blink {
    0% {
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
  body {
    display: flex;
    width: 100vw;
    height: 100vh;
    justify-content: center;
    align-items: center;
  }
  #game-stage {
    width: 100vmin;
    height: 100vmin;
    overflow: hidden;
    position: relative;
  }
  #game-stage > .cells {
    will-change: transform;
    contain: layout;
    transform: translateY(calc((var(--distance) - 2) * 25vmin));
    transition: transform linear 0.1s;
  }
  #game-stage > .trackpad {
    align-items: center;
    justify-content: center;
    display: flex;
    position: absolute;
    inset: 0;
  }
  #game-stage > .trackpad > .track {
    flex: 1;
    height: 100%;
  }
  #game-stage > .trackpad > .track.highlight {
    background-color: #cc2307;
    animation: blink 1s ease 0s infinite;
  }
  #game-stage > .stat {
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: fixed;
    top: 10vmin;
    left: 50%;
    transform: translateX(-50%);
    width: fit-content;
    padding: 4px 8px;
    border-radius: 3px;
    background: #ffffffcc;
    border: 1px solid #b4b4b4;
    font-size: 150%;
    backdrop-filter: blur(20px);
  }
  #game-stage > .gameover {
    display: none;
    position: fixed;
    inset: 0;
    flex-direction: column;
    gap: 8px;
    font-size: 200%;
    align-items: center;
    justify-content: center;
    z-index: 1;
    background-image: radial-gradient(#000c 0.5px, transparent 0.5px),
      radial-gradient(#000c 0.5px, #fffc 0.5px);
    background-size: 20px 20px;
    background-position: 0 0, 10px 10px;
  }
  #game-stage > .gameover.show {
    display: flex;
  }
  #game-stage > .gameover > button {
    font-size: 80%;
    padding: 4px 10px;
  }
  #game-stage > .gameover > .highscores {
    font-size: 60%;
  }
  #game-stage > .gameover > .highscores:empty::before {
    content: "加载高分榜中";
  }
  game-cell {
    pointer-events: none;
    position: absolute;
    width: 25vmin;
    height: 25vmin;
    transform: translate(calc(var(--x) * 25vmin), calc(var(--y) * -25vmin));
    display: block;
    opacity: 1;
    transition: transform linear 0.1s, opacity ease 0.5s;
  }
  game-cell::before,
  game-cell::after {
    content: "";
    position: absolute;
    inset: 0;
  }
  game-cell::before {
    clip-path: polygon(
      15% 5%,
      5% 15%,
      5% 85%,
      15% 95%,
      85% 95%,
      95% 85%,
      95% 15%,
      85% 5%
    );
    background: #0001;
  }
  game-cell::after {
    will-change: transform;
    transition: all ease 0.5s;
    background-image: url("data:image/svg+xml,%3Csvg width='48' height='48' viewBox='0 0 48 48' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M41.42 7.309s3.885-1.515 3.56 2.164c-.107 1.515-1.078 6.818-1.834 12.553l-2.59 16.99s-.216 2.489-2.159 2.922c-1.942.432-4.856-1.515-5.396-1.948-.432-.325-8.094-5.195-10.792-7.575-.756-.65-1.62-1.948.108-3.463L33.648 18.13c1.295-1.298 2.59-4.328-2.806-.649l-15.11 10.28s-1.727 1.083-4.964.109l-7.016-2.165s-2.59-1.623 1.835-3.246c10.793-5.086 24.068-10.28 35.831-15.15z' fill='%23cc2307'/%3E%3C/svg%3E");
    background-size: 100%;
    background-position: center;
    background-repeat: no-repeat;
    transform: scale(0.4);
  }
  game-cell.hidden {
    opacity: 0;
    transform: translate(
      calc(var(--x) * 25vmin),
      calc((var(--distance) - 5) * -25vmin)
    );
  }
  game-cell.hidden::after {
    transform: scale(1);
  }
  .game-title {
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 10px;
  }
  .game-title > .text {
    position: relative;
    display: inline-flex;
    font-size: 200%;
    gap: 8px;
  }
  .game-title > .text > .ver:not(:empty) {
    position: absolute;
    font-size: 60%;
    padding: 2px 4px;
    border-radius: 4px;
    border: 2px solid black;
    background-color: white;
    right: -47px;
    top: -11px;
    transform: rotate(40deg);
  }
  .game-title > .description {
    text-align: center;
  }
  .game-title > .specialrule {
    display: inline-block;
    background-color: black;
    color: white;
    padding: 4px 8px;
    position: relative;
  }
  .game-title > .specialrule::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    border-top: 8px solid white;
    border-right: 8px solid black;
    width: 0;
  }
  .game-title > .specialrule::after {
    content: "";
    position: absolute;
    bottom: 0;
    right: 0;
    border-bottom: 8px solid white;
    border-left: 8px solid black;
    width: 0;
  }
  .game-title > button {
    padding: 4px 8px;
    font-size: 120%;
  }
  .game-title > .kbd-list {
    display: flex;
    gap: 8px;
  }
`);

class GameCell extends HTMLElement {
  #x: number;
  #y: number;
  #killed: boolean = false;
  constructor(x: number, y: number) {
    super();
    this.#x = x;
    this.#y = y;
    this.style.setProperty("--x", "" + x);
    this.style.setProperty("--y", "" + y);
    this.addEventListener("transitionend", () => {
      if (this.classList.contains("hidden")) {
        this.remove();
      }
    });
  }
  get y() {
    return this.#y;
  }
  get x() {
    return this.#x;
  }
  get killed() {
    return this.#killed;
  }
  kill() {
    if (!this.#killed) {
      this.#killed = true;
      this.classList.add("hidden");
    }
  }
}

customElements.define("game-cell", GameCell);

defineCustomElement("game-stage", () => {
  const highscores = html`<div class="highscores" />`;
  const restartbtn = html`<button>重新开始</button>`;
  const sharebtn = html`<button>分享排行</button>`;
  const gameover_show = html`<div class="gameover">
    <span>游戏结束</span>
    ${restartbtn}${sharebtn}${highscores}
  </div>`;
  let score = new NumberValue(0);
  let paused = true;
  let stopped = false;
  let distance = 1;

  restartbtn.addEventListener("click", () =>
    gameover_show.dispatchEvent(new CustomEvent("restart", { bubbles: true }))
  );
  sharebtn.addEventListener("click", () => TelegramGameProxy.shareScore());

  async function gameover() {
    stopped = true;
    gameover_show.classList.add("show");
    try {
      const list = await index.score(score.value);
      list.sort((a, b) => a.position - b.position);
      for (const {
        score: hs,
        user: { first_name, last_name },
      } of list.slice(0, 5)) {
        const name = first_name + (last_name ? " " + last_name : "");
        highscores.appendChild(html`<div>${hs} - ${name}</div>`);
      }
    } catch {
      alert("分数上传失败");
    }
  }

  let timer_show = new NumberValue(200, (value) => (value / 10).toFixed(1));
  let timer = new AutoTimer(() => {
    if (stopped || paused) return;
    timer_show.value--;
    if (timer_show.value == 0) {
      effects.end.play();
      gameover();
    }
  }, 100);

  const cells = html`<div class="cells" style="--distance: 0" />`;

  function click(track: number) {
    if (stopped) return;
    if (paused) timer.restart();
    paused = false;
    for (const e of [...cells.children] as GameCell[]) {
      if (e.x == track && e.y == distance - 5 && !e.killed) {
        e.kill();
        track = -1;
      }
    }
    if (track != -1) {
      effects.err.play();
      gameover();
      document
        .querySelector(`.track[data-x="${track}"]`)
        ?.classList.add("highlight");
      return;
    }
    effects.tap.play();
    score.value++;
    const x = (Math.random() * 4) | 0;
    cells.appendChild(new GameCell(x, distance++));
    cells.style.setProperty("--distance", "" + distance);
  }

  const bindings = new KeyboardBinding(({ type, code }) => {
    if (type == "keydown") {
      switch (code) {
        case "KeyD":
          click(0);
          break;
        case "KeyF":
          click(1);
          break;
        case "KeyJ":
          click(2);
          break;
        case "KeyK":
          click(3);
          break;
        case "Space":
        case "Enter":
          if (stopped) {
            restartbtn.click();
          }
      }
    }
  });

  const stage = html`<div id="game-stage">
    ${cells}
    <div class="trackpad">
      <div class="track" data-x="0" />
      <div class="track" data-x="1" />
      <div class="track" data-x="2" />
      <div class="track" data-x="3" />
    </div>
    <div class="stat">
      <div class="timer">时间：${timer_show}</div>
      <div class="score">分数：${score}</div>
    </div>
    ${gameover_show} ${bindings}${timer}
  </div>`;

  [...Array(5)].forEach(() => {
    const x = (Math.random() * 4) | 0;
    cells.appendChild(new GameCell(x, distance++));
  });

  cells.style.setProperty("--distance", "" + distance);

  stage.addEventListener("pointerdown", ({ target }) => {
    let track = +((target as HTMLElement).dataset?.x ?? -1);
    if (track == -1) return;
    click(track);
  });

  return stage;
});

defineCustomElement("game-title", () => {
  const button = html`<button>开始游戏</button>`;
  button.addEventListener("click", (e) => {
    e.preventDefault();
    button.dispatchEvent(new CustomEvent("start", { bubbles: true }));
  });

  const binding = new KeyboardBinding(({ code, type }) => {
    if ((code == "Enter" || code == "Space") && type == "keydown")
      button.click();
  });
  return html`<div class="game-title">
    <span class="text">
      ${"新概念音游".split("").map((x) => html`<span>${x}</span>`)}
      ${friendvername && html`<span class="ver">${friendvername}</span>`}
    </span>
    <span class="description">从最底下的开始<br />看你能得多少分</span>
    <span class="description">触摸或者键盘操作</span>
    <div class="kbd-list">
      ${"DFJK".split("").map((x) => html`<kbd>${x}</kbd>`)}
    </div>
    ${specialrule &&
    html`<span
      class="description specialrule"
      html=${specialrule.replace(/\n/g, "<br>")}
    />`}
    ${button}${binding}
  </div>`;
});

Promise.all(Object.values(effects).map((x) => x.handle)).then(() => {
  defineCustomElement("game-content", () => {
    const content = html`<div class="game-content"><game-title /></div>`;
    content.addEventListener("start", () => {
      while (content.firstChild) content.removeChild(content.firstChild);
      content.appendChild(html`<game-stage />`);
    });
    content.addEventListener("restart", () => {
      while (content.firstChild) content.removeChild(content.firstChild);
      content.appendChild(html`<game-title />`);
    });
    return content;
  });
});
