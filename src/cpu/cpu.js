/** @flow*/

import CpuBus from "../bus/cpu-bus";
import Interrupts from "../interrupts/interrupts";
import type { Byte, Word } from "../types/common";

interface CpuStatus {
    negative: boolean;
    overflow: boolean;
    reserved: boolean;
    break: boolean;
    decimal: boolean;
    interrupt: boolean;
    zero: boolean;
    carry: boolean;
}

interface Registers {
    A: Byte;
    X: Byte;
    Y: Byte;
    P: CpuStatus;
    SP: Word;
    PC: Word;
}

export const cycles: $ReadOnlyArray<number> = [
    /* 0x00*/ 7, 6, 2, 8, 3, 3, 5, 5, 3, 2, 2, 2, 4, 4, 6, 6,
    /* 0x10*/ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 6, 7,
    /* 0x20*/ 6, 6, 2, 8, 3, 3, 5, 5, 4, 2, 2, 2, 4, 4, 6, 6,
    /* 0x30*/ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 6, 7,
    /* 0x40*/ 6, 6, 2, 8, 3, 3, 5, 5, 3, 2, 2, 2, 3, 4, 6, 6,
    /* 0x50*/ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 6, 7,
    /* 0x60*/ 6, 6, 2, 8, 3, 3, 5, 5, 4, 2, 2, 2, 5, 4, 6, 6,
    /* 0x70*/ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 6, 7,
    /* 0x80*/ 2, 6, 2, 6, 3, 3, 3, 3, 2, 2, 2, 2, 4, 4, 4, 4,
    /* 0x90*/ 2, 6, 2, 6, 4, 4, 4, 4, 2, 4, 2, 5, 5, 4, 5, 5,
    /* 0xA0*/ 2, 6, 2, 6, 3, 3, 3, 3, 2, 2, 2, 2, 4, 4, 4, 4,
    /* 0xB0*/ 2, 5, 2, 5, 4, 4, 4, 4, 2, 4, 2, 4, 4, 4, 4, 4,
    /* 0xC0*/ 2, 6, 2, 8, 3, 3, 5, 5, 2, 2, 2, 2, 4, 4, 6, 6,
    /* 0xD0*/ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,
    /* 0xE0*/ 2, 6, 3, 8, 3, 3, 5, 5, 2, 2, 2, 2, 4, 4, 6, 6,
    /* 0xF0*/ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7
];

