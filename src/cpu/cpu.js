/** @flow*/

import CpuBus from "../bus/cpu-bus";
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

export const cycles = [
  /*0x00*/ 7, 6, 2, 8, 3, 3, 5, 5, 3, 2, 2, 2, 4, 4, 6, 6,
  /*0x10*/ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 6, 7,
  /*0x20*/ 6, 6, 2, 8, 3, 3, 5, 5, 4, 2, 2, 2, 4, 4, 6, 6,
  /*0x30*/ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 6, 7,
  /*0x40*/ 6, 6, 2, 8, 3, 3, 5, 5, 3, 2, 2, 2, 3, 4, 6, 6,
  /*0x50*/ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 6, 7,
  /*0x60*/ 6, 6, 2, 8, 3, 3, 5, 5, 4, 2, 2, 2, 5, 4, 6, 6,
  /*0x70*/ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 6, 7,
  /*0x80*/ 2, 6, 2, 6, 3, 3, 3, 3, 2, 2, 2, 2, 4, 4, 4, 4,
  /*0x90*/ 2, 6, 2, 6, 4, 4, 4, 4, 2, 4, 2, 5, 5, 4, 5, 5,
  /*0xA0*/ 2, 6, 2, 6, 3, 3, 3, 3, 2, 2, 2, 2, 4, 4, 4, 4,
  /*0xB0*/ 2, 5, 2, 5, 4, 4, 4, 4, 2, 4, 2, 4, 4, 4, 4, 4,
  /*0xC0*/ 2, 6, 2, 8, 3, 3, 5, 5, 2, 2, 2, 2, 4, 4, 6, 6,
  /*0xD0*/ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,
  /*0xE0*/ 2, 6, 3, 8, 3, 3, 5, 5, 2, 2, 2, 2, 4, 4, 6, 6,
  /*0xF0*/ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,
];

const instructions = {
    0x78: { fullName: "SEI", baseName: "SEI", mode: "implied", cycle: cycles[0x78]},
    0xA2: { fullName: "LDX_IMMEDIATE", baseName: "LDX", mode: "immediate", cycle: cycles[0xA2] },
    0x9A: { fullName: "TXS_IMPLIED", baseName: "TXS", mode: "implied", cycle: cycles[0x9A] },
    0xA9: { fullName: "LDA_IMMEDIATE", baseName: "LDA", mode: "immediate", cycle: cycles[0xA9] },
    0x85: { fullName: "STA_ZERO", baseName: "STA", mode: "zeroPage", cycle: cycles[0x85] },
    0x20: { fullName: "JSR_ABSOLUTE", baseName: "JSR", mode: "absolute", cycle: cycles[0x20] },
    0x89: { fullName: 'NOPD', baseName: 'NOPD', mode: 'implied', cycle: cycles[0x89] },
    0x8D: { fullName: 'STA_ABSOLUTE', baseName: 'STA', mode: 'absolute', cycle: cycles[0x8D] },
    0xA0: { fullName: "LDY_IMMEDIATE", baseName: "LDY", mode: "immediate", cycle: cycles[0xA0] },
    0xBD: { fullName: 'LDA_ABSX', baseName: 'LDA', mode: 'absoluteX', cycle: cycles[0xBD] },
    0xE8: { fullName: 'INX', baseName: 'INX', mode: 'implied', cycle: cycles[0xE8] },
    0x88: { fullName: 'DEY', baseName: 'DEY', mode: 'implied', cycle: cycles[0x88] },
    0xD0: { fullName: 'BNE', baseName: 'BNE', mode: 'relative', cycle: cycles[0xD0] },
    0x4C: { fullName: 'JMP_ABSOLUTE', baseName: 'JMP', mode: 'absolute', cycle: cycles[0x4C]},
    0x00: { fullName: 'BRK', baseName: 'BRK', mode: 'implied', cycle: cycles[0x00] }
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

    constructor(bus: CpuBus) {
        this.registers = {
            ...defaultRegisters,
            P: { ...defaultRegisters.P }
        };
        this.bus = bus;
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
        this.write(this.registers.SP | 0xFF, data);
        this.registers.SP -= 1;
    }

    pop(): Byte {
        this.registers.SP += 1;
        return this.read(this.registers.SP);
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
            case "absolute": {
                return this.fetch(this.registers.PC, "Word");
            }
            case "absoluteX": {
                return (this.fetch(this.registers.PC, "Word") + this.registers.X) & 0xFFFF;
            }
            case "relative": {
                const base = this.fetch(this.registers.PC);
                const offset = this.registers.PC;
                if (base < 0x80) {
                    return base + offset;
                } else {
                    return base + offset - 0x100;
                }
            }
            default: {
                throw new Error(`Unknown addressing mode ${mode} detected.`);
            }
        }
    }

    execInstruction(baseName: string, mode: string, addressOrData: Word) {
        switch (baseName) {
            case "SEI": {
                this.registers.interrupt = false;
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
            case "DEY": {
                this.registers.Y = (this.registers.Y - 1) & 0xFF;
                this.registers.P.negative = !!(this.registers.Y & 0x80);
                this.registers.P.zero = !this.registers.Y;
                break;
            }
            case "BRK": {
                break;
            }
            case "BNE": {
                if (this.registers.P.zero === false) {
                    this.registers.PC = addressOrData;
                }
                break;
            }
            case "NOPD": {
                this.registers.PC++;
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

    run(): Number {
        // console.log("PC: " + this.registers.PC.toString(16));
        const opecode = this.fetch(this.registers.PC);
        // console.log("opecode: " + opecode.toString(16));
        // console.log(instructions[opecode]);
        const { fullName, baseName, mode, cycle } = instructions[opecode];
        const addressOrData = this.getAddressOrData(mode);
        // console.log("addressOrdata:" + addressOrData.toString(16));
        this.execInstruction(baseName, mode, addressOrData);

        return cycle;
    }
}
