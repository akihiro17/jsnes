/** @flow*/

import Ram from "../ram/ram";
import PpuBus from "../bus/ppu-bus";
import Interrupts from "../interrupts/interrupts";
import Palette from "./palette";
import type { Byte, Word } from "../types/common";

// スプライトRAMは256バイトが存在します
// 一つのスプライトに4バイトが割り当てられるため、64個分のスプライトデータが保持できます。
const SPRITES_NUM = 0x100;

export type Sprite = $ReadOnlyArray<$ReadOnlyArray<number>>

export type SpriteWithAttribute = $Exact<{
    sprite: Sprite;
    x: Byte;
    y: Byte;
    attribute: Byte;
    spriteId: number;
}>;

export type Tile = $Exact<{
    sprite: Sprite;
    paletteId: Byte;
    scrollX: Byte;
    scrollY: Byte;
}>

export type RenderingData = $Exact<{
    background: ?Array<Tile>;
    palette: Uint8Array;
    sprites: ?$ReadOnlyArray<SpriteWithAttribute>;
}>

export type Config = $Exact<{
  isHorizontalMirror: boolean;
}>;

export default class Ppu {
    cycle: number;
    line: number;
    vram: Ram
    bus: PpuBus;
    vramAddress: Word;
    palette: Palette;
    isLowerVramAddr: boolean;
    background: Array<Tile>;
    spriteAddress: Byte;
    spriteRam: Ram;
    sprites: Array<SpriteWithAttribute>;
    registers: Uint8Array;
    interrupts: Interrupts;
    scrollX: Byte;
    scrollY: Byte;
    isHorizontalScroll: boolean;
    config: Config;

    constructor(ppuBus: PpuBus, interrupts: Interrupts, config: Config) {
        this.cycle = 0;
        this.line = 0;
        this.vram = new Ram(0x2000);
        this.bus = ppuBus;
        this.vramAddress = 0x0000;
        this.palette = new Palette();
        this.isLowerVramAddr = false;
        this.background = [];
        this.spriteAddress = 0x00;
        this.spriteRam = new Ram(0x100);
        this.sprites = [];
        this.registers = new Uint8Array(0x08);
        this.interrupts = interrupts;
        this.scrollX = 0;
        this.scrollY = 0;
        this.isHorizontalScroll = true;
        this.config = config;
    }

    run(cycle: number): ?RenderingData {
        this.cycle += cycle;

        if (this.line === 0) {
            this.background = [];
            this.buildSprites();
        }

        if (this.cycle >= 341) {
            this.cycle -= 341;
            this.line++;

            if (this.hasSpriteHit()) {
                this.setSpriteHit();
            }

            if (this.line <= 240 && this.line % 8 === 0 && this.scrollY <= 240) {
                this.buildBackground();
            }

            if (this.line === 241) {
                this.setVblank();

                // this.clearSpriteHit();

                // vBlank割り込み
                if (this.vBlankIrqEnabled()) {

                    // console.log("vBlank interrupt");
                    this.interrupts.assertNmi();
                }
            }

            // 20ライン分Vblankという期間が設けられています
            // Vblank の前後に post-render/pre-render scanlineというアイドル状態が存在するため、262ライン分の描画期間が必要となります
            if (this.line === 262) {
                this.line = 0;
                this.clearVblank();
                this.clearSpriteHit();
                this.interrupts.deassertNmi();
                return {
                    background: this.isBackgroundEnable ? this.background : null,
                    palette: this.palette.read(),
                    sprites: this.sprites
                };
            }
        }

        return null;
    }

    buildBackground() {
        const clampedTileY = this.tileY() % 30;

        // 1ブロックは、2x2タイル
        // | 0 | 1 |
        // | 2 | 3 |
        // 1ブロックは32 x 30タイルだから、y座標が31~40タイルのときブロックIDのオフセットは2
        const tableIdOffset = ((~~(this.tileY() / 30)) % 2) ? 2 : 0;

        if (clampedTileY > 30) {
            throw `clampedTileY: ${clampedTileY}`;
        }

        for (let x = 0; x < 32; x++) {
            const tileX = x + this.scrollTileX();
            const clampedTileX = tileX % 32;
            const nameTableId = (~~(tileX / 32) % 2) + tableIdOffset;
            const nameTableAddressOffset = nameTableId * 0x0400; // 0x400はネームテーブルと属性テーブルの合計サイズ
            const tile = this.buildTile(clampedTileX, clampedTileY, nameTableAddressOffset);

            this.background.push(tile);

            // console.log("sprite:" + tile["sprite"]);
            // console.log("palette:" + tile["paletteId"]);
        }

        if (this.background.length > 30 * 32) {
            throw `background length: ${this.background.length} tileY: ${this.tileY()}`;
        }
    }