const instructions = {
    "78": { fullName: "SEI", baseName: "SEI", mode: "implied", cycle: cycles[0x78] },
    "A2": { fullName: "LDX_IMMEDIATE", baseName: "LDX", mode: "immediate", cycle: cycles[0xA2] },
    "9A": { fullName: "TXS_IMPLIED", baseName: "TXS", mode: "implied", cycle: cycles[0x9A] },
    "A9": { fullName: "LDA_IMMEDIATE", baseName: "LDA", mode: "immediate", cycle: cycles[0xA9] },
    "85": { fullName: "STA_ZERO", baseName: "STA", mode: "zeroPage", cycle: cycles[0x85] },
    "20": { fullName: "JSR_ABSOLUTE", baseName: "JSR", mode: "absolute", cycle: cycles[0x20] },
    "89": { fullName: "NOPD", baseName: "NOPD", mode: "implied", cycle: cycles[0x89] },
    "8D": { fullName: "STA_ABSOLUTE", baseName: "STA", mode: "absolute", cycle: cycles[0x8D] },
    "A0": { fullName: "LDY_IMMEDIATE", baseName: "LDY", mode: "immediate", cycle: cycles[0xA0] },
    "BD": { fullName: "LDA_ABSX", baseName: "LDA", mode: "absoluteX", cycle: cycles[0xBD] },
    "E8": { fullName: "INX", baseName: "INX", mode: "implied", cycle: cycles[0xE8] },
    "88": { fullName: "DEY", baseName: "DEY", mode: "implied", cycle: cycles[0x88] },
    "D0": { fullName: "BNE", baseName: "BNE", mode: "relative", cycle: cycles[0xD0] },
    "4C": { fullName: "JMP_ABSOLUTE", baseName: "JMP", mode: "absolute", cycle: cycles[0x4C] },
    "00": { fullName: "BRK", baseName: "BRK", mode: "implied", cycle: cycles[0x00] },
    "AD": { fullName: "LDA_ABSOLUTE", baseName: "LDA", mode: "absolute", cycle: cycles[0xAD] },
    "E0": { fullName: "CPX_IMMEDIATE", baseName: "CPX", mode: "immediate", cycle: cycles[0xE0] },
    "29": { fullName: "AND_IMMEDIATE", baseName: "AND", mode: "immediate", cycle: cycles[0x29] },
    "CE": { fullName: "DEC_ABSOLUTE", baseName: "DEC", mode: "absolute", cycle: cycles[0xCE] },
    "EE": { fullName: "INC_ABSOLUTE", baseName: "INC", mode: "absolute", cycle: cycles[0xEE] },
    "69": { fullName: "ADC_IMMEDIATE", baseName: "ADC", mode: "immediate", cycle: cycles[0x69] },
    "60": { fullName: "RTS", baseName: "RTS", mode: "implied", cycle: cycles[0x60] },
    "40": { fullName: "RTI", baseName: "RTI", mode: "implied", cycle: cycles[0x40] },
    "49": { fullName: "EOR_IMMEDIATE", baseName: "EOR", mode: "immediate", cycle: cycles[0x49] },
    "55": { fullName: 'EOR_ZEROX', baseName: 'EOR', mode: 'zeroPageX', cycle: cycles[0x55] },
    'BE': { fullName: 'LDX_ABSY', baseName: 'LDX', mode: 'absoluteY', cycle: cycles[0xBE] },
    'CA': { fullName: 'DEX', baseName: 'DEX', mode: 'implied', cycle: cycles[0xCA] },
    '98': { fullName: 'TYA', baseName: 'TYA', mode: 'implied', cycle: cycles[0x98] },
    'C8': { fullName: 'INY', baseName: 'INY', mode: 'implied', cycle: cycles[0xC8] },
    "C0": { fullName: "CPY_IMMEDIATE", baseName: "CPY", mode: "immediate", cycle: cycles[0xC0] },
    "3C": { fullName: 'NOPI', baseName: 'NOPI', mode: 'implied', cycle: cycles[0x3C] },
    "10": { fullName: "BPL", baseName: "BPL", mode: "relative", cycle: cycles[0x10] }
};

const defaultRegisters: Registers = {
    A: 0x00,
    X: 0x00,
    Y: 0x00,
    P: {
        negative: false,
        overflow: false,
        reserved: true,
        break: true,
        decimal: false,
        interrupt: true,
        zero: false,
        carry: false
    },
    SP: 0x01FD,
    PC: 0x0000
};

export default class Cpu {
    registers: Registers;
    bus: CpuBus
    interrupts: Interrupts;
    prev: number;
    prev2: number;

    constructor(bus: CpuBus, interrupts: Interrupts) {
        this.registers = {
            ...defaultRegisters,
            P: { ...defaultRegisters.P }
        };
        this.bus = bus;
        this.interrupts = interrupts;
        this.prev = 0;
        this.prev2 = 0;
    }

    read(address: Word, size?: "Byte" | "Word"): Byte {
        if (size === "Word") {
            return this.bus.readByCpu(address) | this.bus.readByCpu(address + 1) << 8;
        }

        return this.bus.readByCpu(address);
    }

    write(address: Word, data: Byte) {
        this.bus.writeByCpu(address, data);
    }

    push(data: Byte) {
        // console.log(`push ${data}`);
        // スタックポインタも16ビットのアドレス空間を指す必要があるのですが、上位8bitは0x01に固定されています
        this.write(0x0100 | this.registers.SP & 0xFF, data);
        this.registers.SP -= 1;
    }

