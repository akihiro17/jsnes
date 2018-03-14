/** @flow*/

import Pulse from "./pulse";
import Interrupts from "../interrupts/interrupts";
import type { Byte, Word } from "../types/common";

// 分周器は、入力される約1.789MHzを7457分周することで240Hzのクロックレートを生成し、 これによってシーケンサを励起します
const DIVIDE_COUNT_FOR_240HZ = 7457;

export default class Apu {
    cycle: number;
    step: number;
    sequencerMode: number;
    enableIrq: boolean;
    pulses: Pulse[];
    registers: Uint8Array;
    interrupts: Interrupts

    constructor(interrupts: Interrupts) {
        this.cycle = 0;
        this.step = 0;
        this.enableIrq = false;
        this.pulses = [new Pulse()];
        // this.pulses = [];
        // 0x4000 ~ 0x4017
        this.registers = new Uint8Array(0x18);
        this.interrupts = interrupts;
    }

    run(cycle: number) {
        this.cycle += cycle;

        if (this.cycle >= DIVIDE_COUNT_FOR_240HZ) {
            this.cycle -= DIVIDE_COUNT_FOR_240HZ;

            // シーケンサモードがクリアされているなら4ステップ、
            // セットされているなら5ステップのシーケンスを選択します
            if (this.sequencerMode === 1) {
                this.updateBySequenceMode1();
            }
            else {
                this.updateBySequenceMode0();
            }
        }
    }

    /*
      f = 割り込みフラグセット
      l = 長さカウンタとスイープユニットのクロック生成
      e = エンベロープと三角波の線形カウンタのクロック生成
     */

    updateBySequenceMode0() {
        /*
        モード0: 4ステップ 有効レート(おおよそ)
        ---------------------------------------
        - - - f      60 Hz
        - l - l     120 Hz
        e e e e     240 Hz
        */

        this.updateEnvelope();

        if (this.step % 2 === 1) {
            this.updateSweepAndLengthCounter();
        }

        this.step++;
        // 5ステップ目
        if (this.step === 4) {
            if (this.enableIrq) {
                this.interrupts.assertIrq();
            }
            this.step = 0;
        }
    }

    updateBySequenceMode1() {
        /*
        モード1: 5ステップ 有効レート(おおよそ)
        ---------------------------------------
        - - - - -   (割り込みフラグはセットしない)
        l - l - -    96 Hz
        e e e e -   192 Hz
        */

        if (this.step % 2 === 0) {
            this.updateSweepAndLengthCounter();
        }

        if (this.step != 5) {
            this.updateEnvelope();
        }

        this.step++;

        if (this.step === 6) {
            this.step = 0;
        }
    }

    // volume
    updateEnvelope() {
        this.pulses.forEach((s: Pulse) => s.updateEnvelope());
    }

    // frequency
    updateSweepAndLengthCounter() {
        this.pulses.forEach((s: Pulse) => s.updateSweepAndLengthCounter());
    }

    read(address: Byte): Byte {
        if (address === 0x15) {
            // Reading this register clears the frame interrupt flag
            this.interrupts.deassertIrq();
        }

        return 0;
    }

    write(address: Byte, data: Byte) {
        console.log(`apu write ${address}`);
        if (address <= 0x03) {
            this.pulses[0].write(address, data);
        }
        else if (address <= 0x07) {
            // this.pulses[1] = new Pulse();
            // this.pulses[1].write(address - 0x04, data);
        }
        else if (address === 0x17) {
            // frame counter
            // $4017	MI-- ----	Mode (M, 0 = 4-step, 1 = 5-step), IRQ inhibit flag (I)
            this.sequencerMode = data & 0x80;
            this.enableIrq = !!(data & 0x40);
            this.registers[address] = data;
        }
    }
}
