/** @flow*/

import CpuBus from "../bus/cpu-bus";
import Interrupts from "../interrupts/interrupts";
import type { Byte, Word } from "../types/common";

interface CpuStatus {
    negative: boolean;
    overflow: boolean;
    reserved: boolean;
    break: boolean;
    decimal: boolean;
    interrupt: boolean;
    zero: boolean;
    carry: boolean;
}

interface Registers {
    A: Byte;
    X: Byte;
    Y: Byte;
    P: CpuStatus;
    SP: Word;
    PC: Word;
}

export const cycles: $ReadOnlyArray<number> = [
    /* 0x00*/ 7, 6, 2, 8, 3, 3, 5, 5, 3, 2, 2, 2, 4, 4, 6, 6,
    /* 0x10*/ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 6, 7,
    /* 0x20*/ 6, 6, 2, 8, 3, 3, 5, 5, 4, 2, 2, 2, 4, 4, 6, 6,
    /* 0x30*/ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 6, 7,
    /* 0x40*/ 6, 6, 2, 8, 3, 3, 5, 5, 3, 2, 2, 2, 3, 4, 6, 6,
    /* 0x50*/ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 6, 7,
    /* 0x60*/ 6, 6, 2, 8, 3, 3, 5, 5, 4, 2, 2, 2, 5, 4, 6, 6,
    /* 0x70*/ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 6, 7,
    /* 0x80*/ 2, 6, 2, 6, 3, 3, 3, 3, 2, 2, 2, 2, 4, 4, 4, 4,
    /* 0x90*/ 2, 6, 2, 6, 4, 4, 4, 4, 2, 4, 2, 5, 5, 4, 5, 5,
    /* 0xA0*/ 2, 6, 2, 6, 3, 3, 3, 3, 2, 2, 2, 2, 4, 4, 4, 4,
    /* 0xB0*/ 2, 5, 2, 5, 4, 4, 4, 4, 2, 4, 2, 4, 4, 4, 4, 4,
    /* 0xC0*/ 2, 6, 2, 8, 3, 3, 5, 5, 2, 2, 2, 2, 4, 4, 6, 6,
    /* 0xD0*/ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,
    /* 0xE0*/ 2, 6, 3, 8, 3, 3, 5, 5, 2, 2, 2, 2, 4, 4, 6, 6,
    /* 0xF0*/ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7
];

