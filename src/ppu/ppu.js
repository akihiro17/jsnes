/** @flow*/

import Ram from "../ram/ram";
import PpuBus from "../bus/ppu-bus";

export default class Ppu {
    cycle: Number;
    line: Number;
    vram: Ram
    bus: PpuBus;
    vramAddress: Word;
    palette: Uint8Array;
    isLowerVramAddr: boolean;

    constructor(ppuBus: PpuBus) {
        this.cycle = 0;
        this.line = 0;
        this.vram = new Ram(0x2000);
        this.bus = ppuBus;
        this.vramAddress = 0x0000;
        this.palette = new Uint8Array(0x20);
        this.isLowerVramAddr = false;
    }

    run(cycle: Number) {
        console.log("cycle: " + cycle);
        this.cycle += cycle;

        if (this.cycle >= 341) {
            this.cycle -= 341;
            this.line++;
        }

        if (this.line <= 240 && this.line % 8 === 0) {
            this.buildBackground();
        }
    }

    buildBackground() {
        const clampedTileY = this.tileY() % 30;

        for (let x = 0; x < 32; x = x + 1) {
            const clampedTileX = ~~(x % 32);
            const tile = this.buildTile(clampedTileX, clampedTileY);
            // console.log("sprite:" + tile["sprite"]);
            // console.log("palette:" + tile["paletteId"]);
        }
    }

    buildTile(tileX: Byte, tileY: Byte) {
        // console.log("tileX:" + tileX);
        // console.log("tileY:" + tileY);

        const blockId = this.getBlockId(tileX, tileY);
        const spriteId = this.getSpriteId(tileX, tileY);
        const attr = this.getAttribute(tileX, tileY);
        const paletteId = (attr >> (blockId * 2)) & 0x03;
        const sprite = this.buildSprite(spriteId);

        if (blockId) {
            // console.log("blockId: " + blockId + " tileX: " + tileX + " tileY: " + tileY);
        }
        if (spriteId) {
            console.log("spriteId: " + spriteId);
        }
        return {
            sprite: sprite,
            paletteId: paletteId
        };
    }

    buildSprite(spriteId: Byte) {
        // 8 x 8
        const sprite = new Array(8).fill(0).map(() => [0, 0, 0, 0, 0, 0, 0, 0]);
        for (let i = 0; i < 16; i = i + 1) {
            const address = spriteId * 16 + i;
            const ram = this.readCharacterRam(address);
            for (let j = 0; j < 8; j = j + 1) {
                if (ram & (0x80 >> j)) {
                    sprite[i % 8][j] += 0x01 << ~~(i / 8);
                }
            }
        }
        return sprite;
    }

    tileY(): Byte {
        return ~~(this.line / 8);
    }

    // 2*2タイル
    // | 0 | 1 |
    // | 2 | 3 |
    getBlockId(tileX: Byte, tileY: Byte): Byte {
        return ~~(tileX % 4 / 2) + ~~(tileY % 4 / 2) * 2;
    }

    getSpriteId(tileX: Byte, tileY: Byte): Byte {
        const address = tileY * 32 + tileX;
        return this.vram.read(address);
    }

    getAttribute(tileX: Byte, tileY: Byte): Byte {
        const address = ~~(tileX / 4) + (~~(tileY / 4) * 8) + 0x03c0;
        return this.vram.read(address);
    }

    readCharacterRam(address: Word): Byte {
        return this.bus.readByPpu(address);
    }

    write(address: Word, data: Byte): void {
        if (address === 0x0006) {
            // PPUメモリアドレス
            console.log("ppu address: " + data.toString(16));
            this.writeVramAddress(data);
            return;
        }
        if (address === 0x0007) {
            // PPUメモリデータ
            console.log("ppu memory data: " + data + " to " + this.vramAddress.toString(16));
            this.writeVramData(data);
            return;
        }
    }

    writeVramAddress(data: Byte): void {
        if (this.isLowerVramAddr) {
            this.vramAddress += data;
            this.isLowerVramAddr = false;
        } else {
            this.vramAddress = data << 8;
            this.isLowerVramAddr = true;
        }
    }

    writeVramData(data: Byte): void {
        if (this.vramAddress >= 0x2000) {
            // pallete
            if (this.vramAddress >= 0x3F00 && this.vramAddress < 0x4000) {
                this.palette[this.vramAddress - 0x3F00] = data;
            } else {
                console.log("vram write: " + this.calculateAddress().toString(16));
                this.writeVram(this.calculateAddress(), data);
            }
        } else {
            this.bus.writeByPpu(this.vramAddress, data);
        }
        this.vramAddress += 0x01;
    }

    writeVram(address: Word, data: Byte) {
        this.vram.write(address, data);
    }

    calculateAddress(): Byte {
        if (this.vramAddr >= 0x3000 && this.vramAddr < 0x3f00) {
            // mirror
            return this.vramAddress - 0x3000;
        } else {
            return this.vramAddress - 0x2000;
        }
    }
}
