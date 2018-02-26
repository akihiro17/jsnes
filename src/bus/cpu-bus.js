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
        return this.progromROM.read(address);
    }

    writeByCpu(address: Word, data: Byte) {
        if (address < 0x0800) {
            this.ram[address] = data;
        }
    }
}