    buildTile(tileX: Byte, tileY: Byte, offset: Word) {

        // console.log("tileX:" + tileX);
        // console.log("tileY:" + tileY);

        const blockId = this.getBlockId(tileX, tileY);

        // 0x23C0が0xE4であれば1110 0100だから
        // それぞれのブロックのパレットIDは以下のようになる
        // ブロック0: 00
        // ブロック1: 01
        // ブロック2: 10
        // ブロック3: 11
        const attr = this.getAttribute(tileX, tileY, offset);
        const paletteId = (attr >> (blockId * 2)) & 0x03;
        const spriteId = this.getSpriteId(tileX, tileY, offset);
        const sprite = this.buildSprite(spriteId, this.backgroundTableOffset());

        if (tileX === 0 && tileY === 1) {
            // console.log("----");
            // console.log(`attr: ${attr}`);
            // console.log(`paletteId: ${paletteId}`);
            // console.log(`spriteId: ${spriteId}`);
            // console.log("----");
        }

        return {
            sprite,
            paletteId,
            scrollX: this.scrollX,
            scrollY: this.scrollY
        };
    }

    buildSprite(spriteId: Byte, offset: Word) {

        // 8 x 8
        const sprite = new Array(8).fill(0).map(() => [0, 0, 0, 0, 0, 0, 0, 0]);

        for (let i = 0; i < 16; i = i + 1) {
            const address = spriteId * 16 + i + offset;
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
        const offset = this.spriteTableOffset();

        // offset	用途
        // 0	Y座標-1
        // 1	パターンインデックス
        // 2    アトリビュート
        // 3	X座標

        for (let i = 0; i < SPRITES_NUM; i = i + 4) {
            const address = i + offset;

            // INFO: Offset sprite Y position, because First and last 8line is not rendered.
            // これがないとギコ猫が(0, 0)と(20, 50)のポジションに出てしまう
            const y = this.spriteRam.read(i) - 8;

            if (y < 0) {
                return;
            }
            const spriteId = this.spriteRam.read(i + 1);
            const attribute = this.spriteRam.read(i + 2);
            const x = this.spriteRam.read(i + 3);

            const sprite = this.buildSprite(spriteId, this.spriteTableOffset());

            this.sprites[i / 4] = { sprite, x, y, attribute, spriteId };
        }
    }

    tileY(): Byte {
        return ~~(this.line / 8) + this.scrollTileY();
    }

    scrollTileX(): Byte {

        /*
          Name table id and address
          +------------+------------+
          |            |            |
          |  0(0x2000) |  1(0x2400) |
          |            |            |
          +------------+------------+
          |            |            |
          |  2(0x2800) |  3(0x2C00) |
          |            |            |
          +------------+------------+
         */

        return ~~((this.scrollX + ((this.nameTableId % 2) * 256)) / 8);
    }

    scrollTileY(): Byte {
        return ~~((this.scrollY + (~~(this.nameTableId / 2) * 240)) / 8);
    }

    // 1ブロックは、2x2タイル
    // | 0 | 1 |
    // | 2 | 3 |
    getBlockId(tileX: Byte, tileY: Byte): Byte {
        return ~~((tileX % 4) / 2) + (~~(tileY % 4) / 2) * 2;
    }

    getSpriteId(tileX: Byte, tileY: Byte, offset: Word): Byte {
        const address = tileY * 32 + tileX + offset;

        return this.vram.read(this.mirrorDownSpriteAddr(address));
    }

    getAttribute(tileX: Byte, tileY: Byte, offset: Word): Byte {
        const address = ~~(tileX / 4) + (~~(tileY / 4) * 8) + 0x03c0 + offset;

        return this.vram.read(this.mirrorDownSpriteAddr(address));
    }

    readCharacterRam(address: Word): Byte {
        return this.bus.readByPpu(address);
    }

    write(address: Word, data: Byte): void {
        if (address === 0x0003) {
            this.spriteAddress = data;
            return;
        }
        if (address === 0x0004) {
            // console.log("sprite vram address: " + this.spriteAddress + " data: " + data);
            this.spriteRam.write(this.spriteAddress, data);
            this.spriteAddress++;
            return;
        }
        if (address === 0x0005) {

            // console.log(`scroll: ${data}`);
            this.writeScrollData(data);
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

        // PPUレジスタ
        if (address === 0x0000 || address === 0x0001 || address === 0x0002) {

            // console.log("ppu register: " + data.toString(2) + " to " + address);
            this.registers[address] = data;
            return;
        }

        throw `unexpected write address(ppu): ${address.toString(16)}`;
    }

    read(address: Word): Byte {
        if (address === 0x0002) {
            this.isHorizontalScroll = true;
            const data = this.registers[0x02];

            this.clearVblank();
            return data;
        } else if (address === 0x0004) {
            return this.spriteRam.read(this.spriteAddress);
        }
        throw `unexpected read address: ${address.toString(16)}`;

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

                // console.log(`palette write: ${this.vramAddress.toString(16)} data: ${data.toString(16)}`);
                if (data > 64) {
                    throw `address: ${this.vramAddress - 0x3F00}, data: ${data}`;
                }
                this.palette.write(this.vramAddress - 0x3F00, data);
            } else {

                // ネームテーブル、属性テーブル
                // console.log(`vram write: ${this.calculateAddress().toString(16)} data: ${data}`);
                this.writeVram(this.calculateAddress(), data);
            }
        } else {
            // console.log(`write character ram:: ${this.vramAddress}`);
            this.bus.writeByPpu(this.vramAddress, data);
        }
        this.vramAddress += this.vramOffset;
    }