    pop(): Byte {
        // スタックポインタも16ビットのアドレス空間を指す必要があるのですが、上位8bitは0x01に固定されています
        this.registers.SP += 1;
        return this.read(0x0100 | this.registers.SP & 0xFF);
    }

    pushStatus() {
        const status: Byte =
              (+this.registers.P.negative) << 7 |
              (+this.registers.P.overflow) << 6 |
              (+this.registers.P.reserved) << 5 |
              (+this.registers.P.break) << 4 |
              (+this.registers.P.decimal) << 3 |
              (+this.registers.P.interrupt) << 2 |
              (+this.registers.P.zero) << 1 |
              (+this.registers.P.carry);

        this.push(status);
    }

    popStatus() {
        const status = this.pop();

        this.registers.P.negative = !!(status & 0x80);
        this.registers.P.overflow = !!(status & 0x40);
        this.registers.P.reserved = !!(status & 0x20);
        this.registers.P.break = !!(status & 0x10);
        this.registers.P.decimal = !!(status & 0x08);
        this.registers.P.interrupt = !!(status & 0x04);
        this.registers.P.zero = !!(status & 0x02);
        this.registers.P.carry = !!(status & 0x01);
    }

    fetch(address: Word, size?: "Byte" | "Word"): Byte {
        if (size === "Word") {
            this.registers.PC += 2;
        } else {
            this.registers.PC += 1;
        }
        return this.read(address, size);
    }

    getAddressOrData(mode: string): Word {
        switch (mode) {
            case "implied": {
                return 0x00;
            }
            case "immediate": {
                return this.fetch(this.registers.PC);
            }
            case "zeroPage": {
                return this.fetch(this.registers.PC);
            }
            case "zeroPageX": {
                return (this.fetch(this.registers.PC) + this.registers.X) & 0xFFFF;
            }
            case "absolute": {
                return this.fetch(this.registers.PC, "Word");
            }
            case "absoluteX": {
                return (this.fetch(this.registers.PC, "Word") + this.registers.X) & 0xFFFF;
            }
            case "absoluteY": {
                return (this.fetch(this.registers.PC, "Word") + this.registers.Y) & 0xFFFF;
            }
            case "relative": {
                const base = this.fetch(this.registers.PC);
                const offset = this.registers.PC;

                if (base < 0x80) {
                    return base + offset;
                }
                return base + offset - 0x100;

            }
            default: {
                throw new Error(`Unknown addressing mode ${mode} detected.`);
            }
        }
    }

