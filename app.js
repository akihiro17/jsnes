'use strict';

import { parse } from './src/parser';
import Rom from './src/rom/rom';
import CpuBus from "./src/bus/cpu-bus";
import Cpu from "./src/cpu/cpu";

fetch('./sample.nes')
    .then((res) => res.arrayBuffer())
    .then((nesFile: ArrayBuffer) => {
        const { programROM, characterROM } = parse(nesFile);

        const program = new Rom(programROM);

        console.log(program.read(0));
        console.log(program.read(1));

        const bus = new CpuBus(program);
        const cpu = new Cpu(bus);
        cpu.reset();
        while(true) {
            cpu.run();
        }
    });
