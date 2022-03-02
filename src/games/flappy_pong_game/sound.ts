export class Sound {
  #audioctx = new AudioContext();
  constructor() {}

  play(duration: number, frequency: number, volume: number) {
    const oscillator = this.#audioctx.createOscillator();
    const gainNode = this.#audioctx.createGain();

    duration = duration / 1000;
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(volume, this.#audioctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      volume,
      this.#audioctx.currentTime + duration * 0.8
    );
    gainNode.gain.linearRampToValueAtTime(
      0,
      this.#audioctx.currentTime + duration * 1
    );
    oscillator.connect(gainNode);
    gainNode.connect(this.#audioctx.destination);
    oscillator.type = "triangle";

    oscillator.start(this.#audioctx.currentTime);
    oscillator.stop(this.#audioctx.currentTime + duration);
  }
}
