/** @flow*/

import Rom from "../rom/rom";
import Ram from "../ram/ram";
import Ppu from "../ppu/ppu";
import type { Byte, Word } from "../types/common";

export default class CpuBus {
    progromROM: Rom;
    ram: Ram;
    ppu: Ppu;

    constructor(progromROM: Rom, ppu: Ppu) {
        this.progromROM = progromROM;
        this.ram = new Ram(2048);
        this.ppu = ppu;
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
        else if (address >= 0x8000) {
            return this.progromROM.read(address - 0x8000);
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
            console.log("ppu write:" + address.toString(16));
            this.ppu.write(address - 0x2000, data);
        } else {
            throw "unexpected write address: " + address.toString(16);
        }
    }
}
