/**
 * QQ音乐歌词解码器
 * 用于解码QQ音乐的加密歌词文件（.qqlyric格式）
 */

import * as zlib from "zlib"; // 用于解压缩数据
import * as fs from "fs"; // 用于文件系统操作

// 解密过程中使用的三个密钥
// 解密流程：先用FIRST_DECRYPT_KEY解密，再用MIDDLE_ENCRYPT_KEY加密，最后用FINAL_DECRYPT_KEY解密
const FIRST_DECRYPT_KEY = new Uint8Array([33, 64, 35, 41, 40, 78, 72, 76, 105, 117, 121, 42, 36, 37, 94, 38]);
const MIDDLE_ENCRYPT_KEY = new Uint8Array([49, 50, 51, 90, 88, 67, 33, 64, 35, 41, 40, 42, 36, 37, 94, 38]);
const FINAL_DECRYPT_KEY = new Uint8Array([33, 64, 35, 41, 40, 42, 36, 37, 94, 38, 97, 98, 99, 68, 69, 70]);

/**
 * DES操作模式枚举
 * - encrypt: 加密模式
 * - decrypt: 解密模式
 */
enum DesOperationMode {
  "encrypt",
  "decrypt",
}
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

/**
 * 将数值转换为32位整数
 * 使用位运算快速将浮点数转换为整数，比Math.floor更高效
 * @param value 输入数值（可以是浮点数）
 * @returns 转换后的32位整数
 */
function toInteger(value: number): number {
  return value | 0; // 使用位或运算强制转换为32位整数
}

/**
 * 从字节数组中获取指定位置的比特并进行位移
 * 用于DES算法中从密钥或数据块中提取特定位置的比特
 * @param byteArray 字节数组（通常是密钥或数据块）
 * @param bitPosition 要提取的比特在整个数组中的绝对位置
 * @param shiftAmount 提取后将该比特左移的位数
 * @returns 处理后的无符号32位整数值
 */
function getBitFromArray(byteArray: Uint8Array, bitPosition: number, shiftAmount: number): number {
  // 计算目标比特所在的字节索引
  const byteIndex = toInteger(bitPosition / 32) * 4 + 3 - toInteger((bitPosition % 32) / 8);
  // 计算目标比特在其所在字节中的位置（从左到右，0-7）
  const bitIndexInByte = 7 - (bitPosition % 8);
  // 提取比特值，左移指定位数，并确保结果为无符号32位整数
  return (((byteArray[byteIndex] >>> bitIndexInByte) & 0x01) << shiftAmount) >>> 0;
}

/**
 * 从数值右侧获取指定位置的比特并进行位移
 * 用于从32位整数的右侧（低位）提取特定位置的比特
 * @param value 输入的32位整数值
 * @param position 要提取的比特位置（0-31，0表示最右侧的比特）
 * @param shiftAmount 提取后将该比特左移的位数
 * @returns 处理后的无符号32位整数值
 */
function getBitFromRight(value: number, position: number, shiftAmount: number): number {
  // 将value右移(31-position)位，提取目标比特到最低位
  // 使用掩码0x00000001提取最低位的值
  // 将提取的比特左移指定位数，并确保结果为无符号32位整数
  return (((value >>> (31 - position)) & 0x00000001) << shiftAmount) >>> 0;
}

/**
 * 从数值左侧获取指定位置的比特并进行位移
 * 用于从32位整数的左侧（高位）提取特定位置的比特
 * @param value 输入的32位整数值
 * @param position 要提取的比特位置（0-31，0表示最左侧的比特）
 * @param shiftAmount 提取后将该比特右移的位数
 * @returns 处理后的无符号32位整数值
 */
function getBitFromLeft(value: number, position: number, shiftAmount: number): number {
  // 将value左移position位，使目标比特移动到最高位
  // 使用掩码0x80000000(10000000 00000000 00000000 00000000)提取最高位的值
  // 将提取的比特右移指定位数，并确保结果为无符号32位整数
  return (((value << position) & 0x80000000) >>> shiftAmount) >>> 0;
}

/**
 * 变换S盒的比特值，用于DES算法中的S盒变换
 * 将6位输入值转换为S盒索引格式（行列格式）
 * DES的S盒索引格式：第1和第6位组成行号，中间4位组成列号
 * @param inputValue 输入的6位值（0-63范围内）
 * @returns 变换后的S盒索引格式值（0-63范围内）
 */
