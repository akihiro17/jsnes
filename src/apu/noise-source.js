/* @flow */

export default class NoiseSource {
    context: AudioContext;
    source: AudioBufferSourceNode;
    gain: GainNode;
    playing: boolean;

    constructor() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContext();
        } catch (e) {
            throw new Error('Web Audio isn\'t supported in this browser!');
        }
        this.createSource();
        this.playing = false;
    }

    createSource() {
        const node = this.context.createBufferSource();
        // 1秒続く
        const buffer = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < this.context.sampleRate; i++) {
            // Math.random() is in [0; 1.0]
            // audio needs to be in [-1.0; 1.0]
            data[i] = Math.random() * 2 - 1;
        }
        node.buffer = buffer;
        node.loop = true;
        this.gain = this.context.createGain();
        this.gain.gain.value = 0.01;
        this.gain.connect(this.context.destination);

        node.connect(this.gain);
        this.source = node;
        this.source.start(0);
    }

}