/* eslint-disable */
const instructions = {
    "A9": { fullName: "LDA_IMM", baseName: "LDA", mode: "immediate", cycle: cycles[0xA9] },
    "A5": { fullName: "LDA_ZERO", baseName: "LDA", mode: "zeroPage", cycle: cycles[0xA5] },
    "AD": { fullName: "LDA_ABS", baseName: "LDA", mode: "absolute", cycle: cycles[0xAD] },
    "B5": { fullName: "LDA_ZEROX", baseName: "LDA", mode: "zeroPageX", cycle: cycles[0xB5] },
    "BD": { fullName: "LDA_ABSX", baseName: "LDA", mode: "absoluteX", cycle: cycles[0xBD] },
    "B9": { fullName: "LDA_ABSY", baseName: "LDA", mode: "absoluteY", cycle: cycles[0xB9] },
    "A1": { fullName: "LDA_INDX", baseName: "LDA", mode: "preIndexedIndirect", cycle: cycles[0xA1] },
    "B1": { fullName: "LDA_INDY", baseName: "LDA", mode: "postIndexedIndirect", cycle: cycles[0xB1] },
    "A2": { fullName: "LDX_IMM", baseName: "LDX", mode: "immediate", cycle: cycles[0xA2] },
    "A6": { fullName: "LDX_ZERO", baseName: "LDX", mode: "zeroPage", cycle: cycles[0xA6] },
    "AE": { fullName: "LDX_ABS", baseName: "LDX", mode: "absolute", cycle: cycles[0xAE] },
    "B6": { fullName: "LDX_ZEROY", baseName: "LDX", mode: "zeroPageY", cycle: cycles[0xB6] },
    "BE": { fullName: "LDX_ABSY", baseName: "LDX", mode: "absoluteY", cycle: cycles[0xBE] },
    "A0": { fullName: "LDY_IMM", baseName: "LDY", mode: "immediate", cycle: cycles[0xA0] },
    "A4": { fullName: "LDY_ZERO", baseName: "LDY", mode: "zeroPage", cycle: cycles[0xA4] },
    "AC": { fullName: "LDY_ABS", baseName: "LDY", mode: "absolute", cycle: cycles[0xAC] },
    "B4": { fullName: "LDY_ZEROX", baseName: "LDY", mode: "zeroPageX", cycle: cycles[0xB4] },
    "BC": { fullName: "LDY_ABSX", baseName: "LDY", mode: "absoluteX", cycle: cycles[0xBC] },
    "85": { fullName: "STA_ZERO", baseName: "STA", mode: "zeroPage", cycle: cycles[0x85] },
    "8D": { fullName: "STA_ABS", baseName: "STA", mode: "absolute", cycle: cycles[0x8D] },
    "95": { fullName: "STA_ZEROX", baseName: "STA", mode: "zeroPageX", cycle: cycles[0x95] },
    "9D": { fullName: "STA_ABSX", baseName: "STA", mode: "absoluteX", cycle: cycles[0x9D] },
    "99": { fullName: "STA_ABSY", baseName: "STA", mode: "absoluteY", cycle: cycles[0x99] },
    "81": { fullName: "STA_INDX", baseName: "STA", mode: "preIndexedIndirect", cycle: cycles[0x81] },
    "91": { fullName: "STA_INDY", baseName: "STA", mode: "postIndexedIndirect", cycle: cycles[0x91] },
    "86": { fullName: "STX_ZERO", baseName: "STX", mode: "zeroPage", cycle: cycles[0x86] },
    "8E": { fullName: "STX_ABS", baseName: "STX", mode: "absolute", cycle: cycles[0x8E] },
    "96": { fullName: "STX_ZEROY", baseName: "STX", mode: "zeroPageY", cycle: cycles[0x96] },
    "84": { fullName: "STY_ZERO", baseName: "STY", mode: "zeroPage", cycle: cycles[0x84] },
    "8C": { fullName: "STY_ABS", baseName: "STY", mode: "absolute", cycle: cycles[0x8C] },
    "94": { fullName: "STY_ZEROX", baseName: "STY", mode: "zeroPageX", cycle: cycles[0x94] },
    "8A": { fullName: "TXA", baseName: "TXA", mode: "implied", cycle: cycles[0x8A] },
    "98": { fullName: "TYA", baseName: "TYA", mode: "implied", cycle: cycles[0x98] },
    "9A": { fullName: "TXS", baseName: "TXS", mode: "implied", cycle: cycles[0x9A] },
    "A8": { fullName: "TAY", baseName: "TAY", mode: "implied", cycle: cycles[0xA8] },
    "AA": { fullName: "TAX", baseName: "TAX", mode: "implied", cycle: cycles[0xAA] },
    "BA": { fullName: "TSX", baseName: "TSX", mode: "implied", cycle: cycles[0xBA] },
    "08": { fullName: "PHP", baseName: "PHP", mode: "implied", cycle: cycles[0x08] },
    "28": { fullName: "PLP", baseName: "PLP", mode: "implied", cycle: cycles[0x28] },
    "48": { fullName: "PHA", baseName: "PHA", mode: "implied", cycle: cycles[0x48] },
    "68": { fullName: "PLA", baseName: "PLA", mode: "implied", cycle: cycles[0x68] },
    "69": { fullName: "ADC_IMM", baseName: "ADC", mode: "immediate", cycle: cycles[0x69] },
    "65": { fullName: "ADC_ZERO", baseName: "ADC", mode: "zeroPage", cycle: cycles[0x65] },
    "6D": { fullName: "ADC_ABS", baseName: "ADC", mode: "absolute", cycle: cycles[0x6D] },
    "75": { fullName: "ADC_ZEROX", baseName: "ADC", mode: "zeroPageX", cycle: cycles[0x75] },
    "7D": { fullName: "ADC_ABSX", baseName: "ADC", mode: "absoluteX", cycle: cycles[0x7D] },
    "79": { fullName: "ADC_ABSY", baseName: "ADC", mode: "absoluteY", cycle: cycles[0x79] },
    "61": { fullName: "ADC_INDX", baseName: "ADC", mode: "preIndexedIndirect", cycle: cycles[0x61] },
    "71": { fullName: "ADC_INDY", baseName: "ADC", mode: "postIndexedIndirect", cycle: cycles[0x71] },
    "E9": { fullName: "SBC_IMM", baseName: "SBC", mode: "immediate", cycle: cycles[0xE9] },
    "E5": { fullName: "SBC_ZERO", baseName: "SBC", mode: "zeroPage", cycle: cycles[0xE5] },
    "ED": { fullName: "SBC_ABS", baseName: "SBC", mode: "absolute", cycle: cycles[0xED] },
    "F5": { fullName: "SBC_ZEROX", baseName: "SBC", mode: "zeroPageX", cycle: cycles[0xF5] },
    "FD": { fullName: "SBC_ABSX", baseName: "SBC", mode: "absoluteX", cycle: cycles[0xFD] },
    "F9": { fullName: "SBC_ABSY", baseName: "SBC", mode: "absoluteY", cycle: cycles[0xF9] },
    "E1": { fullName: "SBC_INDX", baseName: "SBC", mode: "preIndexedIndirect", cycle: cycles[0xE1] },
    "F1": { fullName: "SBC_INDY", baseName: "SBC", mode: "postIndexedIndirect", cycle: cycles[0xF1] },
    "E0": { fullName: "CPX_IMM", baseName: "CPX", mode: "immediate", cycle: cycles[0xE0] },
    "E4": { fullName: "CPX_ZERO", baseName: "CPX", mode: "zeroPage", cycle: cycles[0xE4] },
    "EC": { fullName: "CPX_ABS", baseName: "CPX", mode: "absolute", cycle: cycles[0xEC] },
    "C0": { fullName: "CPY_IMM", baseName: "CPY", mode: "immediate", cycle: cycles[0xC0] },
    "C4": { fullName: "CPY_ZERO", baseName: "CPY", mode: "zeroPage", cycle: cycles[0xC4] },
    "CC": { fullName: "CPY_ABS", baseName: "CPY", mode: "absolute", cycle: cycles[0xCC] },
    "C9": { fullName: "CMP_IMM", baseName: "CMP", mode: "immediate", cycle: cycles[0xC9] },
    "C5": { fullName: "CMP_ZERO", baseName: "CMP", mode: "zeroPage", cycle: cycles[0xC5] },
    "CD": { fullName: "CMP_ABS", baseName: "CMP", mode: "absolute", cycle: cycles[0xCD] },
    "D5": { fullName: "CMP_ZEROX", baseName: "CMP", mode: "zeroPageX", cycle: cycles[0xD5] },
    "DD": { fullName: "CMP_ABSX", baseName: "CMP", mode: "absoluteX", cycle: cycles[0xDD] },
    "D9": { fullName: "CMP_ABSY", baseName: "CMP", mode: "absoluteY", cycle: cycles[0xD9] },
    "C1": { fullName: "CMP_INDX", baseName: "CMP", mode: "preIndexedIndirect", cycle: cycles[0xC1] },
    "D1": { fullName: "CMP_INDY", baseName: "CMP", mode: "postIndexedIndirect", cycle: cycles[0xD1] },
    "29": { fullName: "AND_IMM", baseName: "AND", mode: "immediate", cycle: cycles[0x29] },
    "25": { fullName: "AND_ZERO", baseName: "AND", mode: "zeroPage", cycle: cycles[0x25] },
    "2D": { fullName: "AND_ABS", baseName: "AND", mode: "absolute", cycle: cycles[0x2D] },
    "35": { fullName: "AND_ZEROX", baseName: "AND", mode: "zeroPageX", cycle: cycles[0x35] },
    "3D": { fullName: "AND_ABSX", baseName: "AND", mode: "absoluteX", cycle: cycles[0x3D] },
    "39": { fullName: "AND_ABSY", baseName: "AND", mode: "absoluteY", cycle: cycles[0x39] },
    "21": { fullName: "AND_INDX", baseName: "AND", mode: "preIndexedIndirect", cycle: cycles[0x21] },
    "31": { fullName: "AND_INDY", baseName: "AND", mode: "postIndexedIndirect", cycle: cycles[0x31] },
    "49": { fullName: "EOR_IMM", baseName: "EOR", mode: "immediate", cycle: cycles[0x49] },
    "45": { fullName: "EOR_ZERO", baseName: "EOR", mode: "zeroPage", cycle: cycles[0x45] },
    "4D": { fullName: "EOR_ABS", baseName: "EOR", mode: "absolute", cycle: cycles[0x4D] },
    "55": { fullName: "EOR_ZEROX", baseName: "EOR", mode: "zeroPageX", cycle: cycles[0x55] },
    "5D": { fullName: "EOR_ABSX", baseName: "EOR", mode: "absoluteX", cycle: cycles[0x5D] },
    "59": { fullName: "EOR_ABSY", baseName: "EOR", mode: "absoluteY", cycle: cycles[0x59] },
    "41": { fullName: "EOR_INDX", baseName: "EOR", mode: "preIndexedIndirect", cycle: cycles[0x41] },
    "51": { fullName: "EOR_INDY", baseName: "EOR", mode: "postIndexedIndirect", cycle: cycles[0x51] },
    "09": { fullName: "ORA_IMM", baseName: "ORA", mode: "immediate", cycle: cycles[0x09] },
    "05": { fullName: "ORA_ZERO", baseName: "ORA", mode: "zeroPage", cycle: cycles[0x05] },
    "0D": { fullName: "ORA_ABS", baseName: "ORA", mode: "absolute", cycle: cycles[0x0D] },
    "15": { fullName: "ORA_ZEROX", baseName: "ORA", mode: "zeroPageX", cycle: cycles[0x15] },
    "1D": { fullName: "ORA_ABSX", baseName: "ORA", mode: "absoluteX", cycle: cycles[0x1D] },
    "19": { fullName: "ORA_ABSY", baseName: "ORA", mode: "absoluteY", cycle: cycles[0x19] },
    "01": { fullName: "ORA_INDX", baseName: "ORA", mode: "preIndexedIndirect", cycle: cycles[0x01] },
    "11": { fullName: "ORA_INDY", baseName: "ORA", mode: "postIndexedIndirect", cycle: cycles[0x11] },
    "24": { fullName: "BIT_ZERO", baseName: "BIT", mode: "zeroPage", cycle: cycles[0x24] },
    "2C": { fullName: "BIT_ABS", baseName: "BIT", mode: "absolute", cycle: cycles[0x2C] },
    "0A": { fullName: "ASL", baseName: "ASL", mode: "accumulator", cycle: cycles[0x0A] },
    "06": { fullName: "ASL_ZERO", baseName: "ASL", mode: "zeroPage", cycle: cycles[0x06] },
    "0E": { fullName: "ASL_ABS", baseName: "ASL", mode: "absolute", cycle: cycles[0x0E] },
    "16": { fullName: "ASL_ZEROX", baseName: "ASL", mode: "zeroPageX", cycle: cycles[0x16] },
    "1E": { fullName: "ASL_ABSX", baseName: "ASL", mode: "absoluteX", cycle: cycles[0x1E] },
    "4A": { fullName: "LSR", baseName: "LSR", mode: "accumulator", cycle: cycles[0x4A] },
    "46": { fullName: "LSR_ZERO", baseName: "LSR", mode: "zeroPage", cycle: cycles[0x46] },
    "4E": { fullName: "LSR_ABS", baseName: "LSR", mode: "absolute", cycle: cycles[0x4E] },
    "56": { fullName: "LSR_ZEROX", baseName: "LSR", mode: "zeroPageX", cycle: cycles[0x56] },
    "5E": { fullName: "LSR_ABSX", baseName: "LSR", mode: "absoluteX", cycle: cycles[0x5E] },
    "2A": { fullName: "ROL", baseName: "ROL", mode: "accumulator", cycle: cycles[0x2A] },
    "26": { fullName: "ROL_ZERO", baseName: "ROL", mode: "zeroPage", cycle: cycles[0x26] },
    "2E": { fullName: "ROL_ABS", baseName: "ROL", mode: "absolute", cycle: cycles[0x2E] },
    "36": { fullName: "ROL_ZEROX", baseName: "ROL", mode: "zeroPageX", cycle: cycles[0x36] },
    "3E": { fullName: "ROL_ABSX", baseName: "ROL", mode: "absoluteX", cycle: cycles[0x3E] },
    "6A": { fullName: "ROR", baseName: "ROR", mode: "accumulator", cycle: cycles[0x6A] },
    "66": { fullName: "ROR_ZERO", baseName: "ROR", mode: "zeroPage", cycle: cycles[0x66] },
    "6E": { fullName: "ROR_ABS", baseName: "ROR", mode: "absolute", cycle: cycles[0x6E] },
    "76": { fullName: "ROR_ZEROX", baseName: "ROR", mode: "zeroPageX", cycle: cycles[0x76] },
    "7E": { fullName: "ROR_ABSX", baseName: "ROR", mode: "absoluteX", cycle: cycles[0x7E] },
    "E8": { fullName: "INX", baseName: "INX", mode: "implied", cycle: cycles[0xE8] },
    "C8": { fullName: "INY", baseName: "INY", mode: "implied", cycle: cycles[0xC8] },
    "E6": { fullName: "INC_ZERO", baseName: "INC", mode: "zeroPage", cycle: cycles[0xE6] },
    "EE": { fullName: "INC_ABS", baseName: "INC", mode: "absolute", cycle: cycles[0xEE] },
    "F6": { fullName: "INC_ZEROX", baseName: "INC", mode: "zeroPageX", cycle: cycles[0xF6] },
    "FE": { fullName: "INC_ABSX", baseName: "INC", mode: "absoluteX", cycle: cycles[0xFE] },
    "CA": { fullName: "DEX", baseName: "DEX", mode: "implied", cycle: cycles[0xCA] },
    "88": { fullName: "DEY", baseName: "DEY", mode: "implied", cycle: cycles[0x88] },
    "C6": { fullName: "DEC_ZERO", baseName: "DEC", mode: "zeroPage", cycle: cycles[0xC6] },
    "CE": { fullName: "DEC_ABS", baseName: "DEC", mode: "absolute", cycle: cycles[0xCE] },
    "D6": { fullName: "DEC_ZEROX", baseName: "DEC", mode: "zeroPageX", cycle: cycles[0xD6] },
    "DE": { fullName: "DEC_ABSX", baseName: "DEC", mode: "absoluteX", cycle: cycles[0xDE] },
    "18": { fullName: "CLC", baseName: "CLC", mode: "implied", cycle: cycles[0x18] },
    "58": { fullName: "CLI", baseName: "CLI", mode: "implied", cycle: cycles[0x58] },
    "B8": { fullName: "CLV", baseName: "CLV", mode: "implied", cycle: cycles[0xB8] },
    "38": { fullName: "SEC", baseName: "SEC", mode: "implied", cycle: cycles[0x38] },
    "78": { fullName: "SEI", baseName: "SEI", mode: "implied", cycle: cycles[0x78] },
    "EA": { fullName: "NOP", baseName: "NOP", mode: "implied", cycle: cycles[0xEA] },
    "00": { fullName: "BRK", baseName: "BRK", mode: "implied", cycle: cycles[0x00] },
    "20": { fullName: "JSR_ABS", baseName: "JSR", mode: "absolute", cycle: cycles[0x20] },
    "4C": { fullName: "JMP_ABS", baseName: "JMP", mode: "absolute", cycle: cycles[0x4C] },
    "6C": { fullName: "JMP_INDABS", baseName: "JMP", mode: "indirectAbsolute", cycle: cycles[0x6C] },
    "40": { fullName: "RTI", baseName: "RTI", mode: "implied", cycle: cycles[0x40] },
    "60": { fullName: "RTS", baseName: "RTS", mode: "implied", cycle: cycles[0x60] },
    "10": { fullName: "BPL", baseName: "BPL", mode: "relative", cycle: cycles[0x10] },
    "30": { fullName: "BMI", baseName: "BMI", mode: "relative", cycle: cycles[0x30] },
    "50": { fullName: "BVC", baseName: "BVC", mode: "relative", cycle: cycles[0x50] },
    "70": { fullName: "BVS", baseName: "BVS", mode: "relative", cycle: cycles[0x70] },
    "90": { fullName: "BCC", baseName: "BCC", mode: "relative", cycle: cycles[0x90] },
    "B0": { fullName: "BCS", baseName: "BCS", mode: "relative", cycle: cycles[0xB0] },
    "D0": { fullName: "BNE", baseName: "BNE", mode: "relative", cycle: cycles[0xD0] },
    "F0": { fullName: "BEQ", baseName: "BEQ", mode: "relative", cycle: cycles[0xF0] },
    "F8": { fullName: "SED", baseName: "SED", mode: "implied", cycle: cycles[0xF8] },
    "D8": { fullName: "CLD", baseName: "CLD", mode: "implied", cycle: cycles[0xD8] },
    // unofficial opecode
    // Also see https://wiki.nesdev.com/w/index.php/CPU_unofficial_opcodes
    "1A": { fullName: "NOP", baseName: "NOP", mode: "implied", cycle: cycles[0x1A] },
    "3A": { fullName: "NOP", baseName: "NOP", mode: "implied", cycle: cycles[0x3A] },
    "5A": { fullName: "NOP", baseName: "NOP", mode: "implied", cycle: cycles[0x5A] },
    "7A": { fullName: "NOP", baseName: "NOP", mode: "implied", cycle: cycles[0x7A] },
    "DA": { fullName: "NOP", baseName: "NOP", mode: "implied", cycle: cycles[0xDA] },
    "FA": { fullName: "NOP", baseName: "NOP", mode: "implied", cycle: cycles[0xFA] },

    "02": { fullName: "NOP", baseName: "NOP", mode: "implied", cycle: cycles[0x02] },
    "12": { fullName: "NOP", baseName: "NOP", mode: "implied", cycle: cycles[0x12] },
    "22": { fullName: "NOP", baseName: "NOP", mode: "implied", cycle: cycles[0x22] },
    "32": { fullName: "NOP", baseName: "NOP", mode: "implied", cycle: cycles[0x32] },
    "42": { fullName: "NOP", baseName: "NOP", mode: "implied", cycle: cycles[0x42] },
    "52": { fullName: "NOP", baseName: "NOP", mode: "implied", cycle: cycles[0x52] },
    "62": { fullName: "NOP", baseName: "NOP", mode: "implied", cycle: cycles[0x62] },
    "72": { fullName: "NOP", baseName: "NOP", mode: "implied", cycle: cycles[0x72] },
    "92": { fullName: "NOP", baseName: "NOP", mode: "implied", cycle: cycles[0x92] },
    "B2": { fullName: "NOP", baseName: "NOP", mode: "implied", cycle: cycles[0xB2] },
    "D2": { fullName: "NOP", baseName: "NOP", mode: "implied", cycle: cycles[0xD2] },
    "F2": { fullName: "NOP", baseName: "NOP", mode: "implied", cycle: cycles[0xF2] },

    "80": { fullName: "NOPD", baseName: "NOPD", mode: "implied", cycle: cycles[0x80] },
    "82": { fullName: "NOPD", baseName: "NOPD", mode: "implied", cycle: cycles[0x82] },
    "89": { fullName: "NOPD", baseName: "NOPD", mode: "implied", cycle: cycles[0x89] },
    "C2": { fullName: "NOPD", baseName: "NOPD", mode: "implied", cycle: cycles[0xC2] },
    "E2": { fullName: "NOPD", baseName: "NOPD", mode: "implied", cycle: cycles[0xE2] },
    "04": { fullName: "NOPD", baseName: "NOPD", mode: "implied", cycle: cycles[0x04] },
    "44": { fullName: "NOPD", baseName: "NOPD", mode: "implied", cycle: cycles[0x44] },
    "64": { fullName: "NOPD", baseName: "NOPD", mode: "implied", cycle: cycles[0x64] },
    "14": { fullName: "NOPD", baseName: "NOPD", mode: "implied", cycle: cycles[0x14] },
    "34": { fullName: "NOPD", baseName: "NOPD", mode: "implied", cycle: cycles[0x34] },
    "54": { fullName: "NOPD", baseName: "NOPD", mode: "implied", cycle: cycles[0x54] },
    "74": { fullName: "NOPD", baseName: "NOPD", mode: "implied", cycle: cycles[0x74] },
    "D4": { fullName: "NOPD", baseName: "NOPD", mode: "implied", cycle: cycles[0xD4] },
    "F4": { fullName: "NOPD", baseName: "NOPD", mode: "implied", cycle: cycles[0xF4] },

    "0C": { fullName: "NOPI", baseName: "NOPI", mode: "implied", cycle: cycles[0x0C] },
    "1C": { fullName: "NOPI", baseName: "NOPI", mode: "implied", cycle: cycles[0x1C] },
    "3C": { fullName: "NOPI", baseName: "NOPI", mode: "implied", cycle: cycles[0x3C] },
    "5C": { fullName: "NOPI", baseName: "NOPI", mode: "implied", cycle: cycles[0x5C] },
    "7C": { fullName: "NOPI", baseName: "NOPI", mode: "implied", cycle: cycles[0x7C] },
    "DC": { fullName: "NOPI", baseName: "NOPI", mode: "implied", cycle: cycles[0xDC] },
    "FC": { fullName: "NOPI", baseName: "NOPI", mode: "implied", cycle: cycles[0xFC] },
    // LAX
    "A7": { fullName: "LAX_ZERO", baseName: "LAX", mode: "zeroPage", cycle: cycles[0xA7] },
    "B7": { fullName: "LAX_ZEROY", baseName: "LAX", mode: "zeroPageY", cycle: cycles[0xB7] },
    "AF": { fullName: "LAX_ABS", baseName: "LAX", mode: "absolute", cycle: cycles[0xAF] },
    "BF": { fullName: "LAX_ABSY", baseName: "LAX", mode: "absoluteY", cycle: cycles[0xBF] },
    "A3": { fullName: "LAX_INDX", baseName: "LAX", mode: "preIndexedIndirect", cycle: cycles[0xA3] },
    "B3": { fullName: "LAX_INDY", baseName: "LAX", mode: "postIndexedIndirect", cycle: cycles[0xB3] },
    // SAX
    "87": { fullName: "SAX_ZERO", baseName: "SAX", mode: "zeroPage", cycle: cycles[0x87] },
    "97": { fullName: "SAX_ZEROY", baseName: "SAX", mode: "zeroPageY", cycle: cycles[0x97] },
    "8F": { fullName: "SAX_ABS", baseName: "SAX", mode: "absolute", cycle: cycles[0x8F] },
    "83": { fullName: "SAX_INDX", baseName: "SAX", mode: "preIndexedIndirect", cycle: cycles[0x83] },
    // SBC
    "EB": { fullName: "SBC_IMM", baseName: "SBC", mode: "immediate", cycle: cycles[0xEB] },
    // DCP
    "C7": { fullName: "DCP_ZERO", baseName: "DCP", mode: "zeroPage", cycle: cycles[0xC7] },
    "D7": { fullName: "DCP_ZEROX", baseName: "DCP", mode: "zeroPageX", cycle: cycles[0xD7] },
    "CF": { fullName: "DCP_ABS", baseName: "DCP", mode: "absolute", cycle: cycles[0xCF] },
    "DF": { fullName: "DCP_ABSX", baseName: "DCP", mode: "absoluteX", cycle: cycles[0xDF] },
    "DB": { fullName: "DCP_ABSY", baseName: "DCP", mode: "absoluteY", cycle: cycles[0xD8] },
    "C3": { fullName: "DCP_INDX", baseName: "DCP", mode: "preIndexedIndirect", cycle: cycles[0xC3] },
    "D3": { fullName: "DCP_INDY", baseName: "DCP", mode: "postIndexedIndirect", cycle: cycles[0xD3] },
    // ISB
    "E7": { fullName: "ISB_ZERO", baseName: "ISB", mode: "zeroPage", cycle: cycles[0xE7] },
    "F7": { fullName: "ISB_ZEROX", baseName: "ISB", mode: "zeroPageX", cycle: cycles[0xF7] },
    "EF": { fullName: "ISB_ABS", baseName: "ISB", mode: "absolute", cycle: cycles[0xEF] },
    "FF": { fullName: "ISB_ABSX", baseName: "ISB", mode: "absoluteX", cycle: cycles[0xFF] },
    "FB": { fullName: "ISB_ABSY", baseName: "ISB", mode: "absoluteY", cycle: cycles[0xF8] },
    "E3": { fullName: "ISB_INDX", baseName: "ISB", mode: "preIndexedIndirect", cycle: cycles[0xE3] },
    "F3": { fullName: "ISB_INDY", baseName: "ISB", mode: "postIndexedIndirect", cycle: cycles[0xF3] },
    // SLO
    "07": { fullName: "SLO_ZERO", baseName: "SLO", mode: "zeroPage", cycle: cycles[0x07] },
    "17": { fullName: "SLO_ZEROX", baseName: "SLO", mode: "zeroPageX", cycle: cycles[0x17] },
    "0F": { fullName: "SLO_ABS", baseName: "SLO", mode: "absolute", cycle: cycles[0x0F] },
    "1F": { fullName: "SLO_ABSX", baseName: "SLO", mode: "absoluteX", cycle: cycles[0x1F] },
    "1B": { fullName: "SLO_ABSY", baseName: "SLO", mode: "absoluteY", cycle: cycles[0x1B] },
    "03": { fullName: "SLO_INDX", baseName: "SLO", mode: "preIndexedIndirect", cycle: cycles[0x03] },
    "13": { fullName: "SLO_INDY", baseName: "SLO", mode: "postIndexedIndirect", cycle: cycles[0x13] },
    // RLA
    "27": { fullName: "RLA_ZERO", baseName: "RLA", mode: "zeroPage", cycle: cycles[0x27] },
    "37": { fullName: "RLA_ZEROX", baseName: "RLA", mode: "zeroPageX", cycle: cycles[0x37] },
    "2F": { fullName: "RLA_ABS", baseName: "RLA", mode: "absolute", cycle: cycles[0x2F] },
    "3F": { fullName: "RLA_ABSX", baseName: "RLA", mode: "absoluteX", cycle: cycles[0x3F] },
    "3B": { fullName: "RLA_ABSY", baseName: "RLA", mode: "absoluteY", cycle: cycles[0x3B] },
    "23": { fullName: "RLA_INDX", baseName: "RLA", mode: "preIndexedIndirect", cycle: cycles[0x23] },
    "33": { fullName: "RLA_INDY", baseName: "RLA", mode: "postIndexedIndirect", cycle: cycles[0x33] },
    // SRE
    "47": { fullName: "SRE_ZERO", baseName: "SRE", mode: "zeroPage", cycle: cycles[0x47] },
    "57": { fullName: "SRE_ZEROX", baseName: "SRE", mode: "zeroPageX", cycle: cycles[0x57] },
    "4F": { fullName: "SRE_ABS", baseName: "SRE", mode: "absolute", cycle: cycles[0x4F] },
    "5F": { fullName: "SRE_ABSX", baseName: "SRE", mode: "absoluteX", cycle: cycles[0x5F] },
    "5B": { fullName: "SRE_ABSY", baseName: "SRE", mode: "absoluteY", cycle: cycles[0x5B] },
    "43": { fullName: "SRE_INDX", baseName: "SRE", mode: "preIndexedIndirect", cycle: cycles[0x43] },
    "53": { fullName: "SRE_INDY", baseName: "SRE", mode: "postIndexedIndirect", cycle: cycles[0x53] },
    // RRA
    "67": { fullName: "RRA_ZERO", baseName: "RRA", mode: "zeroPage", cycle: cycles[0x67] },
    "77": { fullName: "RRA_ZEROX", baseName: "RRA", mode: "zeroPageX", cycle: cycles[0x77] },
    "6F": { fullName: "RRA_ABS", baseName: "RRA", mode: "absolute", cycle: cycles[0x6F] },
    "7F": { fullName: "RRA_ABSX", baseName: "RRA", mode: "absoluteX", cycle: cycles[0x7F] },
    "7B": { fullName: "RRA_ABSY", baseName: "RRA", mode: "absoluteY", cycle: cycles[0x7B] },
    "63": { fullName: "RRA_INDX", baseName: "RRA", mode: "preIndexedIndirect", cycle: cycles[0x63] },
    "73": { fullName: "RRA_INDY", baseName: "RRA", mode: "postIndexedIndirect", cycle: cycles[0x73] }
};
/* eslint-enable */

