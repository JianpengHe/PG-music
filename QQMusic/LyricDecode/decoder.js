"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeQrc = decodeQrc;
const fs = require("fs");
const FIRST_DECRYPT_KEY = new Uint8Array([33, 64, 35, 41, 40, 78, 72, 76, 105, 117, 121, 42, 36, 37, 94, 38]);
const MIDDLE_ENCRYPT_KEY = new Uint8Array([49, 50, 51, 90, 88, 67, 33, 64, 35, 41, 40, 42, 36, 37, 94, 38]);
const FINAL_DECRYPT_KEY = new Uint8Array([33, 64, 35, 41, 40, 42, 36, 37, 94, 38, 97, 98, 99, 68, 69, 70]);
var DesOperationMode;
(function (DesOperationMode) {
    DesOperationMode[DesOperationMode["encrypt"] = 0] = "encrypt";
    DesOperationMode[DesOperationMode["decrypt"] = 1] = "decrypt";
})(DesOperationMode || (DesOperationMode = {}));
const sbox1 = [
    14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7, 0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8, 4, 1, 14,
    8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0, 15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13,
];
const sbox2 = [
    15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10, 3, 13, 4, 7, 15, 2, 8, 15, 12, 0, 1, 10, 6, 9, 11, 5, 0, 14, 7,
    11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15, 13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9,
];
const sbox3 = [
    10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8, 13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1, 13, 6, 4,
    9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7, 1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12,
];
const sbox4 = [
    7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15, 13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9, 10, 6, 9,
    0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4, 3, 15, 0, 6, 10, 10, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14,
];
const sbox5 = [
    2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9, 14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6, 4, 2, 1,
    11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14, 11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3,
];
const sbox6 = [
    12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11, 10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8, 9, 14, 15,
    5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6, 4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13,
];
const sbox7 = [
    4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1, 13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6, 1, 4, 11,
    13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2, 6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12,
];
const sbox8 = [
    13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7, 1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2, 7, 11, 4,
    1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8, 2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11,
];
function toInteger(value) {
    return value | 0;
}
function getBitFromArray(byteArray, bitPosition, shiftAmount) {
    const byteIndex = toInteger(bitPosition / 32) * 4 + 3 - toInteger((bitPosition % 32) / 8);
    const bitIndexInByte = 7 - (bitPosition % 8);
    return (((byteArray[byteIndex] >>> bitIndexInByte) & 0x01) << shiftAmount) >>> 0;
}
function getBitFromRight(value, position, shiftAmount) {
    return (((value >>> (31 - position)) & 0x00000001) << shiftAmount) >>> 0;
}
function getBitFromLeft(value, position, shiftAmount) {
    return (((value << position) & 0x80000000) >>> shiftAmount) >>> 0;
}
function transformSboxBit(inputValue) {
    const bit6 = inputValue & 0x20;
    const middleBits = (inputValue & 0x1f) >>> 1;
    const bit1 = (inputValue & 0x01) << 4;
    return (bit6 | middleBits | bit1) >>> 0;
}
function f(inputState, roundKey) {
    const expandedState = new Array(6).fill(0);
    let firstHalf, secondHalf;
    firstHalf =
        getBitFromLeft(inputState, 31, 0) |
            ((inputState & 0xf0000000) >>> 1) |
            getBitFromLeft(inputState, 4, 5) |
            getBitFromLeft(inputState, 3, 6) |
            ((inputState & 0x0f000000) >>> 3) |
            getBitFromLeft(inputState, 8, 11) |
            getBitFromLeft(inputState, 7, 12) |
            ((inputState & 0x00f00000) >>> 5) |
            getBitFromLeft(inputState, 12, 17) |
            getBitFromLeft(inputState, 11, 18) |
            ((inputState & 0x000f0000) >>> 7) |
            getBitFromLeft(inputState, 16, 23);
    firstHalf >>>= 0;
    secondHalf =
        getBitFromLeft(inputState, 15, 0) |
            ((inputState & 0x0000f000) << 15) |
            getBitFromLeft(inputState, 20, 5) |
            getBitFromLeft(inputState, 19, 6) |
            ((inputState & 0x00000f00) << 13) |
            getBitFromLeft(inputState, 24, 11) |
            getBitFromLeft(inputState, 23, 12) |
            ((inputState & 0x000000f0) << 11) |
            getBitFromLeft(inputState, 28, 17) |
            getBitFromLeft(inputState, 27, 18) |
            ((inputState & 0x0000000f) << 9) |
            getBitFromLeft(inputState, 0, 23);
    secondHalf >>>= 0;
    for (let i = 0; i < expandedState.length; i++) {
        if (i < 3) {
            expandedState[i] = (firstHalf >>> (24 - i * 8)) & 0xff;
        }
        else {
            expandedState[i] = (secondHalf >>> (48 - i * 8)) & 0xff;
        }
        expandedState[i] ^= roundKey[i];
        expandedState[i] >>>= 0;
    }
    let substitutedState = (sbox1[transformSboxBit(expandedState[0] >>> 2)] << 28) |
        (sbox2[transformSboxBit(((expandedState[0] & 0x03) << 4) | (expandedState[1] >>> 4))] << 24) |
        (sbox3[transformSboxBit(((expandedState[1] & 0x0f) << 2) | (expandedState[2] >>> 6))] << 20) |
        (sbox4[transformSboxBit(expandedState[2] & 0x3f)] << 16) |
        (sbox5[transformSboxBit(expandedState[3] >>> 2)] << 12) |
        (sbox6[transformSboxBit(((expandedState[3] & 0x03) << 4) | (expandedState[4] >>> 4))] << 8) |
        (sbox7[transformSboxBit(((expandedState[4] & 0x0f) << 2) | (expandedState[5] >>> 6))] << 4) |
        sbox8[transformSboxBit(expandedState[5] & 0x3f)];
    substitutedState >>>= 0;
    let permutedState = getBitFromLeft(substitutedState, 15, 0) |
        getBitFromLeft(substitutedState, 6, 1) |
        getBitFromLeft(substitutedState, 19, 2) |
        getBitFromLeft(substitutedState, 20, 3) |
        getBitFromLeft(substitutedState, 28, 4) |
        getBitFromLeft(substitutedState, 11, 5) |
        getBitFromLeft(substitutedState, 27, 6) |
        getBitFromLeft(substitutedState, 16, 7) |
        getBitFromLeft(substitutedState, 0, 8) |
        getBitFromLeft(substitutedState, 14, 9) |
        getBitFromLeft(substitutedState, 22, 10) |
        getBitFromLeft(substitutedState, 25, 11) |
        getBitFromLeft(substitutedState, 4, 12) |
        getBitFromLeft(substitutedState, 17, 13) |
        getBitFromLeft(substitutedState, 30, 14) |
        getBitFromLeft(substitutedState, 9, 15) |
        getBitFromLeft(substitutedState, 1, 16) |
        getBitFromLeft(substitutedState, 7, 17) |
        getBitFromLeft(substitutedState, 23, 18) |
        getBitFromLeft(substitutedState, 13, 19) |
        getBitFromLeft(substitutedState, 31, 20) |
        getBitFromLeft(substitutedState, 26, 21) |
        getBitFromLeft(substitutedState, 2, 22) |
        getBitFromLeft(substitutedState, 8, 23) |
        getBitFromLeft(substitutedState, 18, 24) |
        getBitFromLeft(substitutedState, 12, 25) |
        getBitFromLeft(substitutedState, 29, 26) |
        getBitFromLeft(substitutedState, 5, 27) |
        getBitFromLeft(substitutedState, 21, 28) |
        getBitFromLeft(substitutedState, 10, 29) |
        getBitFromLeft(substitutedState, 3, 30) |
        getBitFromLeft(substitutedState, 24, 31);
    permutedState >>>= 0;
    return permutedState;
}
function des_key_setup(masterKey, operationMode) {
    const subKeys = Array(16)
        .fill(null)
        .map(() => new Uint8Array(6));
    const KEY_ROTATION_SCHEDULE = new Uint8Array([1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1]);
    const PC1_C_TABLE = new Uint8Array([
        56, 48, 40, 32, 24, 16, 8, 0, 57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35,
    ]);
    const PC1_D_TABLE = new Uint8Array([
        62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 60, 52, 44, 36, 28, 20, 12, 4, 27, 19, 11, 3,
    ]);
    const PC2_COMPRESSION_TABLE = new Uint8Array([
        13, 16, 10, 23, 0, 4, 2, 27, 14, 5, 20, 9, 22, 18, 11, 3, 25, 7, 15, 6, 26, 19, 12, 1, 40, 51, 30, 36, 46, 54, 29,
        39, 50, 44, 32, 47, 43, 48, 38, 55, 33, 52, 45, 41, 49, 35, 28, 31,
    ]);
    let cRegister = 0;
    let dRegister = 0;
    for (let i = 0, j = 31; i < 28; ++i, --j) {
        const keyByteIndex = Math.floor(PC1_C_TABLE[i] / 32) * 4 + 3 - Math.floor((PC1_C_TABLE[i] % 32) / 8);
        const keyBitPosition = 7 - (PC1_C_TABLE[i] % 8);
        cRegister |= (((masterKey[keyByteIndex] >>> keyBitPosition) & 0x01) << j) >>> 0;
    }
    for (let i = 0, j = 31; i < 28; ++i, --j) {
        const keyByteIndex = Math.floor(PC1_D_TABLE[i] / 32) * 4 + 3 - Math.floor((PC1_D_TABLE[i] % 32) / 8);
        const keyBitPosition = 7 - (PC1_D_TABLE[i] % 8);
        dRegister |= (((masterKey[keyByteIndex] >>> keyBitPosition) & 0x01) << j) >>> 0;
    }
    for (let round = 0; round < 16; ++round) {
        const shiftAmount = KEY_ROTATION_SCHEDULE[round];
        cRegister = ((cRegister << shiftAmount) | (cRegister >>> (28 - shiftAmount))) & 0xfffffff0;
        dRegister = ((dRegister << shiftAmount) | (dRegister >>> (28 - shiftAmount))) & 0xfffffff0;
        cRegister >>>= 0;
        dRegister >>>= 0;
        const subKeyIndex = operationMode === DesOperationMode.decrypt ? 15 - round : round;
        if (!(subKeys[subKeyIndex] instanceof Uint8Array)) {
            subKeys[subKeyIndex] = new Uint8Array(6);
        }
        else {
            subKeys[subKeyIndex].fill(0);
        }
        for (let j = 0; j < 24; ++j) {
            const targetByteIndex = Math.floor(j / 8);
            const targetBitPosition = 7 - (j % 8);
            const bitValue = ((cRegister >>> (31 - PC2_COMPRESSION_TABLE[j])) & 0x01) << targetBitPosition;
            subKeys[subKeyIndex][targetByteIndex] |= bitValue;
        }
        for (let j = 24; j < 48; ++j) {
            const targetByteIndex = Math.floor(j / 8);
            const targetBitPosition = 7 - (j % 8);
            const bitValue = ((dRegister >>> (31 - (PC2_COMPRESSION_TABLE[j] - 27))) & 0x01) << targetBitPosition;
            subKeys[subKeyIndex][targetByteIndex] |= bitValue;
        }
    }
    return subKeys;
}
function des_crypt(dataBlock, subKeys) {
    let temp = 0;
    let leftRegister = 0;
    let rightRegister = 0;
    for (let i = 31, bitPos = 57; i >= 0; bitPos -= 8, i--) {
        if (bitPos < 0)
            bitPos += 66;
        leftRegister |= getBitFromArray(dataBlock, bitPos, i);
    }
    for (let i = 31, bitPos = 56; i >= 0; bitPos -= 8, i--) {
        if (bitPos < 0)
            bitPos += 66;
        rightRegister |= getBitFromArray(dataBlock, bitPos, i);
    }
    for (let round = 0; round < 15; ++round) {
        temp = rightRegister;
        rightRegister = f(rightRegister, subKeys[round]) ^ leftRegister;
        rightRegister >>>= 0;
        leftRegister = temp;
    }
    leftRegister = f(rightRegister, subKeys[15]) ^ leftRegister;
    leftRegister >>>= 0;
    for (let i = 0; i < 8; i++) {
        dataBlock[i] = 0;
        const offset = (i + 4) % 8;
        for (let j = 0; j < 4; j++) {
            dataBlock[i] |=
                getBitFromRight(rightRegister, j * 8 + offset, 7 - j * 2) |
                    getBitFromRight(leftRegister, j * 8 + offset, 6 - j * 2);
        }
    }
}
function des(data, key) {
    const subKeys = des_key_setup(key, DesOperationMode.encrypt);
    for (let offset = 0; offset < data.length; offset += 8) {
        des_crypt(data.subarray(offset, offset + 8), subKeys);
    }
}
function Ddes(data, key) {
    const subKeys = des_key_setup(key, DesOperationMode.decrypt);
    for (let offset = 0; offset < data.length; offset += 8) {
        des_crypt(data.subarray(offset, offset + 8), subKeys);
    }
}
function decodeQrc(hexString) {
    const data = new Uint8Array(Math.ceil(hexString.length / 2));
    for (let i = 0; i < data.length; i++) {
        data[i] = parseInt(hexString.substring(i * 2, i * 2 + 2), 16);
    }
    Ddes(data, FIRST_DECRYPT_KEY);
    des(data, MIDDLE_ENCRYPT_KEY);
    Ddes(data, FINAL_DECRYPT_KEY);
    return data;
}
console.log(Array.from(decodeQrc(fs.readFileSync("lyric_file/1251167.qqlyric", "hex"))).join(","));
//# sourceMappingURL=decoder.js.map