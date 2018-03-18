'use strict';

import Nes from "./src/nes/nes";

// fetch('./nestest.nes')
fetch('./roms/giko016.nes')
    .then((res) => res.arrayBuffer())
    .then((nesFile: ArrayBuffer) => {
        const nes = new Nes();
        nes.load(nesFile);
        nes.start();
    });
