/// <reference types="node" />
import * as events from "events";
import * as net from "net";
import * as stream from "stream";
export declare type IReadStream = stream.Readable | stream.Duplex;
export declare const recvAll: (stream: IReadStream) => Promise<Buffer>;
declare type EmittedEvents = Record<string | symbol, (...args: any) => any>;
export declare interface TypedEventEmitter<Events extends EmittedEvents> {
    addListener<E extends keyof Events>(event: E, listener: Events[E]): this;
    emit<E extends keyof Events>(event: E, ...args: Parameters<Events[E]>): boolean;
    eventNames<E extends keyof Events>(): E[];
    listenerCount<E extends keyof Events>(eventName: E): number;
    listeners<E extends keyof Events>(eventName: E): Events[E][];
    off<E extends keyof Events>(event: E, listener: Events[E]): this;
    on<E extends keyof Events>(event: E, listener: Events[E]): this;
    once<E extends keyof Events>(event: E, listener: Events[E]): this;
    prependListener<E extends keyof Events>(event: E, listener: Events[E]): this;
    prependOnceListener<E extends keyof Events>(event: E, listener: Events[E]): this;
    removeAllListeners<E extends keyof Events>(eventName?: E): this;
    removeListener<E extends keyof Events>(event: E, listener: Events[E]): this;
    rawListeners<E extends keyof Events>(eventName: E): Events[E][];
}
export declare class TypedEventEmitter<Events extends EmittedEvents> extends events.EventEmitter {
}
export declare type IRecvStreamReadBuffer = (readSize: number | ((byte: number) => boolean), callback: (buffer: Buffer) => void) => void;
export declare type IRecvStreamReadStream = (readSize: number, callback: (stream: SubReadStream) => void, onClose?: () => void) => void;
export declare class RecvStream {
    /** 源可读流 */
    sourceStream: IReadStream;
    /** 临时储存 */
    private tempBuffer;
    /** 临时储存的字节数 */
    private tempBufferSize;
    /** 剩余未接受的字节数 */
    private bufferRemainSize;
    /** 不定长buffer的长度 */
    private bufferLen;
    /** read函数队列 */
    private taskQueue;
    /** 当前正在处理的任务 */
    private task?;
    /** 新建task */
    private newTask;
    private read;
    constructor(sourceStream: IReadStream);
    /** readBuffer的“同步”写法 */
    readBufferSync: (readSize: number | ((byte: number) => boolean), unshift?: boolean) => Promise<Buffer> | Buffer;
    /** 读取所有给定的字节，读完后放在buffer里。新建的任务将置于队列的【队尾】（先进先出） */
    readBufferAfter: IRecvStreamReadBuffer;
    /** 读取所有给定的字节，读完后放在buffer里。新建的任务将置于【队头】，保证它是下一个执行的（可多次调用，相当于栈，后进先出）*/
    readBuffer: IRecvStreamReadBuffer;
    /** 建立“只读取给定的字节的”子可读流，并【立刻】返回该子读流的引用。新建的任务将置于【队尾】（先进先出） */
    readStreamAfter: IRecvStreamReadStream;
    /** 建立“只读取给定的字节的”子可读流，并【立刻】返回该子读流的引用。新建的任务将置于【队头】，保证它是下一个执行的（可多次调用，相当于栈，后进先出）*/
    readStream: IRecvStreamReadStream;
    private addNewTask;
}
export declare class SubReadStream extends stream.Readable {
    sourceStream: IReadStream;
    needReadSize: number;
    private tempBuffer?;
    done: (subReadStream: SubReadStream) => void;
    constructor(sourceStream: IReadStream, needReadSize: number, done?: (subReadStream: SubReadStream) => void);
    _construct(callback: (err: TypeError | undefined) => void): void;
    consume(): boolean;
    _read(canRecvSize: number): void;
    _destroy(err: any, callback: any): void;
}
export declare type IReliableConnectOpts = {
    retryDelayTime?: number;
    maxRetryTimes?: number;
    onConnect?: (socket: net.Socket, connectTimes: number) => void;
    onError?: (e: any) => void;
    onClose?: (hadError: boolean) => void | false;
};
export declare type IReliableConnectCallback = (socket: net.Socket) => void;
export declare class ReliableSocket {
    private options;
    private reliableConnectOpts;
    private socket;
    private connectTimes;
    isClose: boolean;
    private callbackQueue;
    /** 获取一个socket */
    getSocket(callback: IReliableConnectCallback): void;
    /** getSocket的“同步”版本，写起来更方便，但性能差一点点 */
    getSocketSync: () => Promise<net.Socket>;
    private tryCleanCallbackQueue;
    private reconnect;
    private connect;
    constructor(options: net.NetConnectOpts, reliableConnectOpts?: IReliableConnectOpts);
    close(): void;
}
export declare class Buf {
    lastReadValue: any;
    offset: number;
    buffer: Buffer;
    constructor(buf?: Buffer, offset?: number);
    UIntLEToBuffer(number: number, byteLength?: number): Buffer;
    UIntBEToBuffer(number: number, byteLength?: number): Buffer;
    alloc(length: number, fill?: number): this;
    concat(...buf: Buffer[]): this;
    read(length: number, offset?: number): Buffer;
    readString(length?: number, offset?: number): string;
    readUIntBE(byteLength: number, offset?: number): number;
    readUIntLE(byteLength: number, offset?: number): number;
    write(buf: Buffer, offset?: number): this;
    writeUIntBE(number: number, byteLength?: number, offset?: number): this;
    writeUIntLE(number: number, byteLength?: number, offset?: number): this;
    writeIntLE(number: number, byteLength: number, offset?: number): this;
    writeStringNUL(str: string | Buffer, offset?: number): this;
    writeStringPrefix(str: string | Buffer, prefixCallBackFn?: (length: number) => Buffer | undefined, offset?: number): this;
}
export declare const SHA1: (str: Buffer) => Buffer;
export declare class MysqlBuf extends Buf {
    constructor(buf?: Buffer, offset?: number);
    readIntLenenc(offset?: number): number;
    writeIntLenenc(number: number, offset?: number): this;
    writeStringLenenc(string: string, offset?: number): this;
}
export declare enum EMysqlFieldType {
    decimal = 0,
    tiny = 1,
    short = 2,
    long = 3,
    float = 4,
    double = 5,
    null = 6,
    timestamp = 7,
    longlong = 8,
    int24 = 9,
    date = 10,
    time = 11,
    datetime = 12,
    year = 13,
    newdate = 14,
    varchar = 15,
    bit = 16,
    newdecimal = 246,
    enum = 247,
    set = 248,
    tiny_blob = 249,
    medium_blob = 250,
    long_blob = 251,
    blob = 252,
    var_string = 253,
    string = 254,
    geometry = 255
}
export declare enum EMysqlFieldFlags {
    not_flags = 0,
    not_null = 1,
    pri_key = 2,
    unique_key = 4,
    multiple_key = 8,
    blob = 16,
    unsigned = 32,
    zerofill = 64,
    binary = 128,
    enum = 256,
    auto_increment = 512,
    timestamp = 1024,
    set = 2048
}
export declare type IMysqlConnect = {
    /** 数据库IP/域名 */
    host: string;
    /** 数据库端口 */
    port: number;
    /** 数据库用户 */
    user: string;
    /** 数据库密码 */
    password: string;
    /** 登录时选择的数据库 */
    database: string;
    /** 字符集 */
    character?: "utf8" | "utf8mb4";
    /** 输出是否转换成时间戳 */
    convertToTimestamp?: boolean;
};
export declare type IMysqlHandshake = {
    /** 服务器协议版本号 */
    protocol_version: number;
    /** 服务器版本信息 */
    server_version: string;
    /** 服务器线程ID */
    connection_id: number;
    /** 挑战随机数 */
    auth_plugin_data_part_1: Buffer;
    /** 服务器权能标志 */
    capability_flag_1: number;
    /** 字符编码 */
    character_set: number;
    /** 服务器状态 */
    status_flags: number;
    /** 挑战随机数2 */
    capability_flags_2: number;
    auth_plugin_data_len: number;
    auth_plugin_data_part_2: Buffer;
    auth_plugin_name: string;
};
export declare type IMysqlHandshakeRes = {
    /** 客户端权能标志 */
    capability_flags: number;
    /** 最大消息长度 */
    max_packet_size: number;
    /** 字符编码 */
    character_set: "utf8" | "utf8mb4";
    /** 用户名 */
    username: string;
    /** 挑战认证数据 */
    password: string;
    /** 数据库名称 */
    database: string;
};
export declare type IMysqlFieldHeader = {
    /** 目录名称 */
    catalog: string;
    /** 数据库名称 */
    schema: string;
    /** 数据表名称 */
    table: string;
    /** 数据表原始名称 */
    tableOrg: string;
    /** 列（字段）名称 */
    name: string;
    /** 列（字段）原始名称 */
    nameOrg: string;
    /** 字符编码 */
    characterSet: number;
    /** 列（字段）长度 */
    columnLength: number;
    /** 列（字段）类型 */
    type: EMysqlFieldType;
    /** 列（字段）标志 */
    flags: EMysqlFieldFlags;
    /** 整型值精度 */
    decimals: number;
    /** 是否是固定长度 */
    noFixedLength?: boolean;
};
export declare type IMysqlValue = number | string | Date | Buffer | null | undefined;
export declare type IMysqlResult = {
    /** 受影响行数 */
    affectedRows: number;
    /** 索引ID值 */
    lastInsertId: number;
    /** 服务器状态 */
    statusFlags: number;
    /** 告警计数 */
    warningsNumber: number;
    /** 服务器消息 */
    message: string;
};
export declare type IMysqlResultset = {
    headerInfo: IMysqlFieldHeader[];
    data: IMysqlValue[][];
};
export declare type IMysqlPrepareResult = {
    /** 预处理语句的ID值 */
    statementId: number;
    /** 所需字段数量 */
    columnsNum: number;
    /** 参数数量 */
    paramsNum: number;
    /** 警告数量 */
    warningCount: number;
};
export declare type IMysqltask = {
    sql: string;
    params: (IMysqlValue | stream.Readable)[];
    /** 遇到不确定长度的“长数据”单元格时触发onLongData回调，开发者可以视情况返回可写流，这个单元格的值就流向这个可写流，不返回任何东西就缓存下来 */
    onLongData?: (len: number, columnInfo: IMysqlFieldHeader, index: number, receivedDataNow: IMysqlResultset) => stream.Writable | void;
    callback: (err: Error | null, value?: IMysqlResult | IMysqlResultset) => void;
};
export declare type IMysqlEvents = {
    handshake: (handshake: IMysqlHandshake, handshakeRes: IMysqlHandshakeRes) => void;
    loginError: (errNo: number, errMsg: string) => void;
    connected: () => void;
    prepare: (sql: string, prepareResult: IMysqlPrepareResult) => void;
    headerInfo: (headerInfo: IMysqlFieldHeader, sql: string) => void;
};
export declare class Mysql extends TypedEventEmitter<IMysqlEvents> {
    reliableSocket: ReliableSocket;
    readSocket?: RecvStream;
    dbName: string;
    private socket?;
    private connectInfo;
    private prepareMap;
    private task?;
    private taskQueue;
    private connected;
    private noFixedLengthType;
    constructor(connect: IMysqlConnect);
    private recv;
    private dateToString;
    private login;
    private getPrepare;
    private readValue;
    private tryToConsume;
    private sendLongData;
    format: (source: IMysqlResultset) => {
        [x: string]: IMysqlValue;
    }[];
    query: (sql: string, params: IMysqlValue[]) => Promise<IMysqlResult | {
        [x: string]: IMysqlValue;
    }[]>;
    queryRaw: (task: IMysqltask) => this;
    selectDb: (dbName: string) => Promise<IMysqlResult>;
}
export {};
