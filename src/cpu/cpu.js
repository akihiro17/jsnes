/** @flow*/

import CpuBus from "../bus/cpu-bus";
import Interrupts from "../interrupts/interrupts";
import type { Byte, Word } from "../types/common";
import { instructions } from "./instruction";

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
    hasBranched: boolean;

    constructor(bus: CpuBus, interrupts: Interrupts) {
        this.registers = {
            ...defaultRegisters,
            P: { ...defaultRegisters.P }
        };
        this.bus = bus;
        this.interrupts = interrupts;
        this.hasBranched = false;
    }

    read(address: Word, size?: "Byte" | "Word"): Byte {
        address &= 0xFFFF;
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

    branch(address: Word) {
        this.registers.PC = address;
        this.hasBranched = true;
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

    getAddressOrData(mode: string): { addressOrData: Word, additionalCycle: number } {
        switch (mode) {
            case "accumulator": {
                return {
                    addressOrData: 0x00,
                    additionalCycle: 0
                };
            }
            case "implied": {
                return {
                    addressOrData: 0x00,
                    additionalCycle: 0
                };
            }
            case "immediate": {
                return {
                    addressOrData: this.fetch(this.registers.PC),
                    additionalCycle: 0
                };
            }
            case "relative": {
                const base = this.fetch(this.registers.PC);
                const offset = this.registers.PC;

                const address = base < 0x80 ? base + offset : base + offset - 0x100;

                return {
                    addressOrData: address,
                    additionalCycle: (address & 0xFF00) !== (this.registers.PC & 0xFF00) ? 1 : 0
                };
            }
            case "zeroPage": {
                return {
                    addressOrData: this.fetch(this.registers.PC),
                    additionalCycle: 0
                };
            }
            case "zeroPageX": {
                return {
                    addressOrData: (this.fetch(this.registers.PC) + this.registers.X) & 0xFF,
                    additionalCycle: 0
                };
            }
            case "zeroPageY": {
                return {
                    addressOrData: (this.fetch(this.registers.PC) + this.registers.Y) & 0xFF,
                    additionalCycle: 0
                };
            }
            case "absolute": {
                return {
                    addressOrData: this.fetch(this.registers.PC, "Word"),
                    additionalCycle: 0
                };
            }
            case "absoluteX": {
                const address = this.fetch(this.registers.PC, "Word");

                return {
                    addressOrData: (address + this.registers.X) & 0xFFFF,
                    additionalCycle: (address & 0xFF00) !== ((address + this.registers.X) & 0xFF00) ? 1 : 0
                };
            }
            case "absoluteY": {
                const address = this.fetch(this.registers.PC, "Word");

                return {
                    addressOrData: (address + this.registers.Y) & 0xFFFF,
                    additionalCycle: (address & 0xFF00) !== ((address + this.registers.Y) & 0xFF00) ? 1 : 0
                };
            }
            case "preIndexedIndirect": {

                // 上位アドレスを$00とし、 また2番目のバイトにインデックスレジスタXを加算（8）した値を下位アドレスとします。
                // このアドレスに格納されている値を実効アドレスの下位バイト、 そしてその次のアドレスに格納されている値を実効アドレスの上位バイトとします。 このインクリメントにおいてキャリーは無視します
                const baseAddr = (this.fetch(this.registers.PC) + this.registers.X) & 0xFF;
                const addr = this.read(baseAddr) + (this.read((baseAddr + 1) & 0xFF) << 8);

                return {
                    addressOrData: addr & 0xFFFF,
                    additionalCycle: (addr & 0xFF00) !== (baseAddr & 0xFF00) ? 1 : 0
                };
            }
            case "postIndexedIndirect": {

                // まず上位アドレスを$00とし、下位アドレスとして2番目のバイトを使用します。
                // このアドレスに格納されている値を次の上位アドレス、 その次のアドレスに格納されている値を次の下位アドレスとします。
                // このときのインクリメントにおけるキャリーは無視します。 得られたアドレスにインデックスレジスタYを加算（16）したものを実効アドレスとします
                const addrOrData = this.fetch(this.registers.PC);
                const baseAddr = this.read(addrOrData) + (this.read((addrOrData + 1) & 0xFF) << 8);
                const addr = baseAddr + this.registers.Y;

                return {
                    addressOrData: addr & 0xFFFF,
                    additionalCycle: (addr & 0xFF00) !== (baseAddr & 0xFF00) ? 1 : 0
                };
            }
            case "indirectAbsolute": {

                // Absolute Addressingで得られる番地に格納されている値を下位アドレス、
                // その次の番地に格納されている値を上位アドレスとした番地を演算対象とする

                // 2、3番目のバイトで示されるアドレスに格納されている値を実効アドレスの下位バイト、
                // その次のアドレスに格納されている値を実効アドレスの上位バイトとします。
                // このインクリメントで下位バイトからのキャリーは無視します。(addrOrData & 0xFF00) | (((addrOrData & 0xFF) + 1) & 0xFF)
                const addrOrData = this.fetch(this.registers.PC, "Word");
                const addr = this.read(addrOrData) + (this.read((addrOrData & 0xFF00) | (((addrOrData & 0xFF) + 1) & 0xFF)) << 8);

                return {
                    addressOrData: addr & 0xFFFF,
                    additionalCycle: 0
                };
            }
            default: {
                throw new Error(`Unknown addressing mode ${mode} detected.`);
            }
        }
    }

    execInstruction(baseName: string, mode: string, addressOrData: Word) {
        this.hasBranched = false;
        switch (baseName) {
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
            case "STA": {
                this.write(addressOrData, this.registers.A);
                break;
            }
            case "STX": {
                this.write(addressOrData, this.registers.X);
                break;
            }
            case "STY": {
                this.write(addressOrData, this.registers.Y);
                break;
            }
            case "TAX": {
                this.registers.X = this.registers.A;
                this.registers.P.negative = !!(this.registers.X & 0x80);
                this.registers.P.zero = !this.registers.X;
                break;
            }
            case "TAY": {
                this.registers.Y = this.registers.A;
                this.registers.P.negative = !!(this.registers.Y & 0x80);
                this.registers.P.zero = !this.registers.Y;
                break;
            }
            case "TXA": {
                this.registers.A = this.registers.X;
                this.registers.P.negative = !!(this.registers.A & 0x80);
                this.registers.P.zero = !this.registers.A;
                break;
            }
            case "TXS": {
                this.registers.SP = this.registers.X + 0x0100;
                break;
            }
            case "TYA": {
                this.registers.A = this.registers.Y;
                this.registers.P.negative = !!(this.registers.A & 0x80);
                this.registers.P.zero = !this.registers.A;
                break;
            }
            case "TSX": {
                this.registers.X = this.registers.SP & 0xFF;
                this.registers.P.negative = !!(this.registers.X & 0x80);
                this.registers.P.zero = !this.registers.X;
                break;
            }
            case "ADC": {
                const data = (mode === "immediate") ? addressOrData : this.read(addressOrData);
                const operated = this.registers.A + data + this.registers.P.carry;

                this.registers.P.negative = !!(operated & 0x80);
                this.registers.P.zero = !(operated & 0xFF);
                this.registers.P.carry = operated > 0xFF;

                // 同符号の足し算、かつ演算結果の符号が違う場合オーバーフロー
                // most significant bit(0x80)で判定できる
                this.registers.P.overflow = (
                    !(((this.registers.A ^ data) & 0x80) !== 0) && ((this.registers.A ^ operated) & 0x80) !== 0
                );
                this.registers.A = operated & 0xFF;
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
            case "BIT": {

                // メモリのデータをAでテストします。
                // A and M の結果でZフラグをセットし、Mのビット7をNへ、ビット6をVへ転送します。
                // flags: N V Z
                const data = (mode === "immediate") ? addressOrData : this.read(addressOrData);

                this.registers.P.zero = !(this.registers.A & data);
                this.registers.P.negative = !!(data & 0x80);
                this.registers.P.overflow = !!(data & 0x40);
                break;
            }
            case "CMP": {
                const data = (mode === "immediate") ? addressOrData : this.read(addressOrData);
                const compared = this.registers.A - data;

                this.registers.P.negative = !!(compared & 0x80);
                this.registers.P.zero = !(compared & 0xFF);

                // ?
                this.registers.P.carry = compared >= 0;
                break;
            }
            case "CPX": {
                const data = (mode === "immediate") ? addressOrData : this.read(addressOrData);
                const compared = this.registers.X - data;

                this.registers.P.negative = !!(compared & 0x80);
                this.registers.P.zero = !(compared & 0xFF);

                // ?
                this.registers.P.carry = compared >= 0;
                break;
            }
            case "CPY": {
                const data = (mode === "immediate") ? addressOrData : this.read(addressOrData);
                const compared = this.registers.Y - data;

                this.registers.P.negative = !!(compared & 0x80);
                this.registers.P.zero = !(compared & 0xFF);

                // ?
                this.registers.P.carry = compared >= 0;
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
            case "DEX": {
                this.registers.X = (this.registers.X - 1) & 0xFF;
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
            case "EOR": {
                const data = (mode === "immediate") ? addressOrData : this.read(addressOrData);
                const result = this.registers.A ^ data;

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
            case "LSR": {
                if (mode === "accumulator") {

                    // Aを右シフト、ビット7には0
                    // Aのビット0 -> C
                    const acc = this.registers.A & 0xFF; // こうすると右シフトでビット7に0がはいる

                    this.registers.P.carry = !!(acc & 0x01);
                    this.registers.A = acc >> 1;
                    this.registers.P.zero = !this.registers.A;
                } else {
                    const data = this.read(addressOrData);

                    this.registers.P.carry = !!(data & 0x01);
                    this.registers.P.zero = !(data >> 1);
                    this.write(addressOrData, data >> 1);
                }

                // ビット7が0だから
                this.registers.P.negative = false;
                break;
            }
            case "ORA": {
                const data = (mode === "immediate") ? addressOrData : this.read(addressOrData);
                const result = this.registers.A | data;

                this.registers.P.negative = !!(result & 0x80);
                this.registers.P.zero = !result;
                this.registers.A = result & 0xFF;
                break;
            }
            case "ASL": {
                if (mode === "accumulator") {

                    // Aを左シフト、ビット0には0
                    // C <- Aのビット7
                    const acc = this.registers.A;

                    this.registers.A = (acc << 1) & 0xFF;
                    this.registers.P.carry = !!(acc & 0x80);
                    this.registers.P.zero = !(this.registers.A);
                    this.registers.P.negative = !!(this.registers.A & 0x80);
                } else {
                    const data = this.read(addressOrData);
                    const dataToWrite = (data << 1) & 0xFF;

                    this.write(addressOrData, dataToWrite);
                    this.registers.P.carry = !!(data & 0x80);
                    this.registers.P.zero = !(dataToWrite);
                    this.registers.P.negative = !!(dataToWrite & 0x80);
                }
                break;
            }
            case "ROL": {
                if (mode === "accumulator") {

                    // Aを左シフト、ビット0にはC
                    // C <- Aのビット7
                    const acc = this.registers.A;

                    this.registers.A = (acc << 1) & 0xFF | (this.registers.P.carry ? 0x01 : 0x00);
                    this.registers.P.carry = !!(acc & 0x80);
                    this.registers.P.zero = !(this.registers.A);
                    this.registers.P.negative = !!(this.registers.A & 0x80);
                } else {
                    const data = this.read(addressOrData);
                    const dataToWrite = (data << 1) & 0xFF | (this.registers.P.carry ? 0x01 : 0x00);

                    this.write(addressOrData, dataToWrite);

                    // またASL、ROL命令ではAのビット7を、LSR、ROR命令ではAのビット0をストアします
                    this.registers.P.carry = !!(data & 0x80);
                    this.registers.P.zero = !(dataToWrite);
                    this.registers.P.negative = !!(dataToWrite & 0x80);
                }
                break;
            }
            case "ROR": {
                if (mode === "accumulator") {

                    // Aを右シフト、ビット7にはC
                    // C <- Aのビット0
                    const acc = this.registers.A;

                    this.registers.A = (acc >> 1) | (this.registers.P.carry ? 0x80 : 0x00);
                    this.registers.P.carry = !!(acc & 0x01);
                    this.registers.P.zero = !(this.registers.A);
                    this.registers.P.negative = !!(this.registers.A & 0x80);
                } else {
                    const data = this.read(addressOrData);
                    const dataToWrite = (data >> 1) | (this.registers.P.carry ? 0x80 : 0x00);

                    this.write(addressOrData, dataToWrite);

                    // またASL、ROL命令ではAのビット7を、LSR、ROR命令ではAのビット0をストアします
                    this.registers.P.carry = !!(data & 0x01);
                    this.registers.P.zero = !(dataToWrite);
                    this.registers.P.negative = !!(dataToWrite & 0x80);
                }
                break;
            }
            case "SBC": {
                const data = (mode === "immediate") ? addressOrData : this.read(addressOrData);

                // A - M - not C -> A
                const operated = this.registers.A - data - (this.registers.P.carry ? 0 : 1);

                this.registers.P.negative = !!(operated & 0x80);
                this.registers.P.zero = !(operated & 0xFF);

                // ?
                this.registers.P.carry = operated >= 0x00;

                // 同符号の足し算(=異符号の引き算)、かつ演算結果の符号が違う場合オーバーフロー
                // most significant bit(0x80)で判定できる
                this.registers.P.overflow = (
                    (((this.registers.A ^ data) & 0x80) !== 0) && ((this.registers.A ^ operated) & 0x80) !== 0
                );
                this.registers.A = operated & 0xFF;
                break;
            }
            case "PHA": {
                this.push(this.registers.A);
                break;
            }
            case "PLA": {
                this.registers.A = this.pop();
                this.registers.P.negative = !!(this.registers.A & 0x80);
                this.registers.P.zero = !this.registers.A;
                break;
            }
            case "PHP": {

                // ?
                this.registers.P.break = true;
                this.pushStatus();
                break;
            }
            case "PLP": {
                this.popStatus();

                // ?
                this.registers.P.reserved = true;
                break;
            }
            case "JMP": {
                this.registers.PC = addressOrData;
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
            case "BCC": {
                if (!this.registers.P.carry) {
                    this.branch(addressOrData);
                }
                break;
            }
            case "BCS": {
                if (this.registers.P.carry) {
                    this.branch(addressOrData);
                }
                break;
            }
            case "BEQ": {
                if (this.registers.P.zero) {
                    this.branch(addressOrData);
                }
                break;
            }
            case "BNE": {
                if (!this.registers.P.zero) {
                    this.branch(addressOrData);
                }
                break;
            }
            case "BVC": {
                if (!this.registers.P.overflow) {
                    this.branch(addressOrData);
                }
                break;
            }
            case "BVS": {
                if (this.registers.P.overflow) {
                    this.branch(addressOrData);
                }
                break;
            }
            case "BPL": {
                if (!this.registers.P.negative) {
                    this.branch(addressOrData);
                }
                break;
            }
            case "BMI": {
                if (this.registers.P.negative) {
                    this.branch(addressOrData);
                }
                break;
            }
            case "CLD": {
                this.registers.P.decimal = false;
                break;
            }
            case "SED": {
                this.registers.P.decimal = true;
                break;
            }
            case "CLV": {
                this.registers.P.overflow = false;
                break;
            }
            case "CLC": {
                this.registers.P.carry = false;
                break;
            }
            case "SEC": {
                this.registers.P.carry = true;
                break;
            }
            case "SEI": {
                this.registers.P.interrupt = true;
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
            case "NOPI": {
                this.registers.PC += 2;
                break;
            }
            case "NOPD": {
                this.registers.PC++;
                break;
            }
            case "NOP": {
                break;
            }
            case "LAX": {

                // Shortcut for LDA value then TAX.
                this.registers.A = this.registers.X = this.read(addressOrData);
                this.registers.P.negative = !!(this.registers.A & 0x80);
                this.registers.P.zero = !this.registers.A;
                break;
            }
            case "SAX": {

                // Stores the bitwise AND of A and X. As with STA and STX, no flags are affected.
                this.write(addressOrData, this.registers.A & this.registers.X);
                break;
            }
            default: {
                throw new Error(`Unknown instruction ${baseName}_${mode} detected.`);
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

    processIrq() {

        /*
          割り込みが確認された時、Iフラグがセットされていれば割り込みは無視します。
          Iフラグがクリアされていれば、割り込み動作を開始します。BRK割り込みと区別するためにBフラグはクリアします。
          次にPCの上位バイト、下位バイト、ステータスレジスタを順にスタックへ格納します。
          次にIフラグをセットし、最後にPCの下位バイトを$FFFEから、上位バイトを$FFFFからフェッチします。
          NMIと異なる点は、Iフラグによる無効化とベクタです。
        */
        if (this.registers.P.interrupt) {
            return;
        }
        this.interrupts.deassertIrq();

        this.registers.P.break = false;
        this.push((this.registers.PC >> 8) & 0xFF);
        this.push(this.registers.PC & 0xFF);
        this.pushStatus();
        this.registers.P.interrupt = true;
        this.registers.PC = this.read(0xFFFE, "Word");
    }

    showRegisters() {
        const status: Byte =
                  (+this.registers.P.negative) << 7 |
                  (+this.registers.P.overflow) << 6 |
                  (+this.registers.P.reserved) << 5 |
                  (+this.registers.P.break) << 4 |
                  (+this.registers.P.decimal) << 3 |
                  (+this.registers.P.interrupt) << 2 |
                  (+this.registers.P.zero) << 1 |
                  (+this.registers.P.carry);

        /* eslint-disable no-console */
        console.log("A:", this.registers.A.toString(16), "X:", this.registers.X.toString(16),
            "Y:", this.registers.Y.toString(16), "P:", status.toString(16),
            "sp:", this.registers.SP.toString(16));
        /* eslint-enable no-console */
    }

    run(): number {
        if (this.interrupts.isNmiAssert()) {
            this.processNmi();
        }

        if (this.interrupts.isIrqAssert()) {
            this.processIrq();
        }

        // console.log("PC: " + this.registers.PC.toString(16));
        const opecode = this.fetch(this.registers.PC);

        if (!opecode) {
            throw `${this.registers.PC.toString(16)}: opecode is not defiend.`;
        }

        // console.log(instructions[opecode.toString(16).toUpperCase()]);
        const instruction = opecode <= 0x0F
            ? instructions[`0${opecode.toString(16).toUpperCase()}`]
            : instructions[opecode.toString(16).toUpperCase()];

        if (!instruction) {
            throw `opecode: ${opecode.toString(16)}`;
        }

        /* eslint-disable no-unused-vars */
        const { fullName, baseName, mode, cycle } = instruction;
        /* eslint-enable no-unused-vars */
        const { addressOrData, additionalCycle } = this.getAddressOrData(mode);

        this.execInstruction(baseName, mode, addressOrData);

        return cycle + additionalCycle + (this.hasBranched ? 1 : 0);
    }
}