function transformSboxBit(inputValue: number): number {
  // 保留第6位(0x20 = 00100000)作为行号的一部分
  const bit6 = inputValue & 0x20;
  // 将中间4位右移1位作为列号
  const middleBits = (inputValue & 0x1f) >>> 1;
  // 将第1位左移4位作为行号的另一部分
  const bit1 = (inputValue & 0x01) << 4;
  // 组合结果并确保为无符号32位整数
  return (bit6 | middleBits | bit1) >>> 0;
}

/**
 * DES算法的F函数，用于Feistel网络中的轮函数计算
 * F函数是DES算法的核心，包含扩展置换、密钥混合、S盒替代和P盒置换四个步骤
 * @param inputState 当前32位输入状态
 * @param roundKey 当前轮的48位子密钥
 * @returns 处理后的32位输出状态
 */
function f(inputState: number, roundKey: Uint8Array): number {
  // 初始化48位扩展状态数组（6个字节），用于存储中间结果
  const expandedState = new Array<number>(6).fill(0);
  let firstHalf: number, secondHalf: number;

  // 第一步：扩展置换（Expansion Permutation）
  // 将32位输入状态扩展到48位，某些位会被重复使用
  // 扩展置换表：32->48位映射，使数据长度与子密钥匹配

  // 处理前24位（对应expandedState的前3个字节）
  firstHalf =
    getBitFromLeft(inputState, 31, 0) | // 第32位 -> 第1位
    ((inputState & 0xf0000000) >>> 1) | // 第1-4位 -> 第2-5位
    getBitFromLeft(inputState, 4, 5) | // 第5位 -> 第6位
    getBitFromLeft(inputState, 3, 6) | // 第4位 -> 第7位
    ((inputState & 0x0f000000) >>> 3) | // 第5-8位 -> 第8-11位
    getBitFromLeft(inputState, 8, 11) | // 第9位 -> 第12位
    getBitFromLeft(inputState, 7, 12) | // 第8位 -> 第13位
    ((inputState & 0x00f00000) >>> 5) | // 第9-12位 -> 第14-17位
    getBitFromLeft(inputState, 12, 17) | // 第13位 -> 第18位
    getBitFromLeft(inputState, 11, 18) | // 第12位 -> 第19位
    ((inputState & 0x000f0000) >>> 7) | // 第13-16位 -> 第20-23位
    getBitFromLeft(inputState, 16, 23); // 第17位 -> 第24位
  firstHalf >>>= 0; // 确保是无符号32位整数

  // 处理后24位（对应expandedState的后3个字节）
  secondHalf =
    getBitFromLeft(inputState, 15, 0) | // 第16位 -> 第25位
    ((inputState & 0x0000f000) << 15) | // 第17-20位 -> 第26-29位
    getBitFromLeft(inputState, 20, 5) | // 第21位 -> 第30位
    getBitFromLeft(inputState, 19, 6) | // 第20位 -> 第31位
    ((inputState & 0x00000f00) << 13) | // 第21-24位 -> 第32-35位
    getBitFromLeft(inputState, 24, 11) | // 第25位 -> 第36位
    getBitFromLeft(inputState, 23, 12) | // 第24位 -> 第37位
    ((inputState & 0x000000f0) << 11) | // 第25-28位 -> 第38-41位
    getBitFromLeft(inputState, 28, 17) | // 第29位 -> 第42位
    getBitFromLeft(inputState, 27, 18) | // 第28位 -> 第43位
    ((inputState & 0x0000000f) << 9) | // 第29-32位 -> 第44-47位
    getBitFromLeft(inputState, 0, 23); // 第1位 -> 第48位
  secondHalf >>>= 0; // 确保是无符号32位整数

  // 第二步：密钥混合 - 将扩展后的48位状态与轮密钥进行异或操作
  for (let i = 0; i < expandedState.length; i++) {
    // 从两半部分中提取对应的字节
    if (i < 3) {
      // 从firstHalf提取前3个字节
      expandedState[i] = (firstHalf >>> (24 - i * 8)) & 0xff;
    } else {
      // 从secondHalf提取后3个字节
      expandedState[i] = (secondHalf >>> (48 - i * 8)) & 0xff;
    }
    // 与轮密钥对应字节进行异或
    expandedState[i] ^= roundKey[i];
    // 确保结果是无符号整数
    expandedState[i] >>>= 0;
  }

  // 第三步：S盒替代（Substitution Box）- 非线性变换
  // 将48位数据分成8组，每组6位，通过8个不同的S盒变换为4位输出，总共输出32位
  let substitutedState =
    // S盒1处理第1组6位，输出放在结果的最高4位（位28-31）
    (sbox1[transformSboxBit(expandedState[0] >>> 2)] << 28) |
    // S盒2处理第2组6位（跨越第1和第2字节），输出放在位24-27
    (sbox2[transformSboxBit(((expandedState[0] & 0x03) << 4) | (expandedState[1] >>> 4))] << 24) |
    // S盒3处理第3组6位（跨越第2和第3字节），输出放在位20-23
    (sbox3[transformSboxBit(((expandedState[1] & 0x0f) << 2) | (expandedState[2] >>> 6))] << 20) |
    // S盒4处理第4组6位（第3字节的低6位），输出放在位16-19
    (sbox4[transformSboxBit(expandedState[2] & 0x3f)] << 16) |
    // S盒5处理第5组6位（第4字节的高6位），输出放在位12-15
    (sbox5[transformSboxBit(expandedState[3] >>> 2)] << 12) |
    // S盒6处理第6组6位（跨越第4和第5字节），输出放在位8-11
    (sbox6[transformSboxBit(((expandedState[3] & 0x03) << 4) | (expandedState[4] >>> 4))] << 8) |
    // S盒7处理第7组6位（跨越第5和第6字节），输出放在位4-7
    (sbox7[transformSboxBit(((expandedState[4] & 0x0f) << 2) | (expandedState[5] >>> 6))] << 4) |
    // S盒8处理第8组6位（第6字节的低6位），输出放在位0-3
    sbox8[transformSboxBit(expandedState[5] & 0x3f)];
  substitutedState >>>= 0; // 确保是无符号32位整数

  // 第四步：P盒置换（Permutation）- 将32位S盒输出的比特进行重新排列
  // P盒置换表定义了输出位的重排顺序
  let permutedState =
    getBitFromLeft(substitutedState, 15, 0) |
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
  permutedState >>>= 0; // 确保是无符号32位整数

  // 返回最终的32位输出状态
  return permutedState;
}

