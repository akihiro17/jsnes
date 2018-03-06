/** @flow*/

import Ppu from "../ppu/ppu";
import Ram from "../ram/ram";
import type { Byte, Word } from "../types/common";

export default class Dma {
    ramAddress: Byte;
    ppu: Ppu;
    ram: Ram;
    isDmaProcessing: boolean;

    constructor(ppu: Ppu, ram: Ram) {
        this.ramAddress = 0x00;
        this.ppu = ppu;
        this.ram = ram;
        this.isDmaProcessing = false;
    }

    isDmaProcessing(): boolean {
        return this.isDmaProcessing;
    }

    write(data: Byte) {
        // $4014レジスタに転送するRAMのアドレスの百の位を書き込みます
        // 3(11) => 300(1100000000)
        this.ramAddress = data << 8;
        this.isDmaProcessing = true;
    }

    run() {
        // スプライトデータは4バイト(y, index, attribute, x)l
        for(let i = 0; i < 0x100; i += 1) {
            this.ppu.transferSprite(i, this.ram.read(this.ramAddress + i));
        }
        this.isDmaProcessing = false;
    }
}
