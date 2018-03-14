'use strict';

import Nes from "./src/nes/nes";

fetch('./nestest.nes')
// fetch('./all/giko/giko012.nes')
    .then((res) => res.arrayBuffer())
    .then((nesFile: ArrayBuffer) => {
        const nes = new Nes();
        nes.load(nesFile);
        nes.start();
    });
