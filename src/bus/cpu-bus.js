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
        console.log("readByCpu: " + address.toString(16));
        if (address < 0x0800) {
            return this.ram.read(address);
        } else if (address >= 0x8000) {
            return this.progromROM.read(address - 0x8000);
        }
    }

    writeByCpu(address: Word, data: Byte) {
        if (address < 0x0800) {
            this.ram[address] = data;
        } else if (address < 0x2000) {
            // mirror
        } else if (address < 0x2008) {
            // ppu
            console.log("ppu write:" + address.toString(16));
            this.ppu.write(address - 0x2000, data);
        }
    }
}
