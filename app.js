'use strict';

import Nes from "./src/nes/nes";

// fetch('./nestest.nes')
fetch('./roms/giko017.nes')
    .then((res) => res.arrayBuffer())
    .then((nesFile: ArrayBuffer) => {
        const nes = new Nes();
        nes.load(nesFile);
        nes.start();
    })
    .catch((reason) => {
        throw "nes file not found";
    });