/**
 * DES密钥调度函数，用于生成16轮子密钥
 * @param masterKey 64位主密钥（实际只使用56位，每个字节的最低位用作奇偶校验位）
 * @param operationMode 操作模式（加密或解密）
 * @returns 16个48位子密钥的数组
 */
function des_key_setup(masterKey: Uint8Array, operationMode: DesOperationMode): Uint8Array[] {
  // 初始化16个子密钥，每个子密钥为48位（6字节）
  const subKeys: Uint8Array[] = Array(16)
    .fill(null)
    .map(() => new Uint8Array(6));

  // 常量表存储为 Uint8Array 以提高访问速度
  // 每轮左移位数表 - 定义每轮密钥生成时C和D需要左移的位数
  const KEY_ROTATION_SCHEDULE = new Uint8Array([1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1]);

  // PC-1置换表C部分 - 用于从64位密钥中选取28位形成C
  const PC1_C_TABLE = new Uint8Array([
    56, 48, 40, 32, 24, 16, 8, 0, 57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35,
  ]);

  // PC-1置换表D部分 - 用于从64位密钥中选取28位形成D
  const PC1_D_TABLE = new Uint8Array([
    62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 60, 52, 44, 36, 28, 20, 12, 4, 27, 19, 11, 3,
  ]);

  // PC-2压缩置换表 - 从56位(C和D)中选取48位作为子密钥
  const PC2_COMPRESSION_TABLE = new Uint8Array([
    13, 16, 10, 23, 0, 4, 2, 27, 14, 5, 20, 9, 22, 18, 11, 3, 25, 7, 15, 6, 26, 19, 12, 1, 40, 51, 30, 36, 46, 54, 29,
    39, 50, 44, 32, 47, 43, 48, 38, 55, 33, 52, 45, 41, 49, 35, 28, 31,
  ]);

  // 初始化C和D寄存器，分别存储密钥的左半部分和右半部分（各28位）
  let cRegister = 0; // 存储密钥左半部分的28位
  let dRegister = 0; // 存储密钥右半部分的28位

  // 第一步：PC-1置换 - 从64位密钥中选取56位有效位，并分为C和D两部分
  // 填充C寄存器（28位）
  for (let i = 0, j = 31; i < 28; ++i, --j) {
    // 计算主密钥中对应比特的字节索引
    const keyByteIndex = Math.floor(PC1_C_TABLE[i] / 32) * 4 + 3 - Math.floor((PC1_C_TABLE[i] % 32) / 8);
    // 计算在该字节中的位置
    const keyBitPosition = 7 - (PC1_C_TABLE[i] % 8);
    // 提取比特值并放入C寄存器的对应位置
    cRegister |= (((masterKey[keyByteIndex] >>> keyBitPosition) & 0x01) << j) >>> 0;
  }

  // 填充D寄存器（28位）
  for (let i = 0, j = 31; i < 28; ++i, --j) {
    // 计算主密钥中对应比特的字节索引
    const keyByteIndex = Math.floor(PC1_D_TABLE[i] / 32) * 4 + 3 - Math.floor((PC1_D_TABLE[i] % 32) / 8);
    // 计算在该字节中的位置
    const keyBitPosition = 7 - (PC1_D_TABLE[i] % 8);
    // 提取比特值并放入D寄存器的对应位置
    dRegister |= (((masterKey[keyByteIndex] >>> keyBitPosition) & 0x01) << j) >>> 0;
  }

  // 第二步：生成16个子密钥
  for (let round = 0; round < 16; ++round) {
    // 根据当前轮数对C和D进行循环左移
    const shiftAmount = KEY_ROTATION_SCHEDULE[round];

    // 对C和D分别进行循环左移，注意只使用高28位（低4位为0）
    cRegister = ((cRegister << shiftAmount) | (cRegister >>> (28 - shiftAmount))) & 0xfffffff0;
    dRegister = ((dRegister << shiftAmount) | (dRegister >>> (28 - shiftAmount))) & 0xfffffff0;

    // 确保结果是无符号32位整数
    cRegister >>>= 0;
    dRegister >>>= 0;

    // 根据操作模式确定子密钥生成顺序
    // 加密模式：按顺序使用子密钥0-15
    // 解密模式：按逆序使用子密钥15-0
    const subKeyIndex = operationMode === DesOperationMode.decrypt ? 15 - round : round;

    // 确保当前子密钥数组已初始化并重置为0
    if (!(subKeys[subKeyIndex] instanceof Uint8Array)) {
      subKeys[subKeyIndex] = new Uint8Array(6);
    } else {
      subKeys[subKeyIndex].fill(0);
    }

    // 第三步：PC-2压缩置换 - 从56位(C和D)选取48位形成子密钥
    // 处理来自C寄存器的24位（PC2表的前24项）
    for (let j = 0; j < 24; ++j) {
      // 计算目标字节索引（0-5）
      const targetByteIndex = Math.floor(j / 8);
      // 计算在目标字节中的位置（0-7）
      const targetBitPosition = 7 - (j % 8);
      // 从C寄存器中提取对应比特并放入子密钥
      const bitValue = ((cRegister >>> (31 - PC2_COMPRESSION_TABLE[j])) & 0x01) << targetBitPosition;
      subKeys[subKeyIndex][targetByteIndex] |= bitValue;
    }

    // 处理来自D寄存器的24位（PC2表的后24项）
    for (let j = 24; j < 48; ++j) {
      // 计算目标字节索引（0-5）
      const targetByteIndex = Math.floor(j / 8);
      // 计算在目标字节中的位置（0-7）
      const targetBitPosition = 7 - (j % 8);
      // 从D寄存器中提取对应比特并放入子密钥
      // 注意：PC2_COMPRESSION_TABLE[j] - 27 是因为D寄存器的比特编号从0开始，而PC2表中对应D部分的值需要减去偏移量
      const bitValue = ((dRegister >>> (31 - (PC2_COMPRESSION_TABLE[j] - 27))) & 0x01) << targetBitPosition;
      subKeys[subKeyIndex][targetByteIndex] |= bitValue;
    }
  }

  // 返回生成的16个子密钥
  return subKeys;
}