const defaultRegisters: Registers = {
    A: 0x00,
    X: 0x00,
    Y: 0x00,
    P: {
        negative: false,
        overflow: false,
        reserved: true,
        break: true,
        decimal: false,
        interrupt: true,
        zero: false,
        carry: false
    },
    SP: 0x01FD,
    PC: 0x0000
};

export default class Cpu {
    registers: Registers;
    bus: CpuBus
    interrupts: Interrupts;
    hasBranched: boolean;
    prev: number;
    prev2: number;
    counter: number;
    min: number;
    max: number;

    constructor(bus: CpuBus, interrupts: Interrupts) {
        this.registers = {
            ...defaultRegisters,
            P: { ...defaultRegisters.P }
        };
        this.bus = bus;
        this.interrupts = interrupts;
        this.hasBranched = false;
        this.prev = 0;
        this.prev2 = 0;
        this.counter = 0;
        this.min = 100000;
        this.max = 110000;
    }

    read(address: Word, size?: "Byte" | "Word"): Byte {
        address &= 0xFFFF;
        if (size === "Word") {
            return this.bus.readByCpu(address) | this.bus.readByCpu(address + 1) << 8;
        }

        return this.bus.readByCpu(address);
    }

    write(address: Word, data: Byte) {
        this.bus.writeByCpu(address, data);
    }

