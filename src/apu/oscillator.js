/** @flow*/

import wave from "./waves";

export default class Oscillator {
    context: AudioContext;
    oscillator: OscillatorNode;
    gain: GainNode;
    playing: boolean;
    waves: {
        [key: string]: PeriodicWave
    };

    constructor(type?: string) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;

        this.context = new AudioContext();
        if (type === "triangle") {
            this.oscillator = this.createTriangleOscillator();
        } else {
            this.oscillator = this.createOscillator();
        }

        // periodicwave生成方法?
        this.waves = {
            0.125: this.context.createPeriodicWave(wave["0.125"].real, wave["0.125"].imag),
            0.25: this.context.createPeriodicWave(wave["0.25"].real, wave["0.25"].imag),
            0.5: this.context.createPeriodicWave(wave["0.5"].real, wave["0.5"].imag),
            0.75: this.context.createPeriodicWave(wave["0.75"].real, wave["0.75"].imag)
        };

        this.setPulseWidth(0.5);
        this.playing = false;
    }

    createOscillator(): OscillatorNode {
        const oscillator = this.context.createOscillator();

        this.gain = this.context.createGain();
        this.gain.gain.value = 0.1;
        oscillator.connect(this.gain);
        this.gain.connect(this.context.destination);

        return oscillator;
    }

    createTriangleOscillator(): OscillatorNode {
        const oscillator = this.context.createOscillator();

        oscillator.type = "triangle";
        this.gain = this.context.createGain();
        this.gain.gain.value = 0.01;
        oscillator.connect(this.gain);
        this.gain.connect(this.context.destination);

        return oscillator;
    }

    start() {
        console.log("start");
        if (this.playing) {
            this.stop();
        }
        this.playing = true;
        this.oscillator.start(0);
    }

    stop() {
        if (this.playing) {
            this.playing = false;
            this.oscillator.stop(this.context.currentTime);
            this.oscillator = this.createOscillator();
            this.setPulseWidth(0.5);
        }

        this.setPulseWidth(0.5);
    }

    setPulseWidth(pulseWidth: number) {
        this.oscillator.setPeriodicWave(this.waves[`${pulseWidth}`]);
    }

    setVolume(volume: number) {
        this.gain.gain.value = Math.max(0, Math.min(1, volume));
    }

    setFrequency(frequency: number) {
        this.oscillator.frequency.value = frequency;
    }

    changeFrequency(frequency: number) {
        this.oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
    }
}