/**
 * DES加密/解密核心函数，对单个64位数据块进行处理
 * @param dataBlock 输入/输出的64位数据块（8字节）
 * @param subKeys 16轮子密钥数组
 */
function des_crypt(dataBlock: Uint8Array, subKeys: Uint8Array[]): void {
  let temp = 0;
  // 初始化左右两个32位状态寄存器
  let leftRegister = 0; // 左侧32位状态
  let rightRegister = 0; // 右侧32位状态

  // 第一步：初始置换（IP）- 将输入的64位数据重排列到左右两个32位寄存器中
  // 填充左侧寄存器（32位）
  for (let i = 31, bitPos = 57; i >= 0; bitPos -= 8, i--) {
    // 处理IP置换表的循环模式
    if (bitPos < 0) bitPos += 66;
    // 从数据块中提取比特并放入左侧寄存器
    leftRegister |= getBitFromArray(dataBlock, bitPos, i);
  }

  // 填充右侧寄存器（32位）
  for (let i = 31, bitPos = 56; i >= 0; bitPos -= 8, i--) {
    // 处理IP置换表的循环模式
    if (bitPos < 0) bitPos += 66;
    // 从数据块中提取比特并放入右侧寄存器
    rightRegister |= getBitFromArray(dataBlock, bitPos, i);
  }

  // 第二步：执行16轮Feistel网络
  // 前15轮：每轮后交换左右两个寄存器
  for (let round = 0; round < 15; ++round) {
    // 保存右侧寄存器的值用于交换
    temp = rightRegister;
    // 右侧寄存器 = 左侧寄存器 ^ F(右侧寄存器, 当前轮子密钥)
    rightRegister = f(rightRegister, subKeys[round]) ^ leftRegister;
    // 确保结果是无符号32位整数
    rightRegister >>>= 0;
    // 左侧寄存器 = 原右侧寄存器
    leftRegister = temp;
  }

  // 第16轮：不交换左右两个寄存器
  leftRegister = f(rightRegister, subKeys[15]) ^ leftRegister;
  // 确保结果是无符号32位整数
  leftRegister >>>= 0;

  // 第三步：最终置换（IP^-1）- 将左右两个32位寄存器的内容重排列回输出数据块
  for (let i = 0; i < 8; i++) {
    // 清空输出数据块的当前字节
    dataBlock[i] = 0;
    // 计算最终置换中的位置偏移
    const offset = (i + 4) % 8;

    // 每个输出字节由左右两个寄存器的8个比特交错组成
    for (let j = 0; j < 4; j++) {
      // 从右侧寄存器获取一个比特放在奇数位置
      // 从左侧寄存器获取一个比特放在偶数位置
      dataBlock[i] |=
        getBitFromRight(rightRegister, j * 8 + offset, 7 - j * 2) |
        getBitFromRight(leftRegister, j * 8 + offset, 6 - j * 2);
    }
  }
}

