/** @flow*/

import type { Byte, Word } from "../types/common";

export default class KeyPad {
    index: number;
    isSet: boolean;
    keyBuffer: Array<boolean>;
    keyRegistors: Array<boolean>;

    constructor() {
        this.index = 0;
        this.isSet = false;
        this.keyBuffer = [];
        this.keyRegistors = [];

        document.addEventListener('keydown', (event: KeyboardEvent) => {
            this.onKeyDown(this.getKeyIndex(event.key));
        });

        document.addEventListener('keyup', (event: KeyboardEvent) => {
            this.onKeyUp(this.getKeyIndex(event.key));
        });
    }

    read(): boolean {
        return this.keyRegistors[this.index++];
    }

    write(data: Byte) {
        if (data & 0x01) {
            this.isSet = true;
        } else if (!(data & 0x01) && this.isSet === true) {
            this.index = 0;
            this.isSet = false;
            this.keyRegistors = [...this.keyBuffer];
        }
    }

    onKeyDown(keyIndex: number) {
        this.keyBuffer[keyIndex] = true;
    }

    onKeyUp(keyIndex: number) {
        this.keyBuffer[keyIndex] = false;
    }

    getKeyIndex(keycode: string): number {
        switch (keycode) {
            case "ArrowUp": return 4;
            case "ArrowDown": return 5;
            case "ArrowLeft": return 6;
            case "ArrowRight": return 7;
            default: return -1;
        }
    }
}
