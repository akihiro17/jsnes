/** @flow*/

export default class Interrupts {
    nmi: boolean;
    irq: boolean;

    constructor() {
        this.nmi = false;
        this.irq = false;
    }

    isNmiAssert(): boolean {
        return this.nmi;
    }

    assertNmi() {
        this.nmi = true;
    }

    deassertNmi() {
        this.nmi = false;
    }

    isIrqAssert(): boolean {
        return this.irq;
    }

    assertIrq() {
        this.irq = true;
    }

    deassertIrq() {
        this.irq = false;
    }
}
