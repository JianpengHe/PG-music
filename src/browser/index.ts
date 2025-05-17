import QQmusicSign from "../api/common/QQmusicSign";
import lyricDecoder from "../api/common/lyricDecoder";

/**
 * 获取QQ音乐数据的函数
 * @param {Array|Object} requests - 请求参数，可以是单个请求对象或请求对象数组
 * @param {Function} callback - 回调函数，用于处理返回的数据
 */
function getQQmusicData(requests: any, callback: Function): void {
  // 判断请求是否为数组
  const isArrayRequest = Array.isArray(requests);
  // 确保请求始终为数组格式
  const requestsArray = isArrayRequest ? requests : [requests];

  // 构建请求数据，将每个请求转换为req_X格式
  const requestData = JSON.stringify(
    requestsArray.reduce(
      (accumulator, currentRequest, index) => {
        accumulator[`req_${index}`] = currentRequest;
        return accumulator;
      },
      {
        // 通用请求参数
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

  // 创建唯一的JSONP回调函数名
  const callbackName = `penggeJsonp${String(Math.random()).substring(2)}`;

  // 创建JSONP脚本元素
  const jsonpScript = document.createElement("script");

  // 构建请求URL
  jsonpScript.src = `https://u.y.qq.com/cgi-bin/musics.fcg?_=${new Date().getTime()}&sign=${QQmusicSign(requestData)}&data=${requestData}&format=jsonp&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=0
    &callback=${callbackName}`;

  // 添加错误处理
  jsonpScript.onerror = () => {
    console.error("QQ音乐API请求失败");
    document.body.removeChild(jsonpScript);
    // 清理全局回调
    delete window[callbackName];
  };

  // 添加脚本到文档
  document.body.appendChild(jsonpScript);

  // 脚本加载完成后移除
  jsonpScript.onload = () => document.body.removeChild(jsonpScript);

  // 定义全局回调函数处理返回数据
  window[callbackName] = (responseData: any) => {
    try {
      // 从响应中提取各个请求的结果
      const results = requestsArray.map((_, index) => responseData[`req_${index}`]);
      // 根据原始请求类型返回数组或单个结果
      callback(isArrayRequest ? results : results[0]);
    } catch (error: unknown) {
      console.error("处理QQ音乐响应数据时出错:", error);
    } finally {
      // 清理全局回调
      delete window[callbackName];
    }
  };
}
/**
 * 使用浏览器原生API解压缩Uint8Array格式的inflate数据
 * 该函数将压缩的二进制数据转换为可读文本
 * @param {Uint8Array} compressedData - 压缩后的数据
 * @returns {Promise<string>} 解压后的文本数据
 */
async function inflateUint8Array(compressedData: Uint8Array): Promise<string> {
  try {
    // 找到有效数据的结束位置（去除尾部的0）
    let validDataEndIndex = compressedData.length - 1;
    while (compressedData[validDataEndIndex] === 0) validDataEndIndex--;

    // 创建只包含有效数据的Blob对象
    const validCompressedData = compressedData.subarray(0, validDataEndIndex + 1);
    const compressedBlob = new Blob([validCompressedData], { type: "application/octet-stream" });

    // 创建可读流并通过DecompressionStream进行解压
    const compressedReadableStream = compressedBlob.stream().pipeThrough(new DecompressionStream("deflate"));

    // 读取解压后的数据块
    const chunks: Uint8Array[] = [];
    const reader = compressedReadableStream.getReader();

    // 循环读取所有数据块
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // 将所有数据块合并并解码为文本
    const decompressedBlob = new Blob(chunks, { type: "application/octet-stream" });
    const decompressedBuffer = await decompressedBlob.arrayBuffer();
    return new TextDecoder().decode(decompressedBuffer);
  } catch (error: unknown) {
    console.error("解压数据时出错:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`解压数据失败: ${errorMessage}`);
  }
}

/**
 * 示例：获取歌曲歌词信息
 * 这是一个使用getQQmusicData函数获取歌词并解码的示例
 */
getQQmusicData(
  [
    {
      method: "GetPlayLyricInfo",
      module: "music.musichallSong.PlayLyricInfo",
      param: {
        qrc: 1, // 是否获取逐字歌词，1表示获取
        qrc_t: 0, // 逐字歌词类型
        roma: 0, // 是否获取罗马音歌词
        roma_t: 0, // 罗马音歌词类型
        //singerName: "5a+M5aOr5bGx5LiL", // Base64编码的歌手名
        songID: 260678, // 歌曲ID
        // songName: "6ZmI5aWV6L+F", // Base64编码的歌曲名
        trans: 0, // 是否获取翻译歌词
        trans_t: 0, // 翻译歌词类型
        type: 0, // 歌词类型
      },
    },
  ],
  async function ([{ data }]) {
    try {
      // 从响应中获取歌词数据
      const { lyric } = data;
      console.log("获取到加密歌词数据:", lyric);

      // 解码并解压歌词数据
      const decodedLyric = await inflateUint8Array(lyricDecoder(lyric));
      console.log("解码后的歌词内容:", decodedLyric);

      // 这里可以添加进一步处理歌词的代码
      // 例如：解析LRC格式、显示到界面等
    } catch (error: unknown) {
      console.error("处理歌词数据时出错:", error);
    }
  },
);
