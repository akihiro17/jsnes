/** @flow*/

import Ram from "../ram/ram";
import PpuBus from "../bus/ppu-bus";

// スプライトRAMは256バイトが存在します
// 一つのスプライトに4バイトが割り当てられるため、64個分のスプライトデータが保持できます。
const SPRITES_NUM = 0x100;

export default class Ppu {
    cycle: Number;
    line: Number;
    vram: Ram
    bus: PpuBus;
    vramAddress: Word;
    palette: Uint8Array;
    isLowerVramAddr: boolean;
    background;
    spriteAddress: Byte;
    spriteRam: Ram;
    sprites;

    constructor(ppuBus: PpuBus) {
        this.cycle = 0;
        this.line = 0;
        this.vram = new Ram(0x2000);
        this.bus = ppuBus;
        this.vramAddress = 0x0000;
        this.palette = new Uint8Array(0x20);
        this.isLowerVramAddr = false;
        this.background = [];
        this.spriteAddress = 0x00;
        this.spriteRam = new Ram(0x100);
        this.sprites = [];
    }

    run(cycle: Number) {
        this.cycle += cycle;

        if(this.line === 0) {
            this.background = [];
            this.buildSprites();
        }

        if (this.cycle >= 341) {
            this.cycle -= 341;
            this.line++;

            if (this.line <= 240 && this.line % 8 === 0) {
                this.buildBackground();
            }

            // 20ライン分Vblankという期間が設けられています
            // Vblank の前後に post-render/pre-render scanlineというアイドル状態が存在するため、262ライン分の描画期間が必要となります
            if (this.line === 262) {
                this.line = 0;
                return {
                    background: this.background,
                    palette: this.palette
                };
            }
        }

        return null;
    }

    buildBackground() {
        const clampedTileY = this.tileY() % 30;

        if (clampedTileY > 30) {
            throw "clampedTileY: " + clampedTileY;
        }

        for (let x = 0; x < 32; x++) {
            const clampedTileX = x % 32;
            const tile = this.buildTile(clampedTileX, clampedTileY);
            this.background.push(tile);
            // console.log("sprite:" + tile["sprite"]);
            // console.log("palette:" + tile["paletteId"]);
        }

        if (this.background.length > 30 * 32) {
            throw "background length: " + this.background.length + " tileY: " + this.tileY();
        }
    }

    buildTile(tileX: Byte, tileY: Byte) {
        // console.log("tileX:" + tileX);
        // console.log("tileY:" + tileY);

        const blockId = this.getBlockId(tileX, tileY);
        // 0x23C0が0xE4であれば1110 0100だから
        // それぞれのブロックのパレットIDは以下のようになる
        // ブロック0: 00
        // ブロック1: 01
        // ブロック2: 10
        // ブロック3: 11
        const attr = this.getAttribute(tileX, tileY);
        const paletteId = (attr >> (blockId * 2)) & 0x03;
        const spriteId = this.getSpriteId(tileX, tileY);
        const sprite = this.buildSprite(spriteId);

        if (blockId) {
            // console.log("blockId: " + blockId + " tileX: " + tileX + " tileY: " + tileY);
        }
        if (spriteId) {
            // console.log("spriteId: " + spriteId);
            // console.log("sprite: " + sprite);
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

    buildSprites() {
        const offset = 0x0000;
        // offset	用途
        // 0	Y座標-1
        // 1	パターンインデックス
        // 2    アトリビュート
        // 3	X座標
        for(let i = 0; i < SPRITES_NUM; i = i + 4) {
            const address = i + offset;
            const y = this.spriteRam.read(i);
            const spriteId = this.spriteRam.read(i + 1);
            const attribute = this.spriteRam.read(i + 2);
            const x = this.spriteRam.read(i + 3);

            const sprite = this.buildSprite(spriteId);
            this.sprites[i / 4] = {sprite, x, y, attribute, spriteId};
        }
    }

    tileY(): Byte {
        return ~~(this.line / 8);
    }

    // 1ブロックは、2x2タイル
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
        if (address === 0x0003) {
            this.spriteAddress = data;
            return;
        }
        if (address === 0x0003) {
            this.spriteRam.write(this.spriteAddress, data);
            this.spriteAddress++;
            return;
        }
        if (address === 0x0006) {
            // PPUメモリアドレス
            // console.log("ppu address: " + data.toString(16));
            this.writeVramAddress(data);
            return;
        }
        if (address === 0x0007) {
            // PPUメモリデータ
            // console.log("ppu memory data: " + data + " to " + this.vramAddress.toString(16));
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
                console.log("palette write");
                this.palette[this.vramAddress - 0x3F00] = data;
            } else {
                // console.log("vram write: " + this.calculateAddress().toString(16));
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
