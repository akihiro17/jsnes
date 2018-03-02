'use strict';

import { parse } from './src/parser';
import Rom from './src/rom/rom';
import Ram from './src/ram/ram';
import CpuBus from "./src/bus/cpu-bus";
import PpuBus from "./src/bus/ppu-bus";
import Cpu from "./src/cpu/cpu";
import Ppu from "./src/ppu/ppu";
import CanvasRenderer from "./src/renderer/canvas-renderer";

const start = (nesFile: ArrayBuffer) => {
    const { programROM, characterROM } = parse(nesFile);

    const program = new Rom(programROM);

    console.log(program.read(0));
    console.log(program.read(1));

    const characterRam = new Ram(0x4000);
    for (let i = 0; i < characterROM.length; i++) {
        characterRam.write(i, characterROM[i]);
    }
    const ppuBus = new PpuBus(characterRam);
    const ppu = new Ppu(ppuBus);

    const bus = new CpuBus(program, ppu);
    const cpu = new Cpu(bus);

    cpu.reset();

    let cycle = 0;
    const renderer = new CanvasRenderer();
    while(true) {
        cycle += cpu.run();
        const renderingData = ppu.run(cycle * 3);
        if (renderingData) {
            renderer.render(renderingData);
            break;
        }
    }

    requestAnimationFrame(() => {
        start(nesFile);
    });
};

fetch('./sample1.nes')
    .then((res) => res.arrayBuffer())
    .then((nesFile: ArrayBuffer) => {
        requestAnimationFrame(() => {
            start(nesFile);
        });
    });
