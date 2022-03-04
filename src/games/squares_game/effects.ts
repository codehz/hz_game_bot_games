import SoundEffects, { ValueChange } from "/js/sound.js";

const effects = new SoundEffects();

export function bonus() {
  const base = 200 * Math.random() + 1400;
  effects.play({
    tracks: [
      {
        frequency: [
          {
            curve: "static",
            value: base * 2,
            span: 20,
          },
          {
            curve: "static",
            value: base,
            span: 80,
          },
        ],
        volume: [
          {
            curve: "static",
            value: 0.5,
            span: 80,
          },
          {
            curve: "lin",
            value: 0,
            span: 20,
          },
        ],
        type: "square",
      },
      {
        frequency: [
          {
            curve: "static",
            value: base * 0.75,
            span: 100,
          },
        ],
        volume: [
          {
            curve: "static",
            value: 0.5,
            span: 50,
          },
          {
            curve: "lin",
            value: 0,
            span: 50,
          },
        ],
        type: "square",
      },
    ],
  });
  navigator.vibrate(10);
}

export function gameover() {
  effects.play({
    tracks: [
      {
        frequency: [
          {
            curve: "static",
            value: 500,
            span: 20,
          },
          {
            curve: "static",
            value: 300,
            span: 0,
          },
          {
            curve: "exp",
            value: 100,
            span: 980,
          },
        ],
        volume: [
          {
            curve: "static",
            value: 1,
            span: 100,
          },
          {
            curve: "lin",
            value: 0,
            span: 900,
          },
        ],
        type: "sawtooth",
      },
    ],
    effects: [
      {
        type: "delay",
        gain: [{ curve: "static", value: 0.5, span: 0 }],
        time: [{ curve: "static", value: 0.2, span: 0 }],
      },
    ],
  });
  navigator.vibrate(500);
}

export function crash() {
  const list: ValueChange[] = [];
  for (let i = 0; i < 70; i++) {
    list.push({
      curve: "static",
      value: Math.random() * 300 + 100,
      span: 10,
    });
  }
  effects.play({
    tracks: [
      {
        frequency: list,
        volume: [
          {
            curve: "static",
            value: 1,
            span: 200,
          },
          {
            curve: "lin",
            value: 0,
            span: 500,
          },
        ],
        type: "sawtooth",
      },
    ],
  });
  navigator.vibrate(100);
}
