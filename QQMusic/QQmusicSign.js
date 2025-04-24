var crypto = require("crypto");
var https = require("https");
var fs = require("fs");

/**
 * 计算字符串的MD5哈希值
 * @param {string} str - 需要计算哈希值的字符串
 * @returns {string} - 32位小写MD5哈希值
 */
var MD5 = function (str) {
  return crypto.createHash("md5").update(str).digest("hex");
};

/**
 * QQ音乐签名生成函数
 * 用于生成QQ音乐API请求所需的签名
 * 签名用于验证请求的合法性，是QQ音乐API调用的必要参数
 */
var QQmusicSign = (function () {
  // 将base64编码的盐值解码为字节数组
  const saltBytes = Array.from(Buffer.from("FQQJGhAUGx7ULVBEw6Ojy53c/lvMT2gGEgsDAgEHBhk=", "base64"));

  /**
   * 处理MD5哈希值并生成中间签名部分
   * @param {string} md5Hash - 输入字符串的MD5哈希值
   * @returns {string} - 处理后的字符串（Base64编码后的自定义格式）
   */
  const generateMiddlePart = function (md5Hash) {
    // 使用盐值的中间部分(8-24)与MD5哈希值进行运算
    const processedBytes = saltBytes.slice(8, 24).map(function (saltByte, index) {
      // 将MD5哈希的每两个字符作为一个16进制数，然后与盐值字节进行异或运算
      const highNibble = parseInt(md5Hash[index * 2], 16) * 16;
      const lowNibble = parseInt(md5Hash[index * 2 + 1], 16);
      return highNibble ^ lowNibble ^ saltByte;
    });

    // 使用内置的Base64编码，然后转换为自定义格式
    // 1. 创建Buffer并进行Base64编码
    const base64Encoded = Buffer.from(processedBytes).toString("base64");

    // 2. 将标准Base64字符转换为自定义格式
    // - 转为小写（标准Base64包含大小写字母）
    // - 移除填充字符'='
    // - 将'+'替换为'a'
    // - 将'/'替换为'b'
    return base64Encoded.toLowerCase().replace(/=/g, "").replace(/\+/g, "a").replace(/\//g, "b");
  };

  /**
   * 生成QQ音乐API请求签名
   * @param {string} requestData - 需要签名的请求数据（通常是JSON字符串）
   * @returns {string} - 生成的签名字符串
   */
  return function (requestData) {
    // 计算输入的MD5哈希并转为小写
    const md5Hash = MD5(requestData).toLowerCase();

    // 从MD5哈希中获取字符的函数
    const getCharFromHash = function (index) {
      return md5Hash[index];
    };

    // 组合签名的四个部分：
    // 1. 固定前缀 "zzb"
    // 2. 从盐值的前8个字节映射的字符
    // 3. 中间部分（由generateMiddlePart生成）
    // 4. 从盐值的后部分映射的字符
    return ["z", "z", "b"]
      .concat(
        saltBytes.slice(0, 8).map(getCharFromHash), // 盐值前8字节映射
        generateMiddlePart(md5Hash), // 中间部分
        saltBytes.slice(24).map(getCharFromHash), // 盐值后部分映射
      )
      .join("");
  };
})();

/**
 * QQ音乐API请求函数
 * 封装了QQ音乐API的HTTP请求逻辑，支持单个或多个接口的批量请求
 *
 * @param {Object|Array} requestParams - 请求参数，可以是单个对象或对象数组
 * @param {Function} callback - 回调函数，接收API返回的数据
 * @param {boolean|string} useCookie - Cookie设置
 *   - true: 使用本地存储的Cookie文件
 *   - string: 使用提供的Cookie字符串
 *   - false/undefined: 不使用Cookie
 */
var qqMusicCookie = "";
function getQQmusicData(requestParams, callback, useCookie) {
  // 检查是否为数组请求
  const isArrayRequest = Array.isArray(requestParams);
  // 确保requestParams始终是数组形式
  const requestParamsArray = isArrayRequest ? requestParams : [requestParams];

  // 构建请求体，将多个请求合并到一个对象中
  const requestBody = JSON.stringify(
    requestParamsArray.reduce(
      function (accumulator, currentRequest, index) {
        // 每个请求以"req_索引"为键
        accumulator["req_" + index] = currentRequest;
        return accumulator;
      },
      {
        // 通用参数
        comm: {
          format: "json",
          inCharset: "utf-8",
          outCharset: "utf-8",
          notice: 0,
          platform: "yqq.json",
          needNewCode: 1,
          uin: "1",
        },
      },
    ),
  );

  // 构建请求URL，添加时间戳和签名
  const requestUrl =
    "https://u.y.qq.com/cgi-bin/musics.fcg?_=" + new Date().getTime() + "&sign=" + QQmusicSign(requestBody);

  // 发起HTTPS请求
  https
    .request(
      requestUrl,
      {
        method: "POST",
        headers: {
          host: "u.y.qq.com",
          Accept: "*/*",
          "Accept-Language": "zh-CN",
          "User-Agent": "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)",
          // Cookie处理逻辑
          Cookie:
            useCookie === true
              ? qqMusicCookie ||
                (qqMusicCookie = String(fs.readFileSync(__dirname + "/secret/qqMusicCookie.secret")).trim())
              : useCookie || "",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
      function (response) {
        // 用于收集响应数据的数组
        const responseChunks = [];

        // 接收数据块
        response.on("data", function (chunk) {
          responseChunks.push(chunk);
        });

        // 数据接收完成后的处理
        response.on("end", function () {
          // 解析JSON响应
          const responseData = JSON.parse(String(Buffer.concat(responseChunks)));

          // 提取各个请求的响应结果
          const results = requestParamsArray.map(function (_, index) {
            return responseData["req_" + index];
          });

          // 调用回调函数，如果原请求不是数组，则只返回第一个结果
          callback(isArrayRequest ? results : results[0]);
        });
      },
    )
    .end(requestBody);
}

/** 使用例子(支持数组。部分接口，如搜索，需要登录，暂时无解) */
// getQQmusicData(
//   [
//     {
//       module: "vkey.GetVkeyServer",
//       method: "CgiGetVkey",
//       param: {
//         guid: "1",
//         songmid: ["003aAPj81VWrbL"],
//         filename: ["C4000032PB2V2QYWSC.m4a", "M8000032PB2V2QYWSC.mp3"],
//         songtype: [0],
//         uin: "1",
//         loginflag: 1,
//         platform: "20",
//       },
//     },
//     {
//       method: "GetPlayLyricInfo",
//       module: "music.musichallSong.PlayLyricInfo",
//       param: {
//         qrc: 1,
//         qrc_t: 0,
//         roma: 0,
//         roma_t: 0,
//         //singerName: "5a+M5aOr5bGx5LiL",
//         songID: 260678,
//         // songName: "6ZmI5aWV6L+F",
//         trans: 0,
//         trans_t: 0,
//         type: 0,
//       },
//     },
//   ],
//   function (d) {
//     console.log(d);
//   }
// );

module.exports = { QQmusicSign, getQQmusicData };