    push(data: Byte) {

        // console.log(`push ${data}`);
        // スタックポインタも16ビットのアドレス空間を指す必要があるのですが、上位8bitは0x01に固定されています
        this.write(0x0100 | this.registers.SP & 0xFF, data);
        this.registers.SP -= 1;
    }

    pop(): Byte {

        // スタックポインタも16ビットのアドレス空間を指す必要があるのですが、上位8bitは0x01に固定されています
        this.registers.SP += 1;
        return this.read(0x0100 | this.registers.SP & 0xFF);
    }

    branch(address: Word) {
        this.registers.PC = address;
        this.hasBranched = true;
    }

    pushStatus() {
        const status: Byte =
              (+this.registers.P.negative) << 7 |
              (+this.registers.P.overflow) << 6 |
              (+this.registers.P.reserved) << 5 |
              (+this.registers.P.break) << 4 |
              (+this.registers.P.decimal) << 3 |
              (+this.registers.P.interrupt) << 2 |
              (+this.registers.P.zero) << 1 |
              (+this.registers.P.carry);

        this.push(status);
    }

    popStatus() {
        const status = this.pop();

        this.registers.P.negative = !!(status & 0x80);
        this.registers.P.overflow = !!(status & 0x40);
        this.registers.P.reserved = !!(status & 0x20);
        this.registers.P.break = !!(status & 0x10);
        this.registers.P.decimal = !!(status & 0x08);
        this.registers.P.interrupt = !!(status & 0x04);
        this.registers.P.zero = !!(status & 0x02);
        this.registers.P.carry = !!(status & 0x01);
    }

