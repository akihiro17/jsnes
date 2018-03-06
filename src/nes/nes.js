/** @flow*/

import { parse } from "../parser";
import Rom from "../rom/rom";
import Ram from "../ram/ram";
import CpuBus from "../bus/cpu-bus";
import PpuBus from "../bus/ppu-bus";
import Cpu from "../cpu/cpu";
import Ppu from "../ppu/ppu";
import KeyPad from "../key-pad/key-pad";
import CanvasRenderer from "../renderer/canvas-renderer";

export default class Nes {
    cpu: Cpu;
    ppu: Ppu;
    renderer: CanvasRenderer;
    cpubus: CpuBus;
    ppubus: PpuBus;
    keypad: KeyPad;
    frame: () => void;

    constructor() {
        this.frame = this.frame.bind(this);
        this.renderer = new CanvasRenderer();
    }

    load(nesFile: ArrayBuffer) {
        const { programROM, characterROM } = parse(nesFile);

        const program = new Rom(programROM);

        console.log(program.read(0));
        console.log(program.read(1));

        const characterRam = new Ram(0x4000);

        for (let i = 0; i < characterROM.length; i++) {
            characterRam.write(i, characterROM[i]);
        }
        this.ppubus = new PpuBus(characterRam);
        this.ppu = new Ppu(this.ppubus);

        // keypad
        this.keypad = new KeyPad();

        this.cpubus = new CpuBus(program, this.ppu, this.keypad);
        this.cpu = new Cpu(this.cpubus);

        this.cpu.reset();

    }

    frame() {
        while (true) {
            let cycle = 0;

            cycle += this.cpu.run();
            const renderingData = this.ppu.run(cycle * 3);

            if (renderingData) {
                this.renderer.render(renderingData);
                break;
            }
        }

        requestAnimationFrame(this.frame);
    }

    start() {
        requestAnimationFrame(this.frame);
    }
}