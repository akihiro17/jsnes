'use strict';

import Nes from "./src/nes/nes";

fetch('./sample1.nes')
    .then((res) => res.arrayBuffer())
    .then((nesFile: ArrayBuffer) => {
        const nes = new Nes();
        nes.load(nesFile);
        nes.start();
    });
