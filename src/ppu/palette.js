/** @flow*/

import type { Byte, Word } from "../types/common";

export default class Palette {
    palette: Uint8Array;

    constructor() {
        this.palette = new Uint8Array(0x20);
    }

    read(): Uint8Array {
        return this.palette;
    }

    write(address: Word, data: Byte) {
        this.palette[this.getPaletteAddress(address)] = data;
    }

    getPaletteAddress(address: Byte): Byte {
        const mirrorDowned = (address & 0xFF) % 0x20;
        return this.isSpriteMirror(address) ? address - 0x10 : address;
    }

    isSpriteMirror(address: Byte) {
        // ただし、0x3F10,0x3F14,0x3F18,0x3F1Cは0x3F00,0x3F04,0x3F08,0x3F0Cのミラーとなっている
        return (address === 0x10) || (address === 0x14) || (address === 0x18) || (address === 0x1C);
    }
}
