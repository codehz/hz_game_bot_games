import html, { css, defineCustomElement } from "/js/html.js";
import { AutoTimer, KeyboardBinding, NumberValue } from "/js/common.js";
import * as index from "/js/index.js";

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
  #game-stage > .trackpad {
    display: flex;
    position: fixed;
    inset: 0;
  }
  #game-stage > .stat {
    z-index: 1;
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
    position: absolute;
    inset: 0;
    backdrop-filter: blur(10px);
    background: #ffffffcc;
    flex-direction: column;
    gap: 8px;
    font-size: 200%;
    align-items: center;
    justify-content: center;
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
  .track {
    flex: 1;
  }
  game-cell {
    pointer-events: none;
    position: absolute;
    width: 25vmin;
    height: 25vmin;
    transform: translate(calc(var(--x) * 25vmin), calc(var(--y) * 25vmin));
    display: block;
    background-image: url("data:image/svg+xml,%3Csvg width='48' height='48' viewBox='0 0 48 48' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M41.42 7.309s3.885-1.515 3.56 2.164c-.107 1.515-1.078 6.818-1.834 12.553l-2.59 16.99s-.216 2.489-2.159 2.922c-1.942.432-4.856-1.515-5.396-1.948-.432-.325-8.094-5.195-10.792-7.575-.756-.65-1.62-1.948.108-3.463L33.648 18.13c1.295-1.298 2.59-4.328-2.806-.649l-15.11 10.28s-1.727 1.083-4.964.109l-7.016-2.165s-2.59-1.623 1.835-3.246c10.793-5.086 24.068-10.28 35.831-15.15z' fill='%23cc2307'/%3E%3C/svg%3E");
    background-size: 40%;
    background-position: center;
    background-repeat: no-repeat;
    opacity: 1;
    transition: all ease 0.2s;
  }
  game-cell.hidden {
    background-size: 100%;
    opacity: 0;
  }
  .game-title {
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 10px;
  }
  .game-title > .text {
    display: inline-flex;
    font-size: 200%;
    gap: 8px;
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
  constructor(x: number, y: number = -1) {
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
  move() {
    if (!this.#killed && this.#y != 3) {
      this.style.setProperty("--y", "" + ++this.#y);
    }
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
  const gameover_show = html`<div class="gameover">
    <span>游戏结束</span>
    ${restartbtn} ${highscores}
  </div>`;
  let score = new NumberValue(0);
  let stopped = false;

  restartbtn.addEventListener(
    "click",
    () =>
      gameover_show.dispatchEvent(
        new CustomEvent("restart", { bubbles: true }),
      ),
  );

  async function gameover() {
    stopped = true;
    gameover_show.classList.add("show");
    try {
      const list = await index.score(score.value);
      list.sort((a, b) => a.position - b.position);
      for (
        const {
          score: hs,
          user: { first_name, last_name },
        } of list
      ) {
        const name = first_name + (last_name ? " " + last_name : "");
        highscores.appendChild(html`<div>${hs} - ${name}</div>`);
      }
    } catch {
      alert("分数上传失败");
    }
  }

  let timer_show = new NumberValue(20);
  let timer = new AutoTimer(() => {
    if (stopped) return;
    timer_show.value--;
    if (timer_show.value == 0) {
      effects.end.play();
      gameover();
    }
  }, 1000);

  const cells = html`<div class="cells" />`;

  function click(track: number) {
    if (stopped) return;
    for (const e of [...cells.children] as GameCell[]) {
      if (e.x == track && e.y == 3 && !e.killed) {
        e.kill();
        track = -1;
      }
      e.move();
    }
    if (track != -1) {
      effects.err.play();
      gameover();
      return;
    }
    effects.tap.play();
    score.value++;
    const x = (Math.random() * 4) | 0;
    cells.appendChild(new GameCell(x));
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

  [...Array(5)].forEach((_, i) => {
    const x = (Math.random() * 4) | 0;
    cells.appendChild(new GameCell(x, 3 - i));
  });

  stage.addEventListener("click", ({ target }) => {
    let track = +((target as HTMLElement).dataset?.x ?? -1);
    if (track == -1) return;
    click(track);
  });

  return stage;
});

defineCustomElement("game-title", () => {
  const startgame = html`<button>开始游戏</button>`;
  startgame.addEventListener("click", (e) => {
    e.preventDefault();
    startgame.dispatchEvent(new CustomEvent("start", { bubbles: true }));
  });
  return html`<div class="game-title">
    <span class="text">
      ${"新概念音游".split("").map((x) => html`<span>${x}</span>`)}
    </span>
    <span class="description">从最底下的开始<br />看你能得多少分</span>
    <span class="description">键盘快捷键</span>
    <div class="kbd-list">
      ${"DFJK".split("").map((x) => html`<kbd>${x}</kbd>`)}
    </div>
    ${startgame}
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