    fetch(address: Word, size?: "Byte" | "Word"): Byte {
        if (size === "Word") {
            this.registers.PC += 2;
        } else {
            this.registers.PC += 1;
        }
        return this.read(address, size);
    }

    getAddressOrData(mode: string): { addressOrData: Word, additionalCycle: number } {
        switch (mode) {
            case "accumulator": {
                return {
                    addressOrData: 0x00,
                    additionalCycle: 0
                };
            }
            case "implied": {
                return {
                    addressOrData: 0x00,
                    additionalCycle: 0
                };
            }
           case "immediate": {
                return {
                    addressOrData: this.fetch(this.registers.PC),
                    additionalCycle: 0
                };
           }
            case "relative": {
                const base = this.fetch(this.registers.PC);
                const offset = this.registers.PC;

                const address = base < 0x80 ? base + offset : base + offset - 0x100;

                return {
                    addressOrData: address,
                    additionalCycle: (address & 0xFF00) !== (this.registers.PC & 0xFF00) ? 1 : 0
                };
            }
            case "zeroPage": {
                return {
                    addressOrData: this.fetch(this.registers.PC),
                    additionalCycle: 0
                };
            }
            case "zeroPageX": {
                return {
                    addressOrData: (this.fetch(this.registers.PC) + this.registers.X) & 0xFF,
                    additionalCycle: 0
                };
            }
            case "zeroPageY": {
                return {
                    addressOrData: (this.fetch(this.registers.PC) + this.registers.Y) & 0xFF,
                    additionalCycle: 0
                };
            }
            case "absolute": {
                return {
                    addressOrData: this.fetch(this.registers.PC, "Word"),
                    additionalCycle: 0
                };
            }
            case "absoluteX": {
                const address = this.fetch(this.registers.PC, "Word");
                return {
                    addressOrData: (address + this.registers.X) & 0xFFFF,
                    additionalCycle: (address & 0xFF00) !== ((address + this.registers.X) & 0xFF00) ? 1 : 0
                };
            }
            case "absoluteY": {
                const address = this.fetch(this.registers.PC, "Word");
                return {
                    addressOrData: (address + this.registers.Y) & 0xFFFF,
                    additionalCycle: (address & 0xFF00) !== ((address + this.registers.Y) & 0xFF00) ? 1 : 0
                };
            }
            case 'preIndexedIndirect': {
                // 上位アドレスを$00とし、 また2番目のバイトにインデックスレジスタXを加算（8）した値を下位アドレスとします。
                // このアドレスに格納されている値を実効アドレスの下位バイト、 そしてその次のアドレスに格納されている値を実効アドレスの上位バイトとします。 このインクリメントにおいてキャリーは無視します
                const baseAddr = (this.fetch(this.registers.PC) + this.registers.X) & 0xFF;
                const addr = this.read(baseAddr) + (this.read((baseAddr + 1) & 0xFF) << 8);
                return {
                    addressOrData: addr & 0xFFFF,
                    additionalCycle: (addr & 0xFF00) !== (baseAddr & 0xFF00) ? 1 : 0
                };
            }
            case "postIndexedIndirect": {

                // まず上位アドレスを$00とし、下位アドレスとして2番目のバイトを使用します。
                // このアドレスに格納されている値を次の上位アドレス、 その次のアドレスに格納されている値を次の下位アドレスとします。
                // このときのインクリメントにおけるキャリーは無視します。 得られたアドレスにインデックスレジスタYを加算（16）したものを実効アドレスとします
                const addrOrData = this.fetch(this.registers.PC);
                const baseAddr = this.read(addrOrData) + (this.read((addrOrData + 1) & 0xFF) << 8);
                const addr = baseAddr + this.registers.Y;

                return {
                    addressOrData: addr & 0xFFFF,
                    additionalCycle: (addr & 0xFF00) !== (baseAddr & 0xFF00) ? 1 : 0
                };
            }
            case 'indirectAbsolute': {
                // Absolute Addressingで得られる番地に格納されている値を下位アドレス、
                // その次の番地に格納されている値を上位アドレスとした番地を演算対象とする

                // 2、3番目のバイトで示されるアドレスに格納されている値を実効アドレスの下位バイト、
                // その次のアドレスに格納されている値を実効アドレスの上位バイトとします。
                // このインクリメントで下位バイトからのキャリーは無視します。(addrOrData & 0xFF00) | (((addrOrData & 0xFF) + 1) & 0xFF)
                const addrOrData = this.fetch(this.registers.PC, "Word");
                const addr = this.read(addrOrData) + (this.read((addrOrData & 0xFF00) | (((addrOrData & 0xFF) + 1) & 0xFF)) << 8);
                return {
                    addressOrData: addr & 0xFFFF,
                    additionalCycle: 0
                };
            }
            default: {
                throw new Error(`Unknown addressing mode ${mode} detected.`);
            }
        }
    }

