/** @flow*/

import Rom from "../rom/rom";
import Ram from "../ram/ram";
import type { Byte, Word } from "../types/common";

export default class CpuBus {
    progromROM: Rom;
    ram: Ram;

    constructor(progromROM: Rom) {
        this.progromROM = progromROM;
        this.ram = new Ram(2048);
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
        }
    }
}
