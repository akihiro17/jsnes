/** @flow*/
import type { Byte, Word } from "../types/common";

export default class Rom {
    rom: Uint8Array;

    constructor(buffer: Uint8Array) {
        this.rom = Uint8Array.from(buffer);
    }

    read(addr: Word): Byte {
        return this.rom[addr];
    }

    size(): number {
        return this.rom.length;
    }
}
