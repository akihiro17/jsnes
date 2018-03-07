/** @flow*/

import { parse } from "../parser";
import Rom from "../rom/rom";
import Ram from "../ram/ram";
import CpuBus from "../bus/cpu-bus";
import PpuBus from "../bus/ppu-bus";
import Cpu from "../cpu/cpu";
import Ppu from "../ppu/ppu";
import KeyPad from "../key-pad/key-pad";
import Dma from "../dma/dma";
import Interrupts from "../interrupts/interrupts";
import CanvasRenderer from "../renderer/canvas-renderer";

export default class Nes {
    cpu: Cpu;
    ppu: Ppu;
    renderer: CanvasRenderer;
    cpubus: CpuBus;
    ppubus: PpuBus;
    keypad: KeyPad;
    dma: Dma;
    interrupts: Interrupts;
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
        this.interrupts = new Interrupts();
        this.ppu = new Ppu(this.ppubus, this.interrupts);

        // ram
        const ram = new Ram(0x800);

        // keypad
        this.keypad = new KeyPad();

        //dma
        this.dma = new Dma(this.ppu, ram);

        this.cpubus = new CpuBus(program, ram, this.ppu, this.keypad, this.dma);
        this.cpu = new Cpu(this.cpubus, this.interrupts);

        this.cpu.reset();

    }

    frame() {
        while (true) {
            let cycle = 0;

            if (this.dma.isDmaProcessing) {
                this.dma.run();
                // The CPU is suspended during the transfer, which will take 513 or 514 cycles after the $4014 write tick.
                // (1 dummy read cycle while waiting for writes to complete, +1 if on an odd CPU cycle,
                //  then 256 alternating read/write cycles.)
                cycle = 514;
            }

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