    execInstruction(baseName: string, mode: string, addressOrData: Word) {
        this.hasBranched = false;
        switch (baseName) {
            case "LDA": {
                if (mode === "immediate") {
                    this.registers.A = addressOrData;
                } else {
                    this.registers.A = this.read(addressOrData);
                }
                this.registers.P.negative = !!(this.registers.A & 0x80);
                this.registers.P.zero = !this.registers.A;
                break;
            }
            case "LDX": {
                if (mode === "immediate") {
                    this.registers.X = addressOrData;
                } else {
                    this.registers.X = this.read(addressOrData);
                }
                this.registers.P.negative = !!(this.registers.X & 0x80);
                this.registers.P.zero = !this.registers.X;
                break;
            }
            case "LDY": {
                if (mode === "immediate") {
                    this.registers.Y = addressOrData;
                } else {
                    this.registers.Y = this.read(addressOrData);
                }
                this.registers.P.negative = !!(this.registers.Y & 0x80);
                this.registers.P.zero = !this.registers.Y;
                break;
            }
            case "STA": {
                this.write(addressOrData, this.registers.A);
                break;
            }
            case "STX": {
                this.write(addressOrData, this.registers.X);
                break;
            }
            case "STY": {
                this.write(addressOrData, this.registers.Y);
                break;
            }
            case "TAX": {
                this.registers.X = this.registers.A;
                this.registers.P.negative = !!(this.registers.X & 0x80);
                this.registers.P.zero = !this.registers.X;
                break;
            }
            case "TAY": {
                this.registers.Y = this.registers.A;
                this.registers.P.negative = !!(this.registers.Y & 0x80);
                this.registers.P.zero = !this.registers.Y;
                break;
            }
            case "TXA": {
                this.registers.A = this.registers.X;
                this.registers.P.negative = !!(this.registers.A & 0x80);
                this.registers.P.zero = !this.registers.A;
                break;
            }
            case "TXS": {
                this.registers.SP = this.registers.X + 0x0100;
                break;
            }
            case "TYA": {
                this.registers.A = this.registers.Y;
                this.registers.P.negative = !!(this.registers.A & 0x80);
                this.registers.P.zero = !this.registers.A;
                break;
            }
            case "TSX": {
                this.registers.X = this.registers.SP & 0xFF;
                this.registers.P.negative = !!(this.registers.X & 0x80);
                this.registers.P.zero = !this.registers.X;
                break;
            }
            case "ADC": {
                const data = (mode === "immediate") ? addressOrData : this.read(addressOrData);
                const operated = this.registers.A + data + this.registers.P.carry;

                this.registers.P.negative = !!(operated & 0x80);
                this.registers.P.zero = !(operated & 0xFF);
                this.registers.P.carry = operated > 0xFF;

                // 同符号の足し算、かつ演算結果の符号が違う場合オーバーフロー
                // most significant bit(0x80)で判定できる
                this.registers.P.overflow = (
                    !(((this.registers.A ^ data) & 0x80) !== 0) && ((this.registers.A ^ operated) & 0x80) !== 0
                );
                this.registers.A = operated & 0xFF;
                break;
            }
            case "AND": {
                const data = (mode === "immediate") ? addressOrData : this.read(addressOrData);
                const result = this.registers.A & data;

                this.registers.P.negative = !!(result & 0x80);
                this.registers.P.zero = !result;
                this.registers.A = result & 0xFF;
                break;
            }
            case "BIT": {
                // メモリのデータをAでテストします。
                // A and M の結果でZフラグをセットし、Mのビット7をNへ、ビット6をVへ転送します。
                // flags: N V Z
                const data = (mode === "immediate") ? addressOrData : this.read(addressOrData);
                this.registers.P.zero = !(this.registers.A & data);
                this.registers.P.negative = !!(data & 0x80);
                this.registers.P.overflow = !!(data & 0x40);
                break;
            }
            case "CMP": {
                const data = (mode === "immediate") ? addressOrData : this.read(addressOrData);
                const compared = this.registers.A - data;

                this.registers.P.negative = !!(compared & 0x80);
                this.registers.P.zero = !(compared & 0xFF);

                // ?
                this.registers.P.carry = compared >= 0;
                break;
            }
            case "CPX": {
                const data = (mode === "immediate") ? addressOrData : this.read(addressOrData);
                const compared = this.registers.X - data;

                this.registers.P.negative = !!(compared & 0x80);
                this.registers.P.zero = !(compared & 0xFF);

                // ?
                this.registers.P.carry = compared >= 0;
                break;
            }
            case "CPY": {
                const data = (mode === "immediate") ? addressOrData : this.read(addressOrData);
                const compared = this.registers.Y - data;

                this.registers.P.negative = !!(compared & 0x80);
                this.registers.P.zero = !(compared & 0xFF);

                // ?
                this.registers.P.carry = compared >= 0;
                break;
            }
            case "DEC": {
                const data = this.read(addressOrData);
                const decremented = (data - 1) & 0xFF;

                this.registers.P.negative = !!(decremented & 0x80);
                this.registers.P.zero = !decremented;
                this.write(addressOrData, decremented);
                break;
            }
            case "DEX": {
                this.registers.X = (this.registers.X - 1) & 0xFF;
                this.registers.P.negative = !!(this.registers.X & 0x80);
                this.registers.P.zero = !this.registers.X;
                break;
            }
            case "DEY": {
                this.registers.Y = (this.registers.Y - 1) & 0xFF;
                this.registers.P.negative = !!(this.registers.Y & 0x80);
                this.registers.P.zero = !this.registers.Y;
                break;
            }
            case "EOR": {
                const data = (mode === "immediate") ? addressOrData : this.read(addressOrData);
                const result = this.registers.A ^ data;

                this.registers.P.negative = !!(result & 0x80);
                this.registers.P.zero = !result;
                this.registers.A = result & 0xFF;
                break;
            }
            case "INC": {
                const data = this.read(addressOrData);
                const incremented = (data + 1) & 0xFF;

                this.registers.P.negative = !!(incremented & 0x80);
                this.registers.P.zero = !incremented;
                this.write(addressOrData, incremented);
                break;
            }
            case "INX": {
                this.registers.X = (this.registers.X + 1) & 0xFF;
                this.registers.P.negative = !!(this.registers.X & 0x80);
                this.registers.P.zero = !this.registers.X;
                break;
            }
            case "INY": {
                this.registers.Y = (this.registers.Y + 1) & 0xFF;
                this.registers.P.negative = !!(this.registers.Y & 0x80);
                this.registers.P.zero = !this.registers.Y;
                break;
            }
            case "LSR": {
                if (mode === "accumulator") {

                    // Aを右シフト、ビット7には0
                    // Aのビット0 -> C
                    const acc = this.registers.A & 0xFF; //こうすると右シフトでビット7に0がはいる

                    this.registers.P.carry = !!(acc & 0x01);
                    this.registers.A = acc >> 1;
                    this.registers.P.zero = !this.registers.A;
                } else {
                    const data = this.read(addressOrData);

                    this.registers.P.carry = !!(data & 0x01);
                    this.registers.P.zero = !(data >> 1);
                    this.write(addressOrData, data >> 1);
                }

                // ビット7が0だから
                this.registers.P.negative = false;
                break;
            }
            case "ORA": {
                const data = (mode === "immediate") ? addressOrData : this.read(addressOrData);
                const result = this.registers.A | data;

                this.registers.P.negative = !!(result & 0x80);
                this.registers.P.zero = !result;
                this.registers.A = result & 0xFF;
                break;
            }
            case "ASL": {
                if (mode === "accumulator") {

                    // Aを左シフト、ビット0には0
                    // C <- Aのビット7
                    const acc = this.registers.A;

                    this.registers.A = (acc << 1) & 0xFF;
                    this.registers.P.carry = !!(acc & 0x80);
                    this.registers.P.zero = !(this.registers.A);
                    this.registers.P.negative = !!(this.registers.A & 0x80);
                } else {
                    const data = this.read(addressOrData);
                    const dataToWrite = (data << 1) & 0xFF;
                    this.write(addressOrData, dataToWrite);
                    this.registers.P.carry = !!(data & 0x80);
                    this.registers.P.zero = !(dataToWrite);
                    this.registers.P.negative = !!(dataToWrite & 0x80);
                }
                break;
            }
            case "ROL": {
                if (mode === "accumulator") {

                    // Aを左シフト、ビット0にはC
                    // C <- Aのビット7
                    const acc = this.registers.A;

                    this.registers.A = (acc << 1) & 0xFF | (this.registers.P.carry ? 0x01 : 0x00);
                    this.registers.P.carry = !!(acc & 0x80);
                    this.registers.P.zero = !(this.registers.A);
                    this.registers.P.negative = !!(this.registers.A & 0x80);
                } else {
                    const data = this.read(addressOrData);
                    const dataToWrite = (data << 1) & 0xFF | (this.registers.P.carry ? 0x01 : 0x00);
                    this.write(addressOrData, dataToWrite);
                    this.registers.P.carry = !!(data & 0x80);
                    this.registers.P.zero = !(dataToWrite);
                    this.registers.P.negative = !!(dataToWrite & 0x80);
                }
                break;
            }
            case "ROR": {
                if (mode === "accumulator") {

                    // Aを右シフト、ビット0にはC
                    // C <- Aのビット0
                    const acc = this.registers.A;

                    this.registers.A = (acc >> 1) | (this.registers.P.carry ? 0x80 : 0x00);
                    this.registers.P.carry = !!(acc & 0x01);
                    this.registers.P.zero = !(this.registers.A);
                    this.registers.P.negative = !!(this.registers.A & 0x80);
                } else {
                    const data = this.read(addressOrData);
                    const dataToWrite = (data >> 1) | (this.registers.P.carry ? 0x80 : 0x00);
                    this.write(addressOrData, dataToWrite);
                    this.registers.P.carry = !!(data & 0x80);
                    this.registers.P.zero = !(dataToWrite);
                    this.registers.P.negative = !!(dataToWrite & 0x80);
                }
                break;
            }
            case "SBC": {
                const data = (mode === "immediate") ? addressOrData : this.read(addressOrData);

                // A - M - not C -> A
                const operated = this.registers.A - data - (this.registers.P.carry ? 0 : 1);

                this.registers.P.negative = !!(operated & 0x80);
                this.registers.P.zero = !(operated & 0xFF);
                // ?
                this.registers.P.carry = operated >= 0x00;

                // 同符号の足し算(=異符号の引き算)、かつ演算結果の符号が違う場合オーバーフロー
                // most significant bit(0x80)で判定できる
                this.registers.P.overflow = (
                    (((this.registers.A ^ data) & 0x80) !== 0) && ((this.registers.A ^ operated) & 0x80) !== 0
                );
                this.registers.A = operated & 0xFF;
                break;
            }
            case "PHA": {
                this.push(this.registers.A);
                break;
            }
            case "PLA": {
                this.registers.A = this.pop();
                this.registers.P.negative = !!(this.registers.A & 0x80);
                this.registers.P.zero = !this.registers.A;
                break;
            }
            case "PHP": {
                // ?
                this.registers.P.break = true;
                this.pushStatus();
                break;
            }
            case "PLP": {
                this.popStatus();
                // ?
                this.registers.P.reserved = true;
                break;
            }
            case "JMP": {
                this.registers.PC = addressOrData;
                break;
            }
            case "JSR": {

                // ジャンプサブルーチン命令（JSR）によってスタックに格納する復帰アドレスは、
                // 次の命令の一つ前のアドレス（JSRの最後のバイト）であり、
                // リターンサブルーチン命令（RTS）によってインクリメントします
                const PC = this.registers.PC - 1;

                this.push((PC >> 8) & 0xFF);
                this.push(PC & 0xFF);
                this.registers.PC = addressOrData;
                break;
            }
            case "RTS": {
                this.registers.PC = this.pop(); // 下位バイト
                this.registers.PC += this.pop() << 8; // 上位バイト
                this.registers.PC++;
                break;
            }
            case "RTI": {
                this.popStatus();
                this.registers.PC = this.pop(); // 下位バイト
                this.registers.PC += this.pop() << 8; // 上位バイト
                this.registers.P.reserved = true;
                break;
            }
            case "BCC": {
                if (!this.registers.P.carry) {
                    this.branch(addressOrData);
                }
                break;
            }
            case "BCS": {
                if (this.registers.P.carry) {
                    this.branch(addressOrData);
                }
                break;
            }
            case "BEQ": {
                if (this.registers.P.zero) {
                    this.branch(addressOrData);
                }
                break;
            }
            case "BNE": {
                if (!this.registers.P.zero) {
                    this.branch(addressOrData);
                }
                break;
            }
            case "BVC": {
                if (!this.registers.P.overflow) {
                    this.branch(addressOrData);
                }
                break;
            }
            case "BVS": {
                if (this.registers.P.overflow) {
                    this.branch(addressOrData);
                }
                break;
            }
            case "BPL": {
                if (!this.registers.P.negative) {
                    this.branch(addressOrData);
                }
                break;
            }
            case "BMI": {
                if (this.registers.P.negative) {
                    this.branch(addressOrData);
                }
                break;
            }
            case "CLD": {
                this.registers.P.decimal = false;
                break;
            }
            case "SED": {
                this.registers.P.decimal = true;
                break;
            }
            case "CLV": {
                this.registers.P.overflow = false;
                break;
            }
            case "CLC": {
                this.registers.P.carry = false;
                break;
            }
            case "SEC": {
                this.registers.P.carry = true;
                break;
            }
            case "SEI": {
                this.registers.P.interrupt = true;
                break;
            }
            case "BRK": {

                // 割り込みが確認された時、Iフラグがセットされていれば割り込みは無視します。
                // Iフラグがクリアされていれば、割り込み動作を開始します。BRKでは、Bフラグをセットし、PCに1を加算します。
                // 次にPCの上位バイト、下位バイト、ステータスレジスタを順にスタックへ格納します。
                // 次にIフラグをセットし、最後にPCの下位バイトを$FFFEから、上位バイトを$FFFFからフェッチします。
                // IRQと異なる点はBフラグとPCの扱いのみで、あとは同じです。
                // BRKではPCに1を加算するため、BRK命令のあるアドレス+2番地がリターンアドレスとなります。
                const interrupt = this.registers.P.interrupt;

                this.registers.PC++;
                this.push((this.registers.PC >> 8) & 0xFF);
                this.push(this.registers.PC & 0xFF);
                this.registers.P.break = true;
                this.pushStatus();
                this.registers.P.interrupt = true;

                // Ignore interrupt when already set.
                if (!interrupt) {
                    this.registers.PC = this.read(0xFFFE, "Word");
                }
                this.registers.PC--;
                break;
            }
            case "NOPI": {
                this.registers.PC += 2;
                break;
            }
            case "NOPD": {
                this.registers.PC++;
                break;
            }
            case "NOP": {
                break;
            }
            case "LAX": {
                // Shortcut for LDA value then TAX.
                this.registers.A = this.registers.X = this.read(addressOrData);
                this.registers.P.negative = !!(this.registers.A & 0x80);
                this.registers.P.zero = !this.registers.A;
                break;
            }
            case "SAX": {
                // Stores the bitwise AND of A and X. As with STA and STX, no flags are affected.
                this.write(addressOrData, this.registers.A & this.registers.X);
                break;
            }
            default: {
                throw new Error(`Unknown instruction ${baseName}_${mode} detected.`);
            }
        }
    }

