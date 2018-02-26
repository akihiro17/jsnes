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

const instructions = {
    0x78: { fullName: "SEI", baseName: "SEI", mode: "implied" },
    0xA2: { fullName: "LDX_IMMEDIATE", baseName: "LDX", mode: "immediate" },
    0x9A: { fullName: "TXS_IMPLIED", baseName: "TXS", mode: "implied" },
    0xA9: { fullName: "LDA_IMMEDIATE", baseName: "LDA", mode: "immediate" },
    0x85: { fullName: "STA_ZERO", baseName: "STA", mode: "zeroPage" }
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

    fetch() {
        return this.bus.readByCpu(this.registers.PC++);
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
                this.registers.X = addressOrData;
                this.registers.P.negative = !!(this.registers.X & 0x80);
                this.registers.P.zero = !this.registers.X;
                break;
            }
            case "LDA": {
                if (mode === "implied") {
                    this.registers.a = addressOrData;
                } else {
                    this.registers.a = addressOrData;
                }
                this.registers.P.negative = !!(this.registers.A & 0x80);
                this.registers.P.zero = !this.registers.A;
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
            default: {
                throw new Error(`Unknown instruction ${baseName} detected.`);
            }
        }
    }

    reset() {
        const pc = this.read(0xFFFC, "Word") | 0x8000;

        console.log(pc);
    }

    run() {
        const opecode = this.fetch();
        console.log(opecode.toString(16));
        console.log(instructions[opecode]);
        const { fullName, baseName, mode } = instructions[opecode];
        const addressOrData = this.getAddressOrData(mode);
        this.execInstruction(baseName, mode);

        console.log(addressOrData);
    }
}
