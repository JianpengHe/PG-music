/**
 * QQ音乐歌词解码模块
 * 将C++版本的DES加密/解密算法和歌词解码功能移植到Node.js
 */

const crypto = require("crypto");
const fs = require("fs");

// 定义密钥 - 与C++版本保持一致
const KEY1 = Buffer.from("!@#)(NHLiuy*$%^&");
const KEY2 = Buffer.from("123ZXC!@#)(*$%^&");
const KEY3 = Buffer.from("!@#)(*$%^&abcDEF");

/**
 * DES加密函数 - 对应C++版本的func_des
 * @param {Buffer} buffer - 要加密的数据
 * @param {Buffer} key - 加密密钥
 * @returns {Buffer} - 加密后的数据
 */
function desEncrypt(buffer, key) {
  // 确保密钥长度为8字节（DES要求）
  const desKey = key.slice(0, 8);
  // 创建结果缓冲区
  const result = Buffer.from(buffer);

  // 按8字节块处理数据
  for (let i = 0; i < result.length; i += 8) {
    // 提取当前块
    const block = result.slice(i, Math.min(i + 8, result.length));

    // 如果块不足8字节，需要填充
    let paddedBlock = block;
    if (block.length < 8) {
      paddedBlock = Buffer.alloc(8);
      block.copy(paddedBlock);
    }

    // 创建加密器 - 每个块使用新的加密器
    const cipher = crypto.createCipheriv("des-ecb", desKey, null);
    cipher.setAutoPadding(false); // 禁用自动填充，与原C++代码保持一致

    // 加密当前块
    const encryptedBlock = Buffer.concat([cipher.update(paddedBlock), cipher.final()]);

    // 将加密后的块复制回原始缓冲区
    encryptedBlock.copy(result, i, 0, block.length);
  }

  return result;
}

/**
 * DES解密函数 - 对应C++版本的func_ddes
 * @param {Buffer} buffer - 要解密的数据
 * @param {Buffer} key - 解密密钥
 * @returns {Buffer} - 解密后的数据
 */
function desDecrypt(buffer, key) {
  // 确保密钥长度为8字节（DES要求）
  const desKey = key.slice(0, 8);
  // 创建结果缓冲区
  const result = Buffer.from(buffer);

  // 按8字节块处理数据
  for (let i = 0; i < result.length; i += 8) {
    // 提取当前块
    const block = result.slice(i, Math.min(i + 8, result.length));

    // 如果块不足8字节，需要填充
    let paddedBlock = block;
    if (block.length < 8) {
      paddedBlock = Buffer.alloc(8);
      block.copy(paddedBlock);
    }

    // 创建解密器 - 每个块使用新的解密器
    const decipher = crypto.createDecipheriv("des-ecb", desKey, null);
    decipher.setAutoPadding(false); // 禁用自动填充，与原C++代码保持一致

    // 解密当前块
    const decryptedBlock = Buffer.concat([decipher.update(paddedBlock), decipher.final()]);

    // 将解密后的块复制回原始缓冲区
    decryptedBlock.copy(result, i, 0, block.length);
  }

  return result;
}

/**
 * 歌词解码函数 - 对应C++版本的LyricDecode
 * @param {Buffer} content - 加密的歌词内容
 * @returns {Buffer} - 解码后的歌词内容
 */
function lyricDecode(content) {
  if (!Buffer.isBuffer(content)) {
    content = Buffer.from(content);
  }

  // 按照C++版本的处理顺序：先用KEY1解密，再用KEY2加密，最后用KEY3解密
  let result = desDecrypt(content, KEY1);
  result = desEncrypt(result, KEY2);
  result = desDecrypt(result, KEY3);

  // 移除尾部的空字节，与C++版本保持一致
  let length = result.length;
  while (length > 0 && result[length - 1] === 0) {
    length--;
  }

  return result.slice(0);
}

/**
 * 从文件解码QQ音乐加密歌词
 * @param {string} filePath - 加密歌词文件路径
 * @returns {string} - 解码后的歌词文本
 */
function decodeLyricFile(filePath) {
  const encryptedContent = fs.readFileSync(filePath);
  const decodedContent = lyricDecode(encryptedContent);
  return decodedContent.toString("utf-8");
}

/**
 * 从Buffer解码QQ音乐加密歌词
 * @param {Buffer} buffer - 加密歌词内容
 * @returns {string} - 解码后的歌词文本
 */
function decodeLyricBuffer(buffer) {
  const decodedContent = lyricDecode(buffer);
  return decodedContent;
}

/**
 * 从十六进制字符串解码QQ音乐加密歌词
 * @param {string} hexString - 十六进制格式的加密歌词内容
 * @returns {string} - 解码后的歌词文本
 */
function decodeLyricHex(hexString) {
  const buffer = Buffer.from(hexString, "hex");
  return decodeLyricBuffer(buffer);
}

// 导出模块函数
module.exports = {
  lyricDecode,
  decodeLyricFile,
  decodeLyricBuffer,
  decodeLyricHex,
};
console.log(decodeLyricBuffer(fs.readFileSync("LyricDecode/lyric_file/1251167.qqlyric")));
