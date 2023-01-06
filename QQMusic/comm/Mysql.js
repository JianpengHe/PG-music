"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mysql =
  exports.EMysqlFieldFlags =
  exports.EMysqlFieldType =
  exports.MysqlBuf =
  exports.SHA1 =
  exports.Buf =
  exports.ReliableSocket =
  exports.SubReadStream =
  exports.RecvStream =
  exports.TypedEventEmitter =
  exports.recvAll =
    void 0;
const crypto = require("crypto");
const events = require("events");
const net = require("net");
const stream = require("stream");
const recvAll = (stream) =>
  new Promise((resolve, reject) => {
    const body = [];
    stream.on("data", (chuck) => body.push(chuck));
    stream.once("end", () => resolve(Buffer.concat(body)));
    stream.once("error", reject);
  });
exports.recvAll = recvAll;
class TypedEventEmitter extends events.EventEmitter {}
exports.TypedEventEmitter = TypedEventEmitter;
class RecvStream {
  constructor(sourceStream) {
    /** 临时储存 */
    this.tempBuffer = [];
    /** 临时储存的字节数 */
    this.tempBufferSize = 0;
    /** 剩余未接受的字节数 */
    this.bufferRemainSize = 0;
    /** 不定长buffer的长度 */
    this.bufferLen = 0;
    /** read函数队列 */
    this.taskQueue = [];
    /** readBuffer的“同步”写法 */
    this.readBufferSync = (readSize, unshift = false) => {
      if (this.tempBuffer.length > 0) {
        this.tempBuffer[0] = Buffer.concat([...this.tempBuffer]);
        this.tempBuffer.length = 1;
      }
      if (readSize instanceof Function) {
        const index = this.tempBuffer[0].findIndex(readSize);
        if (index >= 0) {
          readSize = index;
        }
      }
      if (!(readSize instanceof Function) && this.tempBufferSize >= readSize) {
        const buffer = this.tempBuffer[0];
        this.tempBuffer[0] = buffer.subarray(readSize);
        this.tempBufferSize = this.tempBuffer[0].length;
        return buffer.subarray(0, readSize);
      }
      return new Promise((resolve) => {
        this.addNewTask(
          { type: "buffer", readSize, callback: resolve },
          unshift
        );
      });
    };
    /** 读取所有给定的字节，读完后放在buffer里。新建的任务将置于队列的【队尾】（先进先出） */
    this.readBufferAfter = (readSize, callback) => {
      this.addNewTask({ type: "buffer", readSize, callback });
      return this;
    };
    /** 读取所有给定的字节，读完后放在buffer里。新建的任务将置于【队头】，保证它是下一个执行的（可多次调用，相当于栈，后进先出）*/
    this.readBuffer = (readSize, callback) => {
      this.addNewTask({ type: "buffer", readSize, callback }, true);
      return this;
    };
    /** 建立“只读取给定的字节的”子可读流，并【立刻】返回该子读流的引用。新建的任务将置于【队尾】（先进先出） */
    this.readStreamAfter = (readSize, callback, onClose) => {
      this.addNewTask({ type: "stream", readSize, callback, onClose });
      return this;
    };
    /** 建立“只读取给定的字节的”子可读流，并【立刻】返回该子读流的引用。新建的任务将置于【队头】，保证它是下一个执行的（可多次调用，相当于栈，后进先出）*/
    this.readStream = (readSize, callback, onClose) => {
      this.addNewTask({ type: "stream", readSize, callback, onClose }, true);
      return this;
    };
    this.sourceStream = sourceStream;
    sourceStream.pause();
  }
  /** 新建task */
  newTask() {
    if (
      this.task || // 正在执行
      this.taskQueue.length === 0 || // 队列里没任务了
      !(this.task = this.taskQueue.splice(0, 1)[0]) // 取不到第一个任务
    ) {
      return;
    }
    if (this.task.type === "buffer") {
      this.bufferLen = 0;
      /** 不定长buffer至少需要读1个字节 */
      this.bufferRemainSize = Number(this.task.readSize) || 1;
      this.read();
    } else {
      /** 这边的流要先暂停，子流才能读取 */
      this.sourceStream.pause();
      /** 需要把已经读出来的内存退回去 */
      this.sourceStream.unshift(Buffer.concat(this.tempBuffer));
      /** 清空 */
      this.tempBuffer.length = 0;
      this.tempBufferSize = 0;
      this.task.callback(
        new SubReadStream(this.sourceStream, this.task.readSize, () => {
          const task = this.task;
          if (task.onClose) {
            task.onClose();
          }
          this.task = undefined;
          this.newTask();
        })
      );
    }
  }
  read() {
    /** 当前读取到的字节数没有满足开发者的需求 */
    if (this.bufferRemainSize > this.tempBufferSize) {
      if (!this.sourceStream.readableFlowing) {
        /** 别停下来 */
        this.sourceStream.resume();
      }
      this.sourceStream.once("data", (chuck) => {
        this.tempBufferSize += chuck.length;
        this.tempBuffer.push(chuck);
        this.read();
      });
      return;
    }
    /** buffer数组合并成一个大块，并且放在数组第0位 */
    if (this.tempBuffer.length > 0) {
      this.tempBuffer[0] = Buffer.concat([...this.tempBuffer]);
    }
    const buffer = this.tempBuffer[0];
    if (this.task) {
      const task = this.task;
      if (task.readSize instanceof Function) {
        /** 只遍历最后一次获取到的内存块 */
        for (const byte of this.tempBuffer[this.tempBuffer.length - 1]) {
          this.bufferLen++;
          this.bufferRemainSize++;
          if (task.readSize(byte)) {
            task.readSize = this.bufferLen;
            break;
          }
        }
        /** 清空数组，只保留合并后的第0位 */
        this.tempBuffer.length = 1;
        /** 如果还是函数，说明当前拿到的数据还没满足开发者的要求，继续read */
        if (task.readSize instanceof Function) {
          this.read();
          return;
        }
      } else {
        /** 清空数组，只保留合并后的第0位 */
        this.tempBuffer.length = 1;
      }
      task.callback(buffer.subarray(0, task.readSize));
      this.tempBufferSize -= task.readSize;
      /** 截取并去掉已交付开发者的数据块 */
      this.tempBuffer[0] = buffer.subarray(task.readSize);
      /** 清空当前任务 */
      this.task = undefined;
    }
    if (this.taskQueue.length) {
      this.newTask();
    } else {
      /** 队列里没读取任务了，先停一下 */
      this.sourceStream.pause();
    }
  }
  addNewTask(recvStreamQueue, unshift = false) {
    if (!recvStreamQueue.readSize) {
      if (recvStreamQueue.type === "buffer") {
        recvStreamQueue.callback(Buffer.alloc(0));
        return;
      }
      throw new Error("readSize 不能为0");
    }
    if (unshift) {
      this.taskQueue.unshift(recvStreamQueue);
    } else {
      this.taskQueue.push(recvStreamQueue);
    }
    this.newTask();
  }
}
exports.RecvStream = RecvStream;
class SubReadStream extends stream.Readable {
  constructor(sourceStream, needReadSize, done) {
    super();
    this.sourceStream = sourceStream;
    this.needReadSize = needReadSize;
    this.done = done || (() => {});
    this.sourceStream.pause();
  }
  _construct(callback) {
    callback(
      this.sourceStream.destroyed
        ? new TypeError("stream destroyed")
        : undefined
    );
  }
  consume() {
    while (this.tempBuffer && this.tempBuffer.length) {
      const nowRecvSize = Math.min(this.tempBuffer.length, this.needReadSize);
      this.push(this.tempBuffer.subarray(0, nowRecvSize));
      this.tempBuffer =
        nowRecvSize < this.tempBuffer.length
          ? this.tempBuffer.subarray(nowRecvSize)
          : undefined;
      this.needReadSize -= nowRecvSize;
      if (this.needReadSize <= 0) {
        this.sourceStream.unshift(this.tempBuffer);
        this.push(null);
        this.done(this);
        return true;
      }
    }
    return false;
  }
  _read(canRecvSize) {
    if (this.consume()) {
      return;
    }
    if (!this.tempBuffer || !this.tempBuffer.length) {
      this.sourceStream.resume();
      this.sourceStream.once("data", (chuck) => {
        this.tempBuffer = chuck;
        this.sourceStream.pause();
        this.consume();
      });
    } else {
      throw new Error("不科学");
    }
  }
  _destroy(err, callback) {
    callback(err);
  }
}
exports.SubReadStream = SubReadStream;
class ReliableSocket {
  constructor(options, reliableConnectOpts) {
    this.connectTimes = 0;
    this.isClose = false;
    this.callbackQueue = [];
    /** getSocket的“同步”版本，写起来更方便，但性能差一点点 */
    this.getSocketSync = () =>
      new Promise((resolve, reject) => {
        try {
          this.getSocket(resolve);
        } catch (e) {
          reject(e);
        }
      });
    this.reconnect = () => {
      const { maxRetryTimes, retryDelayTime } = this.reliableConnectOpts;
      if (maxRetryTimes === 0) {
        this.close();
        throw new Error("失败次数过多");
      }
      if (this.reliableConnectOpts.maxRetryTimes !== undefined) {
        this.reliableConnectOpts.maxRetryTimes--;
      }
      setTimeout(() => this.connect(), retryDelayTime || 0);
    };
    this.options = options;
    this.reliableConnectOpts = reliableConnectOpts || {};
    this.socket = this.connect();
  }
  /** 获取一个socket */
  getSocket(callback) {
    if (this.isClose) {
      throw new Error("ReliableSocket is closed");
    }
    this.callbackQueue.push(callback);
    this.tryCleanCallbackQueue();
  }
  tryCleanCallbackQueue() {
    if (!this.callbackQueue.length || this.isClose) {
      return;
    }
    const { readyState } = this.socket;
    if (readyState === "opening") {
      return;
    }
    if (readyState === "closed") {
      this.connect();
      return;
    }
    while (this.callbackQueue.length) {
      this.callbackQueue
        .splice(this.callbackQueue.length - 1, 1)[0]
        .call(this, this.socket);
    }
  }
  connect() {
    if (this.isClose) {
      return this.socket;
    }
    const errorListener = (e) => {
      this.reliableConnectOpts.onError && this.reliableConnectOpts.onError(e);
    };
    const connectListener = () => {
      this.reliableConnectOpts.onConnect &&
        this.reliableConnectOpts.onConnect(this.socket, ++this.connectTimes);
      this.tryCleanCallbackQueue();
      this.reliableConnectOpts.onError &&
        this.socket.once("error", this.reliableConnectOpts.onError);
    };
    this.socket = net.connect(this.options);
    this.socket.once("connect", connectListener);
    this.socket.once("error", errorListener);
    this.socket.once("close", (hadError) => {
      this.socket.removeListener("connect", connectListener);
      if (
        this.reliableConnectOpts.onClose &&
        this.reliableConnectOpts.onClose(hadError) === false
      ) {
        return;
      }
      this.reconnect();
    });
    return this.socket;
  }
  close() {
    this.isClose = true;
    this.callbackQueue.length = 0;
    if (this.socket.readyState !== "closed") {
      this.socket.end();
      return;
    }
  }
}
exports.ReliableSocket = ReliableSocket;
// </node/ReliableSocket.ts END>
// </node/Buf.ts>
class Buf {
  constructor(buf, offset) {
    this.buffer = buf ?? Buffer.allocUnsafe(0);
    this.offset = offset ?? 0;
  }
  UIntLEToBuffer(number, byteLength) {
    const buf = byteLength ? Buffer.alloc(byteLength) : Buffer.allocUnsafe(16);
    if (!number) {
      return buf.subarray(0, byteLength ?? 1).fill(number);
    }
    let index = 0;
    while (number > 0) {
      buf[index++] = number % 256;
      number = Math.floor(number / 256);
    }
    return byteLength ? buf : buf.subarray(0, index);
  }
  UIntBEToBuffer(number, byteLength) {
    const buf = byteLength ? Buffer.alloc(byteLength) : Buffer.allocUnsafe(16);
    if (!number) {
      return buf.subarray(0, byteLength ?? 1).fill(number);
    }
    let index = buf.length;
    while (number > 0) {
      buf[--index] = number % 256;
      number = Math.floor(number / 256);
    }
    return byteLength ? buf : buf.subarray(index);
  }
  alloc(length, fill) {
    const buf = Buffer.allocUnsafe(length);
    if (fill !== undefined) {
      buf.fill(fill);
    }
    return this.concat(buf);
  }
  concat(...buf) {
    this.buffer = Buffer.concat([this.buffer, ...buf]);
    return this;
  }
  read(length, offset) {
    offset = offset ?? this.offset;
    length = length < 0 ? this.buffer.length - offset : length;
    this.lastReadValue = this.buffer.subarray(offset, (offset += length));
    this.offset = Math.min(offset, this.buffer.length);
    return this.lastReadValue;
  }
  readString(length, offset) {
    offset = offset ?? this.offset;
    this.lastReadValue = String(
      this.read(length ?? this.buffer.indexOf(0, offset) - offset, offset)
    );
    if (length === undefined) {
      this.offset = Math.min(this.offset + 1, this.buffer.length);
    }
    return this.lastReadValue;
  }
  readUIntBE(byteLength, offset) {
    this.offset = offset ?? this.offset;
    if (byteLength <= 6) {
      this.lastReadValue = this.buffer.readUIntBE(this.offset, byteLength);
    } else {
      this.lastReadValue = this.buffer.readUIntBE(
        this.offset + byteLength - 6,
        6
      );
      for (let index = 6; index < byteLength; index++) {
        this.lastReadValue *= 256;
        this.lastReadValue += this.buffer[this.offset + index];
      }
    }
    this.offset += byteLength;
    return this.lastReadValue;
  }
  readUIntLE(byteLength, offset) {
    this.offset = offset ?? this.offset;
    if (byteLength <= 6) {
      this.lastReadValue = this.buffer.readUIntLE(this.offset, byteLength);
    } else {
      this.lastReadValue = this.buffer.readUIntLE(
        this.offset + byteLength - 6,
        6
      );
      for (let index = byteLength - 7; index >= 0; index--) {
        this.lastReadValue *= 256;
        this.lastReadValue += this.buffer[this.offset + index];
      }
    }
    this.offset += byteLength;
    return this.lastReadValue;
  }
  write(buf, offset) {
    offset = offset ?? this.offset;
    this.offset = offset < 0 ? this.buffer.length : offset;
    if (this.buffer.length < offset + buf.length) {
      this.alloc(offset + buf.length - this.buffer.length);
    }
    buf.forEach((byte) => {
      this.buffer[this.offset++] = byte;
    });
    return this;
  }
  writeUIntBE(number, byteLength, offset) {
    return this.write(this.UIntBEToBuffer(number, byteLength), offset);
  }
  writeUIntLE(number, byteLength, offset) {
    return this.write(this.UIntLEToBuffer(number, byteLength), offset);
  }
  writeIntLE(number, byteLength, offset) {
    const buf = byteLength ? Buffer.alloc(byteLength) : Buffer.allocUnsafe(16);
    buf.writeIntLE(number, 0, byteLength);
    return this.write(buf, offset);
  }
  writeStringNUL(str, offset) {
    return this.write(
      Buffer.concat([Buffer.from(str), this.UIntBEToBuffer(0)]),
      offset
    );
  }
  writeStringPrefix(str, prefixCallBackFn, offset) {
    const buf =
      (prefixCallBackFn && prefixCallBackFn(Buffer.byteLength(str))) ||
      undefined;
    return this.write(
      buf ? Buffer.concat([buf, Buffer.from(str)]) : Buffer.from(str),
      offset
    );
  }
}
exports.Buf = Buf;
// </node/Buf.ts END>
const SHA1 = (str) => crypto.createHash("sha1").update(str).digest();
exports.SHA1 = SHA1;
class MysqlBuf extends Buf {
  constructor(buf, offset) {
    super(buf, offset);
  }
  readIntLenenc(offset) {
    const firstByte = this.readUIntLE(1, offset);
    if (firstByte < 251) {
      return firstByte;
    }
    if (firstByte === 0xfc) {
      return this.readUIntLE(2);
    }
    if (firstByte === 0xfd) {
      return this.readUIntLE(3);
    }
    if (firstByte === 0xfe) {
      return this.readUIntLE(8);
    }
    return 0;
  }
  writeIntLenenc(number, offset) {
    if (number < 251) {
      return this.writeUIntLE(number, 1, offset);
    }
    if (number < 65536) {
      this.writeUIntLE(0xfc);
      return this.writeUIntLE(number, 2, offset);
    }
    if (number < 16777216) {
      this.writeUIntLE(0xfd);
      return this.writeUIntLE(number, 3, offset);
    }
    this.writeUIntLE(0xfe);
    return this.writeUIntLE(number, 8, offset);
  }
  writeStringLenenc(string, offset) {
    return this.writeStringPrefix(
      string,
      (len) => {
        this.writeIntLenenc(len);
        return undefined;
      },
      offset
    );
  }
}
exports.MysqlBuf = MysqlBuf;
var EMysqlFieldType;
(function (EMysqlFieldType) {
  EMysqlFieldType[(EMysqlFieldType["decimal"] = 0)] = "decimal";
  EMysqlFieldType[(EMysqlFieldType["tiny"] = 1)] = "tiny";
  EMysqlFieldType[(EMysqlFieldType["short"] = 2)] = "short";
  EMysqlFieldType[(EMysqlFieldType["long"] = 3)] = "long";
  EMysqlFieldType[(EMysqlFieldType["float"] = 4)] = "float";
  EMysqlFieldType[(EMysqlFieldType["double"] = 5)] = "double";
  EMysqlFieldType[(EMysqlFieldType["null"] = 6)] = "null";
  EMysqlFieldType[(EMysqlFieldType["timestamp"] = 7)] = "timestamp";
  EMysqlFieldType[(EMysqlFieldType["longlong"] = 8)] = "longlong";
  EMysqlFieldType[(EMysqlFieldType["int24"] = 9)] = "int24";
  EMysqlFieldType[(EMysqlFieldType["date"] = 10)] = "date";
  EMysqlFieldType[(EMysqlFieldType["time"] = 11)] = "time";
  EMysqlFieldType[(EMysqlFieldType["datetime"] = 12)] = "datetime";
  EMysqlFieldType[(EMysqlFieldType["year"] = 13)] = "year";
  EMysqlFieldType[(EMysqlFieldType["newdate"] = 14)] = "newdate";
  EMysqlFieldType[(EMysqlFieldType["varchar"] = 15)] = "varchar";
  EMysqlFieldType[(EMysqlFieldType["bit"] = 16)] = "bit";
  EMysqlFieldType[(EMysqlFieldType["newdecimal"] = 246)] = "newdecimal";
  EMysqlFieldType[(EMysqlFieldType["enum"] = 247)] = "enum";
  EMysqlFieldType[(EMysqlFieldType["set"] = 248)] = "set";
  EMysqlFieldType[(EMysqlFieldType["tiny_blob"] = 249)] = "tiny_blob";
  EMysqlFieldType[(EMysqlFieldType["medium_blob"] = 250)] = "medium_blob";
  EMysqlFieldType[(EMysqlFieldType["long_blob"] = 251)] = "long_blob";
  EMysqlFieldType[(EMysqlFieldType["blob"] = 252)] = "blob";
  EMysqlFieldType[(EMysqlFieldType["var_string"] = 253)] = "var_string";
  EMysqlFieldType[(EMysqlFieldType["string"] = 254)] = "string";
  EMysqlFieldType[(EMysqlFieldType["geometry"] = 255)] = "geometry";
})(
  (EMysqlFieldType = exports.EMysqlFieldType || (exports.EMysqlFieldType = {}))
);
var EMysqlFieldFlags;
(function (EMysqlFieldFlags) {
  EMysqlFieldFlags[(EMysqlFieldFlags["not_flags"] = 0)] = "not_flags";
  EMysqlFieldFlags[(EMysqlFieldFlags["not_null"] = 1)] = "not_null";
  EMysqlFieldFlags[(EMysqlFieldFlags["pri_key"] = 2)] = "pri_key";
  EMysqlFieldFlags[(EMysqlFieldFlags["unique_key"] = 4)] = "unique_key";
  EMysqlFieldFlags[(EMysqlFieldFlags["multiple_key"] = 8)] = "multiple_key";
  EMysqlFieldFlags[(EMysqlFieldFlags["blob"] = 16)] = "blob";
  EMysqlFieldFlags[(EMysqlFieldFlags["unsigned"] = 32)] = "unsigned";
  EMysqlFieldFlags[(EMysqlFieldFlags["zerofill"] = 64)] = "zerofill";
  EMysqlFieldFlags[(EMysqlFieldFlags["binary"] = 128)] = "binary";
  EMysqlFieldFlags[(EMysqlFieldFlags["enum"] = 256)] = "enum";
  EMysqlFieldFlags[(EMysqlFieldFlags["auto_increment"] = 512)] =
    "auto_increment";
  EMysqlFieldFlags[(EMysqlFieldFlags["timestamp"] = 1024)] = "timestamp";
  EMysqlFieldFlags[(EMysqlFieldFlags["set"] = 2048)] = "set";
})(
  (EMysqlFieldFlags =
    exports.EMysqlFieldFlags || (exports.EMysqlFieldFlags = {}))
);
class Mysql extends TypedEventEmitter {
  constructor(connect) {
    super();
    this.dbName = "";
    this.prepareMap = new Map();
    this.taskQueue = [];
    this.connected = false;
    this.noFixedLengthType = [
      "string",
      "varchar",
      "var_string",
      "enum",
      "set",
      "long_blob",
      "medium_blob",
      "blob",
      "tiny_blob",
      "geometry",
      "bit",
      "decimal",
      "newdecimal",
    ];
    this.sendLongData = (param, statement_id, param_id, sock) =>
      new Promise((resolve) => {
        const tempBufs = [];
        let tempBufsLen = 0;
        const maxSize = 15 * 1048576;
        const sendBuf = (buffer) => {
          const buf = new Buf();
          buf.writeUIntLE(buffer.length + 7, 3);
          buf.writeUIntLE(0, 1);
          buf.writeUIntLE(0x18, 1);
          buf.writeUIntLE(statement_id, 4);
          buf.writeUIntLE(param_id, 2);
          return sock.write(Buffer.concat([buf.buffer, buffer]));
        };
        param.on("data", (chuck) => {
          tempBufs.push(chuck);
          tempBufsLen += chuck.length;
          while (tempBufsLen >= maxSize) {
            tempBufsLen -= maxSize;
            const buffer = Buffer.concat(tempBufs);
            tempBufs[0] = buffer.subarray(maxSize);
            tempBufs.length = 1;
            if (!sendBuf(buffer.subarray(0, maxSize))) {
              param.pause();
              sock.once("drain", () => param.resume());
              break;
            }
          }
        });
        param.on("end", () => {
          const buffer = Buffer.concat(tempBufs);
          tempBufs.length = 0;
          sendBuf(buffer.subarray(0, maxSize));
          resolve();
        });
        param.resume();
      });
    this.format = ({ headerInfo, data }) =>
      data.map((row) =>
        headerInfo.reduce(
          (obj, header, i) => ({ ...obj, [header.name]: row[i] }),
          {}
        )
      );
    this.query = (sql, params) =>
      new Promise((resolve, reject) => {
        this.taskQueue.push({
          sql,
          params,
          callback: (err, value) => {
            if (err || !value) {
              reject(err);
              return;
            }
            resolve("data" in value ? this.format(value) : value);
          },
        });
        this.tryToConsume();
      });
    this.queryRaw = (task) => {
      this.taskQueue.push(task);
      this.tryToConsume();
      return this;
    };
    this.selectDb = (dbName) => this.query("USE", [dbName]);
    this.connectInfo = connect;
    this.reliableSocket = new ReliableSocket(
      { host: connect.host ?? "127.0.0.1", port: connect.port ?? 3306 },
      {
        onConnect: (socket) => {
          this.socket = socket;
          this.readSocket = new RecvStream(socket);
          this.login();
        },
        onClose: () => {
          this.connected = false;
          this.prepareMap.clear();
        },
      }
    );
  }
  async recv() {
    if (!this.readSocket) {
      throw new Error("not readSocket");
    }
    const headBuf = this.readSocket.readBufferSync(4);
    const head = headBuf instanceof Promise ? await headBuf : headBuf;
    const len = head.readUIntLE(0, 3);
    if (!len) {
      return [head];
    }
    const data = this.readSocket.readBufferSync(len);
    return [head, data instanceof Promise ? await data : data];
  }
  dateToString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")} ${String(
      date.getHours()
    ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(
      date.getSeconds()
    ).padStart(2, "0")}`;
  }
  async login() {
    const handshakeRawBuf = await this.recv();
    if (!handshakeRawBuf[1]) {
      throw new Error("no login info");
    }
    const handshakeBuf = new Buf(handshakeRawBuf[1]);
    const info = {
      protocol_version: handshakeBuf.readUIntLE(1),
      server_version: handshakeBuf.readString(),
      connection_id: handshakeBuf.readUIntLE(4),
      auth_plugin_data_part_1: handshakeBuf.read(8),
      capability_flag_1: handshakeBuf.readUIntLE(2, handshakeBuf.offset + 1),
      character_set: handshakeBuf.readUIntLE(1),
      status_flags: handshakeBuf.readUIntLE(2),
      capability_flags_2: handshakeBuf.readUIntLE(2),
      auth_plugin_data_len: handshakeBuf.readUIntLE(1),
      auth_plugin_data_part_2: handshakeBuf.read(
        handshakeBuf.lastReadValue - 9,
        handshakeBuf.offset + 10
      ),
      auth_plugin_name: handshakeBuf.readString(
        undefined,
        handshakeBuf.offset + 1
      ),
    };
    const loginBuf = new Buf();
    loginBuf.writeUIntLE(0, 3);
    loginBuf.writeUIntLE(handshakeRawBuf[0][3] + 1);
    const res = {
      capability_flags: 696973,
      max_packet_size: 3221225472,
      character_set: info.character_set === 45 ? "utf8mb4" : "utf8",
      username: this.connectInfo.user,
      password: this.connectInfo.password,
      database: this.connectInfo.database,
    };
    this.emit("handshake", info, res);
    loginBuf.writeUIntLE(res.capability_flags, 4);
    loginBuf.writeUIntLE(res.max_packet_size, 4);
    loginBuf.writeUIntLE(res.character_set === "utf8mb4" ? 45 : 33, 1);
    loginBuf.alloc(23, 0);
    loginBuf.writeStringNUL(res.username, loginBuf.offset + 23);
    const password_sha1 = (0, exports.SHA1)(Buffer.from(res.password));
    const password = Buffer.alloc(password_sha1.length);
    (0, exports.SHA1)(
      Buffer.concat([
        info.auth_plugin_data_part_1,
        info.auth_plugin_data_part_2,
        (0, exports.SHA1)(password_sha1),
      ])
    ).forEach((byte, i) => {
      password[i] = byte ^ password_sha1[i];
    });
    loginBuf.writeUIntLE(password.length, 1);
    loginBuf.write(password);
    loginBuf.writeStringNUL(res.database);
    loginBuf.writeStringNUL(info.auth_plugin_name);
    loginBuf.buffer.writeUIntLE(loginBuf.buffer.length - 4, 0, 3);
    if (this.socket?.readyState === "open") {
      this.socket.write(loginBuf.buffer);
      const [_, result] = await this.recv();
      if (!result || result[0] !== 0) {
        const errNo = result.readUInt16LE(1);
        const errMsg = String(result.subarray(3));
        if (!this.emit("loginError", errNo, errMsg)) {
          throw new Error(`MYSQL Login Error: ${errNo} ${errMsg}`);
        }
        return;
      }
      this.dbName = this.connectInfo.database || "";
      this.connected = true;
      this.emit("connected");
      this.tryToConsume();
      return;
    }
    this.socket?.end();
  }
  getPrepare(sql) {
    const buf = new Buf();
    buf.writeUIntLE(0x16);
    buf.writeStringPrefix(sql);
    return new Promise((resolve, reject) =>
      this.reliableSocket.getSocket(async (sock) => {
        let len = buf.buffer.length;
        let i = 0;
        let writeLen = 0;
        while (len > 0) {
          const nowWriteLen = Math.min(0xffffff, len);
          len -= nowWriteLen;
          const headBuf = Buffer.alloc(4, i);
          headBuf.writeUIntLE(nowWriteLen, 0, 3);
          sock.write(
            Buffer.concat([
              headBuf,
              buf.buffer.subarray(writeLen, (writeLen += nowWriteLen)),
            ])
          );
          i++;
        }
        if (!this.readSocket) {
          throw new Error("not readSocket");
        }
        let prepareResult = undefined;
        let revcTimes = 0;
        while (1) {
          const headBuf = this.readSocket.readBufferSync(4);
          const head = headBuf instanceof Promise ? await headBuf : headBuf;
          len = head.readUIntLE(0, 3);
          if (!len) {
            reject(new Error("pid: no len?"));
            return;
          }
          const data = this.readSocket.readBufferSync(len);
          const buffer = data instanceof Promise ? await data : data;
          if (!buffer) {
            reject(new Error("no buffer"));
            return;
          }
          if (buffer[0] === 0xff) {
            reject(new Error(String(buffer.subarray(3))));
            return;
          } else if (buffer[0] === 0) {
            const buf = new Buf(buffer, 1);
            prepareResult = {
              statementId: buf.readUIntLE(4),
              columnsNum: buf.readUIntLE(2),
              paramsNum: buf.readUIntLE(2),
              warningCount: buf.readUIntLE(2, buf.offset + 1),
            };
            revcTimes += Number(prepareResult.columnsNum > 0);
            revcTimes += Number(prepareResult.paramsNum > 0);
          }
          if (
            revcTimes === 0 ||
            /** 0xfe是结束标志 EOF: header = 0xfe and length of packet < 9 */
            (buffer[0] === 0xfe && buffer.length < 9 && --revcTimes <= 0)
          ) {
            break;
          }
        }
        if (!prepareResult) {
          reject(new Error("get pid error"));
          return;
        }
        this.emit("prepare", sql, prepareResult);
        resolve(prepareResult);
      })
    );
  }
  readValue(type, buf, initLen) {
    try {
      const typeStr = EMysqlFieldType[type];
      switch (typeStr) {
        case "string":
        case "varchar":
        case "var_string":
        case "enum":
        case "set":
        case "long_blob":
        case "medium_blob":
        case "blob":
        case "tiny_blob":
        case "geometry":
        case "bit":
        case "decimal":
        case "newdecimal":
          const len = initLen ?? buf.readIntLenenc();
          if (buf.buffer.length - buf.offset < len) {
            /** 如果已缓存的buffer太短不能满足len，就返回undefined */
            return undefined;
          }
          const buffer = buf.read(len);
          if (
            typeStr.includes("string") ||
            typeStr === "var_string" ||
            typeStr === "enum"
          ) {
            return String(buffer);
          }
          return buffer;
        case "longlong":
          return buf.readUIntLE(8);
        case "long":
        case "int24":
          return buf.readUIntLE(4);
        case "short":
        case "year":
          return buf.readUIntLE(2);
        case "tiny":
          return buf.readUIntLE(1);
        case "double":
          return buf.read(8).readDoubleLE();
        case "float":
          return buf.read(4).readFloatLE();
        case "date":
        case "datetime":
        case "timestamp":
          const date = new Date("2000-01-01 00:00:00");
          const dateBuffer = buf.read(buf.readIntLenenc());
          switch (dateBuffer.length) {
            case 0:
              return new Date("");
            case 11:
              date.setMilliseconds(dateBuffer.readFloatLE(7));
            case 7:
              date.setSeconds(dateBuffer[6]);
              date.setMinutes(dateBuffer[5]);
              date.setHours(dateBuffer[4]);
            case 4:
              date.setDate(dateBuffer[3]);
              date.setMonth(dateBuffer[2] - 1);
              date.setFullYear(dateBuffer.readInt16LE());
          }
          return this.connectInfo.convertToTimestamp ? date.getTime() : date;
        case "time":
          const timeBuffer = buf.read(buf.readIntLenenc());
          let time = 0;
          switch (timeBuffer.length) {
            case 12:
              time += timeBuffer.readFloatLE(8);
            case 8:
              time += timeBuffer[7];
              time += timeBuffer[6] * 60;
              time += timeBuffer[5] * 60 * 60;
              time += timeBuffer.readInt32LE(1);
              time *= timeBuffer[0] === 1 ? -1 : 1;
          }
          return time;
      }
      return null;
    } catch (e) {
      /** 如果已缓存的buffer太短不能满足len，会导致越界，就返回undefined */
      return undefined;
    }
  }
  async tryToConsume(times = 0) {
    if (!this.connected || this.task) {
      return;
    }
    this.task = this.taskQueue.splice(0, 1)[0];
    if (!this.task) {
      return;
    }
    if (times++ > 1000) {
      process.nextTick(() => this.tryToConsume(0));
      return;
    }
    const { sql, params, callback, onLongData } = this.task;
    const prepareMapKey = `use ${this.dbName}; ${sql}`;
    const selectDbName = sql === "USE" ? String(params[0]) : false;
    let prepare = selectDbName
      ? { statementId: 0, columnsNum: 0, paramsNum: 1, warningCount: 0 }
      : this.prepareMap.get(prepareMapKey);
    if (!prepare) {
      try {
        prepare = await this.getPrepare(sql);
      } catch (e) {
        callback(new Error(String(e?.message ?? e)));
        this.task = undefined;
        this.tryToConsume(times);
        return;
      }
      this.prepareMap.set(prepareMapKey, prepare);
    }
    if (prepare.paramsNum !== params.length) {
      callback(
        new Error(
          `入参与预处理语句的参数对不上。入参数量${params.length}，需要参数${prepare.paramsNum}，预处理语句${sql}`
        )
      );
      this.task = undefined;
      this.tryToConsume();
      return;
    }
    const buf = new Buf();
    if (selectDbName) {
      buf.writeUIntLE(2);
      buf.writeStringPrefix(selectDbName, () => undefined);
      params.length = 0;
    } else {
      buf.writeUIntLE(0x17);
      buf.writeUIntLE(prepare.statementId, 4);
      buf.writeUIntLE(0); // 0x00: CURSOR_TYPE_NO_CURSOR、0x01: CURSOR_TYPE_READ_ONLY、0x02: CURSOR_TYPE_FOR_UPDATE、0x04: CURSOR_TYPE_SCROLLABLE
      buf.writeUIntLE(1, 4);
      buf.writeUIntLE(
        Number(
          params.reduce(
            (previousValue, currentValue, index) =>
              Number(previousValue) + (currentValue === null ? 1 << index : 0),
            0
          )
        )
      );
      buf.writeUIntLE(1);
    }
    const dataBuf = new MysqlBuf();
    this.reliableSocket.getSocket(async (sock) => {
      if (!prepare) {
        this.task = undefined;
        this.tryToConsume(times);
        return;
      }
      for (let index = 0; index < params.length; index++) {
        let param = params[index];
        if (typeof param === "number") {
          let len = 1;
          while (len < 8 && 2 ** (len * 8 - 1) <= param) {
            len *= 2;
          }
          if (len <= 8) {
            buf.writeUIntLE(len === 4 ? 3 : len, 2);
            dataBuf.writeIntLE(param, len);
            continue;
          }
        } else if (typeof param === "object") {
          if (param instanceof Buffer) {
            buf.writeUIntLE(0xfb, 2);
            dataBuf.writeIntLenenc(param.length);
            dataBuf.write(param);
            continue;
          } else if (param === null) {
            buf.writeUIntLE(6, 2);
            continue;
          } else if (param instanceof Date) {
            param = this.dateToString(param);
          } else if (param instanceof stream.Readable) {
            param.pause();
            buf.writeUIntLE(0xfb, 2);
            await this.sendLongData(param, prepare.statementId, index, sock);
            continue;
          } else {
            param = JSON.stringify(param);
          }
        }
        param = String(param);
        buf.writeUIntLE(0xfd, 2);
        dataBuf.writeStringLenenc(param);
      }
      const sendBuffer = Buffer.concat([buf.buffer, dataBuf.buffer]);
      let len = sendBuffer.length;
      let i = 0;
      let writeLen = 0;
      while (len > 0) {
        const nowWriteLen = Math.min(0xffffff, len);
        len -= nowWriteLen;
        const headBuf = Buffer.alloc(4, i);
        headBuf.writeUIntLE(nowWriteLen, 0, 3);
        sock.write(
          Buffer.concat([
            headBuf,
            sendBuffer.subarray(writeLen, (writeLen += nowWriteLen)),
          ])
        );
        i++;
      }
      if (!this.readSocket) {
        throw new Error("not readSocket");
      }
      /** 需要接收的次数 */
      let revcTimes = 2;
      const headerInfo = [];
      const data = [];
      let lastBuffer;
      let recvStream;
      let recvStreamLen = 0;
      /** 第几个单元格 */
      let fieldIndex = 0;
      /** 第几条记录 */
      let recordIndex = -1;
      while (1) {
        const headBuf = this.readSocket.readBufferSync(4);
        const head = headBuf instanceof Promise ? await headBuf : headBuf;
        len = head.readUIntLE(0, 3);
        if (!len) {
          callback(new Error("no len?"));
          break;
        }
        const bufferdata = this.readSocket.readBufferSync(len);
        let buffer =
          bufferdata instanceof Promise ? await bufferdata : bufferdata;
        if (!buffer) {
          callback(new Error("no buffer"));
          break;
        }
        if (buffer[0] === 0xff) {
          callback(new Error(String(buffer.subarray(3))));
          break;
        }
        /** 无结果集 */
        if (prepare?.columnsNum === 0) {
          const buf = new MysqlBuf(buffer);
          if (selectDbName) {
            this.dbName = selectDbName;
          }
          callback(null, {
            affectedRows: buf.readIntLenenc(1),
            lastInsertId: buf.readIntLenenc(),
            statusFlags: buf.readUIntLE(2),
            warningsNumber: buf.readUIntLE(2),
            message: buf.readString(),
          });
          break;
        }
        /** 忽略第一个[Result Set Header] */
        if (buffer.length <= 2) {
          continue;
        }
        /** 结束包 */
        if (buffer[0] === 0xfe && buffer.length < 9) {
          if (--revcTimes <= 0) {
            callback(null, { headerInfo, data });
            break;
          }
        } else if (revcTimes === 2) {
          /** 读取列信息 */
          const buf = new MysqlBuf(buffer);
          const info = {
            catalog: buf.readString(buf.readIntLenenc()),
            schema: buf.readString(buf.readIntLenenc()),
            table: buf.readString(buf.readIntLenenc()),
            tableOrg: buf.readString(buf.readIntLenenc()),
            name: buf.readString(buf.readIntLenenc()),
            nameOrg: buf.readString(buf.readIntLenenc()),
            characterSet: buf.readUIntLE(2, buf.offset + 1),
            columnLength: buf.readUIntLE(4),
            type: buf.readUIntLE(1),
            noFixedLength: this.noFixedLengthType.includes(
              EMysqlFieldType[buf.lastReadValue]
            ),
            flags: buf.readUIntLE(2),
            decimals: buf.readUIntBE(1),
          };
          this.emit("headerInfo", info, sql);
          headerInfo.push(info);
          fieldIndex++;
        } else {
          /** 读取行数据 */
          const buf = new MysqlBuf(
            lastBuffer ? Buffer.concat([lastBuffer, buffer]) : buffer
          );
          lastBuffer = undefined;
          /** 如果存在可写流 */
          if (recvStreamLen && recvStream) {
            const subBuffer = buf.read(recvStreamLen);
            recvStreamLen -= subBuffer.length;
            if (!recvStream.write(subBuffer) && recvStreamLen > 0) {
              await new Promise((r) => recvStream?.once("drain", () => r(0)));
            }
            if (recvStreamLen <= 0) {
              /** 读完了，关闭可写流 */
              recvStream.end();
              recvStream = undefined;
              recvStreamLen = 0;
              /** 跳过当前单元格 */
              fieldIndex++;
            } else {
              /** 还没读完的话，等下一个MySQL包 */
              continue;
            }
          }
          if (fieldIndex === headerInfo.length) {
            /** 新的一条记录 */
            buf.offset++;
            data[++recordIndex] = [];
            /** 计算空位图 */
            /** 剩余列数 */
            let surplusHeaderLength = headerInfo.length;
            for (
              let nullMapIndex = 0;
              nullMapIndex < Math.floor((headerInfo.length + 7 + 2) / 8);
              nullMapIndex++
            ) {
              const flag = buf.readUIntLE(1);
              for (
                let i = nullMapIndex ? 0 : 2;
                i < 8 && surplusHeaderLength--;
                i++
              ) {
                data[recordIndex].push((flag >> i) & 1 ? null : undefined);
              }
            }
            /** 计算空位图END */
            fieldIndex = 0;
          }
          /** 读取剩余的单元格 */
          for (; fieldIndex < headerInfo.length; fieldIndex++) {
            /** 标记当前单元格开始的指针 */
            const { offset } = buf;
            /** 当前单元格值的长度 */
            let len;
            if (data[recordIndex][fieldIndex] !== undefined) {
              /** 如果不是undefined，说明已经有值了，或者是null */
              continue;
            }
            if (
              onLongData &&
              headerInfo[fieldIndex].noFixedLength &&
              /** 如果开发者通过onLongData回调返回可写流，这个单元格的值就流向这个可写流 */
              (recvStream =
                onLongData(
                  (len = buf.readIntLenenc()),
                  headerInfo[fieldIndex],
                  recordIndex,
                  { headerInfo, data }
                ) || undefined)
            ) {
              data[recordIndex][fieldIndex] = `[${
                EMysqlFieldType[headerInfo[fieldIndex].type]
              }] length:${len}`;
              buffer = buf.read(len);
              recvStreamLen = len - buffer.length;
              recvStream.write(buffer);
              if (recvStreamLen > 0) {
                /** 如果一个MySQL包不能满足 */
                break;
              } else {
                /** 关闭这个可写流 */
                recvStream.end();
                recvStream = undefined;
                recvStreamLen = 0;
                continue;
              }
            }
            data[recordIndex][fieldIndex] = this.readValue(
              headerInfo[fieldIndex].type,
              buf,
              len
            );
            len = undefined;
            if (data[recordIndex][fieldIndex] === undefined) {
              lastBuffer = buf.buffer.subarray(offset);
              break;
            }
          }
        }
      }
      this.task = undefined;
      this.tryToConsume(times);
    });
  }
}
exports.Mysql = Mysql;
//# sourceMappingURL=Mysql.js.map