    writeVram(address: Word, data: Byte) {
        this.vram.write(address, data);
    }

    writeScrollData(data: Byte) {
        if (this.isHorizontalScroll) {
            this.scrollX = data & 0xFF;
            this.isHorizontalScroll = false;
        } else {
            this.scrollY = data & 0xFF;
            this.isHorizontalScroll = true;
        }
    }

    calculateAddress(): Byte {
        if (this.vramAddress >= 0x3000 && this.vramAddress < 0x3f00) {

            // mirror
            return this.vramAddress - 0x3000;
        }
        return this.vramAddress - 0x2000;
    }

    mirrorDownSpriteAddr(address: Word) {
        // 垂直ミラー
        if (!this.config.isHorizontalMirror) return address;
        // 水平ミラー
        // 画面2か4なら、1つ前の画面のアドレスを返す
        if (0x0400 <= address && address < 0x800 || address > 0x0C00) {
            return address - 0x0400;
        }

        return address;
    }

    setVblank() {
        this.registers[0x02] |= 0x80;
    }

    clearVblank() {
        this.registers[0x02] &= 0x7F;
    }

    setSpriteHit() {
        this.registers[0x02] |= 0x40;
    }

    clearSpriteHit() {
        this.registers[0x02] &= 0xBF;
    }

    hasSpriteHit(): boolean {
        // 0番スプライトを画面に描画すると$2002の6ビット目が1になる
        const sprite0_y = this.spriteRam.read(0);

        return this.line === sprite0_y && this.isBackgroundEnable() && this.isSpriteEnable();
    }

    /*
      コントロールレジスタ2
      bit  説明
      ------------------------------------------
      7-5  背景色
      000:黒
      001:緑
      010:青
      100:赤
      4    スプライト有効　0:無効、1:有効
      3    背景有効　0:無効、1:有効
      2    スプライトマスク、画面左8ピクセルを描画しない。0:描画しない、1:描画
      1    背景マスク、画面左8ピクセルを描画しない。0:描画しない、1:描画
      0    ディスプレイタイプ　0:カラー、1:モノクロ
    */

    isBackgroundEnable(): boolean {
        return !!(this.registers[0x01] & 0x08);
    }

    isSpriteEnable(): boolean {
        return !!(this.registers[0x01] & 0x10);
    }

    backgroundTableOffset(): Word {

        // コントロールレジスタ1
        // bit 用途
        // --------------------------------------------------------
        // 7   VBlank時にNMIを発生　0:無効、1:発生
        // 6   PPUマスタースレーブ、常に1
        // 5   スプライトサイズ　0:8x8、1:8x16
        // 4   背景パターンテーブルアドレス指定　0:$0000、1:$1000
        // 3   スプライトパターンテーブルアドレス指定　0:$0000、1:$1000
        // 2   PPUメモリアドレスインクリメント　0:+=1、1:+=32
        // 1-0 ネームテーブルアドレス指定
        return this.registers[0] & 0x10 ? 0x1000 : 0x0000;
    }

    spriteTableOffset(): Word {
        return this.registers[0] & 0x08 ? 0x1000 : 0x0000;
    }

    vBlankIrqEnabled(): boolean {
        return !!(this.registers[0] & 0x80);
    }

    get nameTableId(): Byte {
        return this.registers[0x00] & 0x03;
    }

    get vramOffset(): Byte {
        return this.registers[0x00] & 0x04 ? 32 : 1;
    }

    transferSprite(index: Byte, data: Byte) {
        const address = this.spriteAddress + index;

        this.spriteRam.write(address, data);
    }
}
