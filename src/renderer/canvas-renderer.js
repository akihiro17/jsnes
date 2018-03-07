/** @flow*/

import type { Sprite, SpriteWithAttribute, Tile, RenderingData } from "../ppu/ppu";
import type { Byte, Word } from "../types/common";

const colors = [
    [0x80, 0x80, 0x80], [0x00, 0x3D, 0xA6], [0x00, 0x12, 0xB0], [0x44, 0x00, 0x96],
    [0xA1, 0x00, 0x5E], [0xC7, 0x00, 0x28], [0xBA, 0x06, 0x00], [0x8C, 0x17, 0x00],
    [0x5C, 0x2F, 0x00], [0x10, 0x45, 0x00], [0x05, 0x4A, 0x00], [0x00, 0x47, 0x2E],
    [0x00, 0x41, 0x66], [0x00, 0x00, 0x00], [0x05, 0x05, 0x05], [0x05, 0x05, 0x05],
    [0xC7, 0xC7, 0xC7], [0x00, 0x77, 0xFF], [0x21, 0x55, 0xFF], [0x82, 0x37, 0xFA],
    [0xEB, 0x2F, 0xB5], [0xFF, 0x29, 0x50], [0xFF, 0x22, 0x00], [0xD6, 0x32, 0x00],
    [0xC4, 0x62, 0x00], [0x35, 0x80, 0x00], [0x05, 0x8F, 0x00], [0x00, 0x8A, 0x55],
    [0x00, 0x99, 0xCC], [0x21, 0x21, 0x21], [0x09, 0x09, 0x09], [0x09, 0x09, 0x09],
    [0xFF, 0xFF, 0xFF], [0x0F, 0xD7, 0xFF], [0x69, 0xA2, 0xFF], [0xD4, 0x80, 0xFF],
    [0xFF, 0x45, 0xF3], [0xFF, 0x61, 0x8B], [0xFF, 0x88, 0x33], [0xFF, 0x9C, 0x12],
    [0xFA, 0xBC, 0x20], [0x9F, 0xE3, 0x0E], [0x2B, 0xF0, 0x35], [0x0C, 0xF0, 0xA4],
    [0x05, 0xFB, 0xFF], [0x5E, 0x5E, 0x5E], [0x0D, 0x0D, 0x0D], [0x0D, 0x0D, 0x0D],
    [0xFF, 0xFF, 0xFF], [0xA6, 0xFC, 0xFF], [0xB3, 0xEC, 0xFF], [0xDA, 0xAB, 0xEB],
    [0xFF, 0xA8, 0xF9], [0xFF, 0xAB, 0xB3], [0xFF, 0xD2, 0xB0], [0xFF, 0xEF, 0xA6],
    [0xFF, 0xF7, 0x9C], [0xD7, 0xE8, 0x95], [0xA6, 0xED, 0xAF], [0xA2, 0xF2, 0xDA],
    [0x99, 0xFF, 0xFC], [0xDD, 0xDD, 0xDD], [0x11, 0x11, 0x11], [0x11, 0x11, 0x11]
];

export default class CanvasRenderer {
    ctx: ?CanvasRenderingContext2D;
    image: ImageData;

    constructor() {
        const canvas = ((document.getElementById("nes"): any): HTMLCanvasElement);

        this.ctx = canvas.getContext("2d");
        this.image = this.ctx.createImageData(256, 240);
    }

    render(renderingData: RenderingData) {
        const background = renderingData.background;

        for (let i = 0; i < background.length; i++) {
            const x = (i % 32) * 8;
            const y = ~~(i / 32) * 8;

            this.renderTile(background[i].sprite, background[i].paletteId, background[i].scrollX, background[i].scrollY, renderingData.palette, x, y);
        }

        const sprites = renderingData.sprites;
        if (sprites) {
            this.renderSprites(sprites, renderingData.palette);
        }

        if (!this.ctx) {
            return;
        }
        this.ctx.putImageData(this.image, 0, 0);
    }

    renderTile(sprite: Sprite, paletteId: Byte, scrollX: Byte, scrollY: Byte, palette: Uint8Array, tileX: number, tileY: number) {
        // ?
        const offsetX = scrollX % 8;
        const offsetY = scrollY % 8;

        for (let i = 0; i < 8; i = i + 1) {
            for (let j = 0; j < 8; j = j + 1) {
                // 0x3F00～0x3F0Fはバックグラウンドパレット
                const paletteIndex = paletteId * 4 + sprite[i][j];
                const colorId = palette[paletteIndex];
                const color = colors[colorId];

                const x = tileX + j - offsetX;
                const y = (tileY + i) - offsetY;

                if (x >= 0 && x < 256 && y >= 0 && y < 224) {
                    const index = (x + y * 0x100) * 4;

                    this.image.data[index] = color[0];
                    this.image.data[index + 1] = color[1];
                    this.image.data[index + 2] = color[2];
                    this.image.data[index + 3] = 0xFF;
                }
            }
        }
    }

    renderSprites(sprites: $ReadOnlyArray<SpriteWithAttribute>, palette: Uint8Array) {
        for (const sprite of sprites) {
            if (sprite) {
                this.renderSprite(sprite, palette);
            }
        }
    }

    renderSprite(sprite: SpriteWithAttribute, palette: Uint8Array) {

        // アトリビュート
        // VHP000CC
        // |||   ||
        // |||   ++-カラーパレット上位2ビット
        // ||+------BGとの優先順位、0:SPR優先、1:BG優先
        // |+-------左右反転フラグ、1:反転
        // +--------上下反転フラグ、1:反転
        const paletteId = sprite.attribute & 0x03;

        for (let i = 0; i < 8; i = i + 1) {
            for (let j = 0; j < 8; j = j + 1) {
                // 0x3F00～0x3F0Fはバックグラウンドパレット,
                // 0x3F10～0x3F1F`はスプライトパレットです
                if (sprite.sprite[i][j]) {
                    const paletteIndex = paletteId * 4 + sprite.sprite[i][j] + 0x10;
                    const colorId = palette[paletteIndex];
                    const color = colors[colorId];

                    const x = sprite.x + j;
                    const y = sprite.y + i;

                    const index = (x + y * 0x100) * 4;

                    this.image.data[index] = color[0];
                    this.image.data[index + 1] = color[1];
                    this.image.data[index + 2] = color[2];
                }
            }
        }
    }
}
