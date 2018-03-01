/** @flow*/

import Ram from "../ram/ram";
import type { Byte, Word } from "../types/common";

export default class PpuBus {
    characterRam: Ram;

    constructor(characterRam: Ram) {
        this.characterRam = characterRam;
    }

    readByPpu(address: Word): Byte {
        return this.characterRam.read(address);
    }

    writeByPpu(address: Word, data: Byte) {
        this.characterRam.write(address, data);
    }
}
