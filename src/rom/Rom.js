export default class Rom {
  rom: Uint8Array;

  constructor(buffer: Uint8Array) {
    this.rom = Uint8Array.from(buffer);
  }

  read(addr: number): Number {
    return this.rom[addr];
  }
};
