const NES_HEADER_SIZE = 0x0010;
const PROGRAM_ROM_SIZE = 0x4000;
const CHARACTER_ROM_SIZE = 0x2000;

export type NesROM = {
  characterROM: Uint8Array;
  programROM: Uint8Array;
};

export const parse = (nesBuffer: ArrayBuffer): NesROM => {
  const nes = new Uint8Array(nesBuffer);
  // 4: Size of PRG ROM in 16 KB units
  const programROMPages = nes[4];
  // 5: Size of CHR ROM in 8 KB units
  const characterROMPages = nes[5];

  const characterROMStart = NES_HEADER_SIZE + PROGRAM_ROM_SIZE * programROMPages;
  const characterROMEnd = characterROMStart + CHARACTER_ROM_SIZE * characterROMPages;

  const nesROM: NesROM = {
    programROM: nes.slice(NES_HEADER_SIZE, characterROMStart - 1),
    characterROM: nes.slice(characterROMStart, characterROMEnd - 1)
  };

  return nesROM;
};