    execInstruction(baseName: string, mode: string, addressOrData: Word) {
        switch (baseName) {
            case "SEI": {
                this.registers.P.interrupt = false;
                break;
            }
            case "LDX": {
                if (mode === "immediate") {
                    this.registers.X = addressOrData;
                } else {
                    this.registers.X = this.read(addressOrData);
                }
                this.registers.P.negative = !!(this.registers.X & 0x80);
                this.registers.P.zero = !this.registers.X;
                break;
            }
            case "LDA": {
                if (mode === "immediate") {
                    this.registers.A = addressOrData;
                } else {
                    this.registers.A = this.read(addressOrData);
                }
                this.registers.P.negative = !!(this.registers.A & 0x80);
                this.registers.P.zero = !this.registers.A;
                break;
            }
            case "LDY": {
                if (mode === "immediate") {
                    this.registers.Y = addressOrData;
                } else {
                    this.registers.Y = this.read(addressOrData);
                }
                this.registers.P.negative = !!(this.registers.Y & 0x80);
                this.registers.P.zero = !this.registers.Y;
                break;
            }
            case "TXS": {

                // this.registers.SP = this.registers.X;
                this.registers.SP = this.registers.X + 0x0100;
                break;
            }
            case "STA": {
                this.write(addressOrData, this.registers.A);
                break;
            }
            case "JSR": {

                // ジャンプサブルーチン命令（JSR）によってスタックに格納する復帰アドレスは、
                // 次の命令の一つ前のアドレス（JSRの最後のバイト）であり、
                // リターンサブルーチン命令（RTS）によってインクリメントします
                const PC = this.registers.PC - 1;

                this.push((PC >> 8) & 0xFF);
                this.push(PC & 0xFF);
                this.registers.PC = addressOrData;
                break;
            }
            case "JMP": {
                this.registers.PC = addressOrData;
                break;
            }
            case "INX": {
                this.registers.X = (this.registers.X + 1) & 0xFF;
                this.registers.P.negative = !!(this.registers.X & 0x80);
                this.registers.P.zero = !this.registers.X;
                break;
            }
            case "INY": {
                this.registers.Y = (this.registers.Y + 1) & 0xFF;
                this.registers.P.negative = !!(this.registers.Y & 0x80);
                this.registers.P.zero = !this.registers.Y;
                break;
            }
            case "DEY": {
                this.registers.Y = (this.registers.Y - 1) & 0xFF;
                this.registers.P.negative = !!(this.registers.Y & 0x80);
                this.registers.P.zero = !this.registers.Y;
                break;
            }
            case "BRK": {
                // 割り込みが確認された時、Iフラグがセットされていれば割り込みは無視します。
                // Iフラグがクリアされていれば、割り込み動作を開始します。BRKでは、Bフラグをセットし、PCに1を加算します。
                // 次にPCの上位バイト、下位バイト、ステータスレジスタを順にスタックへ格納します。
                // 次にIフラグをセットし、最後にPCの下位バイトを$FFFEから、上位バイトを$FFFFからフェッチします。
                // IRQと異なる点はBフラグとPCの扱いのみで、あとは同じです。
                // BRKではPCに1を加算するため、BRK命令のあるアドレス+2番地がリターンアドレスとなります。
                const interrupt = this.registers.P.interrupt;
                this.registers.PC++;
                this.push((this.registers.PC >> 8) & 0xFF);
                this.push(this.registers.PC & 0xFF);
                this.registers.P.break = true;
                this.pushStatus();
                this.registers.P.interrupt = true;
                // Ignore interrupt when already set.
                if (!interrupt) {
                    this.registers.PC = this.read(0xFFFE, "Word");
                }
                this.registers.PC--;
                break;
            }
            case "BNE": {
                if (!this.registers.P.zero) {
                    this.registers.PC = addressOrData;
                }
                break;
            }
            case "NOPD": {
                this.registers.PC++;
                break;
            }
            case "NOPI": {
                this.registers.PC += 2;
                break;
            }
            case "BPL": {
                if (!this.registers.P.negative) {
                    this.registers.PC = addressOrData;
                }
                break;
            }
            case "CPX": {
                const data = (mode === "immediate") ? addressOrData : this.read(addressOrData);
                const compared = this.registers.X - data;
                this.registers.P.negative = !!(compared & 0x80);
                this.registers.P.zero = !compared;
                // ?
                this.registers.P.carry = compared >= 0;
                break;
            }
            case "CPY": {
                const data = (mode === "immediate") ? addressOrData : this.read(addressOrData);
                const compared = this.registers.Y - data;
                this.registers.P.negative = !!(compared & 0x80);
                this.registers.P.zero = !compared;
                // ?
                this.registers.P.carry = compared >= 0;
                break;
            }
            case "AND": {
                const data = (mode === "immediate") ? addressOrData : this.read(addressOrData);
                const result = this.registers.A & data;
                this.registers.P.negative = !!(result & 0x80);
                this.registers.P.zero = !result;
                this.registers.A = result & 0xFF;
                break;
            }
            case "INC": {
                const data = this.read(addressOrData);
                const incremented = (data + 1) & 0xFF;
                this.registers.P.negative = !!(incremented & 0x80);
                this.registers.P.zero = !incremented;
                this.write(addressOrData, incremented);
                break;
            }
            case "DEC": {
                const data = this.read(addressOrData);
                const decremented = (data - 1) & 0xFF;
                this.registers.P.negative = !!(decremented & 0x80);
                this.registers.P.zero = !decremented;
                this.write(addressOrData, decremented);
                break;
            }
            case "ADC": {
                const data = (mode === "immediate") ? addressOrData : this.read(addressOrData);
                const operated = this.registers.A + data + this.registers.P.carry;
                this.registers.P.negative = !!(operated & 0x80);
                this.registers.P.zero = !(operated);
                this.registers.P.carry = operated > 0xFF;
                // 異符号の足し算、かつ演算結果の符号が違う場合オーバーフロー
                // most significant bit(0x80)で判定できる
                this.registers.P.overflow =
                    !!(((this.registers.A ^ data) & 0x80) === 0) && !!(((this.registers.A ^ operated) & 0x80) === 1);
                this.registers.A = operated & 0xFF;
                break;
            }
            case "RTS": {
                this.registers.PC = this.pop(); // 下位バイト
                this.registers.PC += this.pop() << 8; // 上位バイト
                this.registers.PC++;
                break;
            }
            case "RTI": {
                this.popStatus();
                this.registers.PC = this.pop(); // 下位バイト
                this.registers.PC += this.pop() << 8; // 上位バイト
                this.registers.P.reserved = true;
                break;
            }
            case "EOR": {
                const data = (mode === "immediate") ? addressOrData : this.read(addressOrData);
                const result = this.registers.A ^ data;
                this.registers.P.negative = !!(result & 0x80);
                this.registers.P.zero = !result;
                this.registers.A = result & 0xFF;
                break;
            }
            case "DEX": {
                this.registers.X = (this.registers.X - 1) & 0xFF;
                this.registers.P.negative = !!(this.registers.X & 0x80);
                this.registers.P.zero = !this.registers.X;
                break;
            }
            case "TYA": {
                this.registers.A = this.registers.Y;
                this.registers.P.negative = !!(this.registers.A & 0x80);
                this.registers.P.zero = !this.registers.A;
                break;
            }
            default: {
                throw new Error(`Unknown instruction ${baseName} detected.`);
            }
        }
    }

