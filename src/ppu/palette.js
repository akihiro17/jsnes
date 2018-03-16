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
        // const mirror = ((data & 0xFF) % 0x20);
        // if (this.isSpriteMirror(mirror)) {
        //     this.palette[address] = data;
        // }
        // else {
        //     this.palette[address] = data;
        // }
        this.palette[address] = data;
    }

    isSpriteMirror(address: Byte): boolean {
        return (address === 0x10) || (address === 0x14) || (address === 0x18) || (address === 0x1c);
    }

    isBackgroundMirror(address: Byte): boolean {
        return (address === 0x04) || (address === 0x08) || (address === 0x0C);
    }
}
