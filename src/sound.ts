export interface ValueChange {
  curve: "static" | "lin" | "exp";
  value: number;
  span: number;
}

export interface BaseTrack {
  frequency: ValueChange[];
  volume: ValueChange[];
  type: "sawtooth" | "sine" | "square" | "triangle";
}

export type SpecialEffect = {
  type: "delay";
  time: ValueChange[];
  gain: ValueChange[];
};

function apply(time: number, param: AudioParam, changes: ValueChange[]) {
  let last: number | undefined = 0;
  for (const c of changes) {
    switch (c.curve) {
      case "static":
        param.setValueAtTime(c.value, time);
        last = undefined;
        time += c.span / 1000;
        break;
      case "lin":
        if (last != null) param.setValueAtTime(last, time);
        time += c.span / 1000;
        param.linearRampToValueAtTime((last = c.value), time);
        break;
      case "exp":
        if (last != null) param.setValueAtTime(last, time);
        time += c.span / 1000;
        param.exponentialRampToValueAtTime((last = c.value), time);
        break;
    }
  }
  if (last != null) param.setValueAtTime(last, time);
  return time;
}

export default class SoundEffects {
  #audioctx = new AudioContext();

  play({
    tracks,
    effects = [],
  }: {
    tracks: BaseTrack[];
    effects?: SpecialEffect[];
  }) {
    const cur = this.#audioctx.currentTime;
    let connector = (source: AudioNode) => {
      source.connect(this.#audioctx.destination);
    };
    for (const effect of effects) {
      if (effect.type == "delay") {
        const delay = this.#audioctx.createDelay();
        const gainNode = this.#audioctx.createGain();
        apply(cur, delay.delayTime, effect.time);
        apply(cur, gainNode.gain, effect.gain);

        delay.connect(gainNode);
        gainNode.connect(delay);
        connector(gainNode);
        let old = connector;
        connector = (source) => {
          source.connect(delay);
          old(source);
        };
      }
    }
    for (const track of tracks) {
      const oscillator = this.#audioctx.createOscillator();
      const gainNode = this.#audioctx.createGain();

      oscillator.type = track.type;
      let end = apply(cur, oscillator.frequency, track.frequency);
      apply(cur, gainNode.gain, track.volume);

      oscillator.connect(gainNode);
      connector(gainNode);

      oscillator.start(cur);
      oscillator.stop(end);
    }
  }
}
