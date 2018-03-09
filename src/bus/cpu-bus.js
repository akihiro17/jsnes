/** @flow*/

import Rom from "../rom/rom";
import Ram from "../ram/ram";
import Ppu from "../ppu/ppu";
import KeyPad from "../key-pad/key-pad";
import Dma from "../dma/dma";
import type { Byte, Word } from "../types/common";

export default class CpuBus {
    programROM: Rom;
    ram: Ram;
    ppu: Ppu;
    keypad: KeyPad
    dma: Dma

    constructor(programROM: Rom, ram: Ram, ppu: Ppu, keypad: KeyPad, dma: Dma) {
        this.programROM = programROM;
        this.ram = ram;
        this.ppu = ppu;
        this.keypad = keypad;
        this.dma = dma;
    }

    readByCpu(address: Word): Byte {

        // console.log("readByCpu: " + address.toString(16));
        if (address < 0x0800) {
            return this.ram.read(address);
        }
        else if (address < 0x4000) {
            // 0x2000～0x2007 PPU レジスタ
            // 0x2008～0x3FFF PPUレジスタのミラー
            return this.ppu.read((address - 0x2000) % 8);
        }
        else if (address === 0x4016) {
            return +this.keypad.read(); // convert boolean into nubmer
        }
        else if (address >= 0xC000) {

            // Mirror, if prom block number equals 1
            if (this.programROM.size() <= 0x4000) {
                return this.programROM.read(address - 0xC000);
            }
            // ブロックが2つの場合はミラーじゃない
            return this.programROM.read(address - 0x8000);
        }
        else if (address >= 0x8000) {
            return this.programROM.read(address - 0x8000);
        }

        // Cannot expect `Byte` as the return type of function because number [1] is incompatible with implicitly-returned
        throw "unexpected read address: " + address.toString(16);
    }

    writeByCpu(address: Word, data: Byte) {
        if (address < 0x0800) {
            this.ram.write(address, data);
        } else if (address < 0x2000) {

            // mirror
        } else if (address < 0x2008) {

            // ppu
            // console.log("ppu write:" + address.toString(16));
            this.ppu.write(address - 0x2000, data);
        } else if (address === 0x4014) {
            // dma
            this.dma.write(data);
        } else if (address === 0x4016) {

            // keypad
            this.keypad.write(data);
        } else {
            throw "unexpected write address: " + address.toString(16);
        }
    }
}
