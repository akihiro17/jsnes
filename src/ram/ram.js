/** @flow*/
import type { Byte, Word } from "../types/common";

export default class Ram {
    ram: Uint8Array;

    constructor(size: number) {
        this.ram = new Uint8Array(size);
    }

    read(addr: Word): Byte {
        return this.ram[addr];
    }

    write(address: Word, data: Byte) {
        this.ram[address] = data;
    }
}
