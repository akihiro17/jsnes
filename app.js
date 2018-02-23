'use strict';

import { parse } from './src/parser';
import Rom from './src/rom/Rom';

fetch('./sample.nes')
  .then((res) => res.arrayBuffer())
  .then((nesFile: ArrayBuffer) => {
    const { programROM, characterROM } = parse(nesFile);

    const program = new Rom(programROM);

    console.log(program.read(0));
    console.log(program.read(1));
  });