    reset() {
        const pc = this.read(0xFFFC, "Word") | 0x8000;

        this.registers.PC = pc;
    }

    processNmi() {
        // console.log("----process nmi-----");
        this.interrupts.deassertNmi();
        // 割り込みが確認された時、割り込み動作を開始します
        // Bフラグをクリアし、PCの上位バイト、 下位バイト、ステータスレジスタを順にスタックへ格納します
        // 次にIフラグをセットし、最後にPCの下位バイトを$FFFAから、上位バイトを$FFFBからフェッチします
        this.registers.P.break = false;
        // console.log("should return to : " + this.registers.PC.toString(16));
        this.push((this.registers.PC >> 8) & 0xFF);
        this.push(this.registers.PC & 0xFF);
        this.pushStatus();
        this.registers.P.interrupt = true;
        this.registers.PC = this.read(0xFFFA, "Word");
        // console.log("PC: " + this.registers.PC.toString(16));
        // console.log("----process nmi end-----");
    }

    run(): number {
        if (this.interrupts.isNmiAssert()) {
            this.processNmi();
        }

        // console.log("PC: " + this.registers.PC.toString(16));
        const opecode = this.fetch(this.registers.PC);

        if (!opecode) {
            throw `${this.registers.PC.toString(16)}: opecode is not defiend`;
        }

        // console.log(instructions[opecode.toString(16).toUpperCase()]);
        if (!instructions[opecode.toString(16).toUpperCase()]) {
            throw "opecode: " + opecode.toString(16);
        }
        const { fullName, baseName, mode, cycle } = instructions[opecode.toString(16).toUpperCase()];
        const addressOrData = this.getAddressOrData(mode);

        // console.log("addressOrdata:" + addressOrData.toString(16));

        this.execInstruction(baseName, mode, addressOrData);

        return cycle;
    }
}
