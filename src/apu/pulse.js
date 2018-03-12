/** @flow*/

import Oscillator from "./oscillator";
import type { Byte } from "../types/common";

const global_gain = 0.01;
const CPU_CLOCK = 1789772.5;

const counterTable = [
  0x0A, 0xFE, 0x14, 0x02, 0x28, 0x04, 0x50, 0x06,
  0xA0, 0x08, 0x3C, 0x0A, 0x0E, 0x0C, 0x1A, 0x0E,
  0x0C, 0x10, 0x18, 0x12, 0x30, 0x14, 0x60, 0x16,
  0xC0, 0x18, 0x48, 0x1A, 0x10, 0x1C, 0x20, 0x1E,
];

/*
http://wiki.nesdev.com/w/index.php/APU#Pulse_.28.244000-4007.29

The pulse channels produce a variable-width pulse signal, controlled by volume, envelope, length, and sweep units.

$4000 / $4004	DDLC VVVV	Duty (D), envelope loop / length counter halt (L), constant volume (C), volume/envelope (V)
$4001 / $4005	EPPP NSSS	Sweep unit: enabled (E), period (P), negate (N), shift (S)
$4002 / $4006	TTTT TTTT	Timer low (T)
$4003 / $4007	LLLL LTTT	Length counter load (L), timer high (T)
*/

export default class Pulse {
    envelopeGeneratorCounter: number;
    envelopeRate: number; // エンベロープ周期
    envelopeVolume: number;
    envelopeEnable: boolean;
    envelopeLoopEnable: boolean;
    isLengthCounterEnabled: boolean;
    lengthCounter: number;
    isSweepEnabled: boolean;
    sweepmode: boolean; // スイープ方向
    sweepUnitCounter: number;
    sweepUnitDiviser: number; // スイープ周期
    sweepShiftAmount: number; // スイープ量
    dividerForFrequency: number; // チャンネル周期
    frequency: number;
    oscillator: Oscillator;

    constructor() {
        // ?
        this.envelopeGeneratorCounter = 0;
        this.envelopeRate = 0x0F;
        this.envelopeEnable = false;

        this.sweepUnitCounter = 0;

        this.oscillator = new Oscillator();
        this.oscillator.setVolume(1);
    }

    updateEnvelope() {
        /*
          最後のクロック以降チャンネルの4番目のレジスタへの書き込みがあった場合、
          カウンタへ$Fをセットし、分周器へエンベロープ周期をセットします。
          そうでなければ、分周器を励起します
        */
        if ((--this.envelopeGeneratorCounter) <= 0) {
            this.envelopeGeneratorCounter = this.envelopeRate;

            // 分周器が励起されるとき、カウンタがゼロでなければデクリメントします。
            // カウンタがゼロで、ループフラグがセットされているならカウンタへ$Fをセットします
            if (this.envelopeVolume > 0) {
                this.envelopeVolume--;
            }
            else {
                this.envelopeVolume = this.envelopeLoopEnable ? 0x0F : 0x00;
            }
        }

        this.oscillator.setVolume(this.volume);
    }

    updateSweepAndLengthCounter() {
        // 停止フラグがクリアかつカウンタがゼロでないなら、カウンタをデクリメントします
        if (this.isLengthCounterEnabled && this.lengthCounter > 0) {
            this.lengthCounter--;
            if (this.lengthCounter === 0) {
                this.oscillator.stop();
            }
        }

        /*
          　それぞれのスイープ更新クロックにおいて、

          - スイープ有効フラグがセットされている
          - スイープ量が0ではない
          - チャンネルの長さカウンタがゼロではない
          以上の3つの条件がすべてそろえばチャンネルの周期を新しい値で更新します。
         */

        this.sweepUnitCounter++;
        if (!(this.sweepUnitCounter % this.sweepUnitDiviser)) {
            if (this.isSweepEnabled) {
                /*
                  ビット3（スイープ方向）
                  ----------------------
                  0  しり下がりモード    新しい周期 = 周期 + (周期 >> N)
                  1  しり上がりモード    新しい周期 = 周期 - (周期 >> N)
                */
                const sign = this.sweepmode ? 1 : -1;
                this.frequency = this.frequency + sign * (this.frequency >> this.sweepShiftAmount);
                // もしチャンネルの周期が8未満か、$7FFより大きくなったなら、スイープを停止し、 チャンネルを無音化します。
                // これはスイープユニットが無効であっても働きます
                // なぜ2倍?
                if (this.frequency > 4095) {
                    this.frequency = 4095;
                    this.oscillator.stop();
                }
                else if (this.frequency < 16) {
                    this.frequency = 16;
                    this.oscillator.stop();
                }
            }

            this.oscillator.changeFrequency(this.frequency);
        }
    }

    write(address: Byte, data: Byte) {
        /*
          $4000 矩形波1コントロール1
          $4001 矩形波1コントロール2
          $4002 矩形波1周波数1
          $4003 矩形波1周波数2
        */

        if (address === 0x00) {
            // コントロールレジスタ
            /*
              $4000/$4004   ddld nnnn
              7-6 d   デューティ
              5   l   エンベロープループ
              4   d   エンベロープ無効
              3-0 n   ボリューム/エンベロープ周期
            */
            this.envelopeEnable = !((data & 0x10) !== 0);
            this.envelopeLoopEnable = !((data & 0x20) !== 0);
            // ? +1
            this.envelopeRate = data & 0xF + 1;
            // If the envelope is not looped, the length counter must be enabled
            this.isLengthCounterEnabled = !(data & 0x20);
        }
        else if (address === 0x01) {
            /*
              $4001/$4005   eppp nsss
              7   e   スイープ有効
              6-4 p   スイープ周期
              3   n   スイープ方向
              2-0 s   スイープ量
            */

            // スイープ有効
            this.isSweepEnabled = !!(data & 0x80);
            // スイープ周期
            this.sweepUnitDiviser = (data >> 0x04) & 0x07;
            // スイープ方向
            this.sweepmode = !!(data & 0x08);
            // スイープ量
            this.sweepShiftAmount = data & 0x07;
        }
        else if (address === 0x02) {
            // $4002/$4006   llll llll
            // 7-0 l   チャンネル周期下位
            // 全部で12bitある
            this.dividerForFrequency &= 0x700;
            this.dividerForFrequency += data;

        }
        else if (address === 0x03) {
            /*
              $4003/$4007   cccc chhh
              7-3 c   長さカウンタインデクス
              2-0 h   チャンネル周期上位
            */

            // Writing to $4003/4007 reloads the length counter, restarts the envelope, and
            // resets the phase of the pulse generator

            this.dividerForFrequency &= 0xFF;
            this.dividerForFrequency |= (data & 0x07) << 8;
            if (this.isLengthCounterEnabled) {
                this.lengthCounter = counterTable[data & 0xF8];
            }

            // f = CPU / (16 * (t + 1))
            this.frequency = CPU_CLOCK / (16 * (this.dividerForFrequency + 1));

            this.sweepUnitCounter = 0;
            this.envelopeGeneratorCounter = this.envelopeRate;
            this.envelopeVolume = 0x0F;
        }
    }

    // チャンネルのボリューム出力として、 エンベロープ無効フラグがセットされているなら、 エンベロープ周期のnをそのまま出力します。
    // クリアされているならカウンタの値を出力します。
    get volume(): number {
        const vol = this.enableEnvelope ?  this.envelopeVolume : this.envelopeRate;

        // 0 ~ 1の範囲にする
        // envelopeVolumeもenvelopeRateもとちらも4ビット
        return (vol * global_gain) / 0x0F;
    }
}
