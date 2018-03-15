/** @flow*/

import NoiseSource from "./noise-source";
import type { Byte } from "../types/common";

const globalGain = 0.1;
const CPU_CLOCK = 1789772.5;

const counterTable = [
    0x0A, 0xFE, 0x14, 0x02, 0x28, 0x04, 0x50, 0x06,
    0xA0, 0x08, 0x3C, 0x0A, 0x0E, 0x0C, 0x1A, 0x0E,
    0x0C, 0x10, 0x18, 0x12, 0x30, 0x14, 0x60, 0x16,
    0xC0, 0x18, 0x48, 0x1A, 0x10, 0x1C, 0x20, 0x1E
];

export default class Noise {
    envelopeRate: number; // エンベロープ周期
    envelopeVolume: number;
    envelopeEnable: boolean; // エンベロープが有効かどうか
    envelopeGeneratorCounter: number;
    dividerForFrequency: number; // チャンネル周期
    isLengthCounterEnable: boolean;
    lengthCounter: number;
    noiseSource: NoiseSource

    constructor() {
        this.envelopeGeneratorCounter = 0;
        this.envelopeRate = 0x0F;
        this.envelopeVolume = 0x0F;
        this.envelopeEnable = false;

        this.noiseSource = new NoiseSource();
    }

    updateEnvelope() {
        if ((--this.envelopeGeneratorCounter) <= 0) {
            this.envelopeGeneratorCounter = this.envelopeRate;

            // 分周器が励起されるとき、カウンタがゼロでなければデクリメントします。
            // カウンタがゼロで、ループフラグがセットされているならカウンタへ$Fをセットします
            if (this.envelopeVolume > 0) {
                this.envelopeVolume--;
            } else {
                this.envelopeVolume = 0x0F;
            }
        }
    }

    write(address: Byte, data: Byte) {
        /*
          $400C   --le nnnn
          5   l   エンベロープループ、長さカウンタ無効
          4   e   エンベロープ無効フラグ
          3-0 n   ボリューム/エンベロープ周期

          $400E   s--- pppp
          7   s   ランダム生成モード
          3-0 p   タイマ周期インデクス

          $400F   llll l---
          7-3 l   長さインデクス
        */
        if (address === 0x00) {
            this.envelopeEnable = (data & 0x10) === 0;
            this.isLengthCounterEnable = !(data & 0x20);
            this.envelopeRate = data & 0x0F;
        }
        else if (address === 0x02) {
        }
        else if (address === 0x03) {
            if (this.isLengthCounterEnabled) {
                this.lengthCounter = counterTable[(data & 0xF8) >> 3];
            }

            this.envelopeGeneratorCounter = this.envelopeRate;
            this.envelopeVolume = 0x0F;
        }
    }

    get volume(): number {
        const vol = this.enableEnvelope ? this.envelopeVolume : this.envelopeRate;

        // 0 ~ 1の範囲にする
        // envelopeVolumeもenvelopeRateもとちらも4ビット
        return (vol * globalGain) / 0x0F;
    }
}