/**
 * DES加密函数，对输入数据进行加密
 * 使用ECB模式（电子密码本模式）对数据进行分块加密，每块64位（8字节）
 * @param data 待加密的数据缓冲区
 * @param key 64位密钥（8字节）
 */
function des(data: Uint8Array, key: Uint8Array): void {
  // 生成加密模式下的16轮子密钥
  const subKeys = des_key_setup(key, DesOperationMode.encrypt);

  // 按8字节（64位）一块处理输入数据
  for (let offset = 0; offset < data.length; offset += 8) {
    // 对当前数据块进行加密
    des_crypt(data.subarray(offset, offset + 8), subKeys);
  }
}

/**
 * DES解密函数，对输入数据进行解密
 * 使用ECB模式（电子密码本模式）对数据进行分块解密，每块64位（8字节）
 * @param data 待解密的数据缓冲区
 * @param key 64位密钥（8字节）
 */
function Ddes(data: Uint8Array, key: Uint8Array): void {
  // 生成解密模式下的16轮子密钥（与加密顺序相反）
  const subKeys = des_key_setup(key, DesOperationMode.decrypt);

  // 按8字节（64位）一块处理输入数据
  for (let offset = 0; offset < data.length; offset += 8) {
    // 对当前数据块进行解密
    des_crypt(data.subarray(offset, offset + 8), subKeys);
  }
}

/**
 * QQ音乐歌词解码函数
 * 将QQ音乐加密的歌词文件（.qqlyric格式）解码为原始数据
 * 解码流程：先用FIRST_DECRYPT_KEY解密，再用MIDDLE_ENCRYPT_KEY加密，最后用FINAL_DECRYPT_KEY解密
 * @param hexString 十六进制字符串形式的加密歌词数据
 * @returns 解码后的原始数据（通常需要进一步用zlib解压缩）
 */
export function decodeQrc(hexString: string): Uint8Array {
  // 第一步：将十六进制字符串转换为字节数组
  const data = new Uint8Array(Math.ceil(hexString.length / 2));
  for (let i = 0; i < data.length; i++) {
    // 每两个十六进制字符转换为一个字节
    data[i] = parseInt(hexString.substring(i * 2, i * 2 + 2), 16);
  }

  // 第二步：三重DES解密过程
  // 1. 使用第一个密钥进行解密
  Ddes(data, FIRST_DECRYPT_KEY);
  // 2. 使用第二个密钥进行加密（注意这里是加密不是解密）
  des(data, MIDDLE_ENCRYPT_KEY);
  // 3. 使用第三个密钥进行解密
  Ddes(data, FINAL_DECRYPT_KEY);

  // 返回解码后的数据（通常需要进一步用zlib解压缩）
  return data;
}

console.log(Array.from(decodeQrc(fs.readFileSync("lyric_file/1251167.qqlyric", "hex"))).join(","));