    reset() {
        const pc = this.read(0xFFFC, "Word") | 0x8000;

        this.registers.PC = pc;
    }

    processNmi() {

        // console.log("----process nmi-----");
        this.interrupts.deassertNmi();

        // 割り込みが確認された時、割り込み動作を開始します
        // Bフラグをクリアし、PCの上位バイト、 下位バイト、ステータスレジスタを順にスタックへ格納します
        // 次にIフラグをセットし、最後にPCの下位バイトを$FFFAから、上位バイトを$FFFBからフェッチします
        this.registers.P.break = false;

        // console.log("should return to : " + this.registers.PC.toString(16));
        this.push((this.registers.PC >> 8) & 0xFF);
        this.push(this.registers.PC & 0xFF);
        this.pushStatus();
        this.registers.P.interrupt = true;
        this.registers.PC = this.read(0xFFFA, "Word");

        // console.log("PC: " + this.registers.PC.toString(16));
        // console.log("----process nmi end-----");
    }

    processIrq() {

        /*
          割り込みが確認された時、Iフラグがセットされていれば割り込みは無視します。
          Iフラグがクリアされていれば、割り込み動作を開始します。BRK割り込みと区別するためにBフラグはクリアします。
          次にPCの上位バイト、下位バイト、ステータスレジスタを順にスタックへ格納します。
          次にIフラグをセットし、最後にPCの下位バイトを$FFFEから、上位バイトを$FFFFからフェッチします。
          NMIと異なる点は、Iフラグによる無効化とベクタです。
        */
        if (this.registers.P.interrupt) {
            return;
        }
        this.interrupts.deassertIrq();

        console.log("----process irq-----");

        this.registers.P.break = false;
        this.push((this.registers.PC >> 8) & 0xFF);
        this.push(this.registers.PC & 0xFF);
        this.pushStatus();
        this.registers.P.interrupt = true;
        this.registers.PC = this.read(0xFFFE, "Word");
    }

