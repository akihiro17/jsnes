/** @flow*/

import Oscillator from "./oscillator";
import type { Byte } from "../types/common";

const globalGain = 0.1;
const CPU_CLOCK = 1789772.5;

const counterTable = [
    0x0A, 0xFE, 0x14, 0x02, 0x28, 0x04, 0x50, 0x06,
    0xA0, 0x08, 0x3C, 0x0A, 0x0E, 0x0C, 0x1A, 0x0E,
    0x0C, 0x10, 0x18, 0x12, 0x30, 0x14, 0x60, 0x16,
    0xC0, 0x18, 0x48, 0x1A, 0x10, 0x1C, 0x20, 0x1E,
];

export default class Triangle {
    isLengthCounterEnable: boolean; // 長さカウンタを使用するか
    lengthCounter: number; // 長さカウンタ
    linearCounter: number; // 線形カウンタ
    frequency: number;
    dividerForFrequency: number; //チャンネル周期
    oscillator: Oscillator;

    constructor() {
        this.isLengthCounterEnable = false;
        this.lengthCounter = 0;
        this.oscillator = new Oscillator('triangle');

        this.oscillator.setVolume(this.volume);
    }

    // 音量一定?
    get volume(): number {
        return 0x01 * globalGain;
    }

    updateCounter() {
        if (this.isLengthCounterEnable && this.lengthCounter > 0) {
            this.lengthCounter--;
        }

        if (this.linearCounter > 0) {
            this.linearCounter--;
        }

        if (this.linearCounter === 0 && this.lengthCounter === 0) {
            this.oscillator.stop();
        }
    }

    write(address: Byte, data: Byte) {
        // lda #%1111111; カウンタ使用・長さ
	// sta $4008; 三角波チャンネル制御レジスタ
        /*
          $4008  clll llll
          7   c   長さカウンタ無効フラグ
          6-0 l   線形カウンタ

          $400A  llll llll
          7-0 l   チャンネル周期下位

          $400B  llll lhhh
          7-3 l   長さカウンタインデクス
          2-0 h   チャンネル周期上位
        */
        if (address === 0x00) {
            this.isLengthCounterEnable = !(data & 0x80);
            this.linearCounter = data & 0x7F;
            this.oscillator.setVolume(this.volume);
        }
        else if (address === 0x02) {
            this.dividerForFrequency &= 0x700;
            this.dividerForFrequency |= data;
        }
        else if (address === 0x03) {
            this.dividerForFrequency &= 0xFF;
            this.dividerForFrequency |= (data & 0x07) << 8;
            if (this.isLengthCounterEnable) {
                this.lengthCounter = counterTable[(data & 0xF8) >> 3];
            }

            // f = CPU / (16 * (t + 1))
            this.frequency = CPU_CLOCK / (16 * (this.dividerForFrequency + 1));
            this.oscillator.setVolume(this.volume);

            // startしてから周波数をセットする
            this.oscillator.start();
            this.oscillator.setFrequency(this.frequency);
        }
    }

    start() {
        this.oscillator.start();
        this.oscillator.setFrequency(this.frequency);
    }
}