    showRegisters() {
        const status: Byte =
                  (+this.registers.P.negative) << 7 |
                  (+this.registers.P.overflow) << 6 |
                  (+this.registers.P.reserved) << 5 |
                  (+this.registers.P.break) << 4 |
                  (+this.registers.P.decimal) << 3 |
                  (+this.registers.P.interrupt) << 2 |
                  (+this.registers.P.zero) << 1 |
                  (+this.registers.P.carry);
        console.log("A:", this.registers.A.toString(16), "X:", this.registers.X.toString(16),
                    "Y:", this.registers.Y.toString(16), "P:", status.toString(16),
                    "sp:", this.registers.SP.toString(16));

    }

    run(): number {
        if (this.interrupts.isNmiAssert()) {
            this.processNmi();
        }

        if (this.interrupts.isIrqAssert()) {
            this.processIrq();
        }

        // console.log("PC: " + this.registers.PC.toString(16));
        const opecode = this.fetch(this.registers.PC);

        if (!opecode) {
            throw `${this.registers.PC.toString(16)}: opecode is not defiend. ${this.prev.toString(16)}prev2: ${this.prev2.toString(16)}`;
        }

        // console.log(instructions[opecode.toString(16).toUpperCase()]);
        const instruction = opecode <= 0x0F ?
                  instructions["0" + opecode.toString(16).toUpperCase()] :
                  instructions[opecode.toString(16).toUpperCase()];

        if (!instruction) {
            throw `opecode: ${opecode.toString(16)} :prev: ${this.prev}prev2: ${this.prev2}`;
        }
        const { fullName, baseName, mode, cycle } = instruction;
        const { addressOrData, additionalCycle } = this.getAddressOrData(mode);

        this.counter++;

        if (this.min <= this.counter && this.counter <= this.max) {
            if (baseName !== "BEQ" && baseName !== "CMP") {
                // console.log("PC:", this.registers.PC, baseName, mode, addressOrData, "n:", this.registers.P.negative, "z:", this.registers.P.zero);
            }
        }
        else if (this.counter > this.max){
            // throw "stop";
        }

        // console.log("addressOrdata:" + addressOrData.toString(16));
        this.prev = opecode;
        this.prev2 = this.prev;

        this.execInstruction(baseName, mode, addressOrData);

        return cycle + additionalCycle + (this.hasBranched ? 1 : 0);
    }
}
