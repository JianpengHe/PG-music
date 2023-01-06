"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XML = void 0;
exports.XML = {
    parseRaw(txt) {
        txt = txt.trim();
        const getTagNameRegExp = (tag) => tag.replace(/[^a-z\d]/gi, ch => "\\" + ch);
        const stack = [];
        const out = [];
        if (txt.substring(0, 5) === `<?xml`) {
            txt = txt.substring(txt.indexOf("?>", 5) + 2);
        }
        const match = (reg, autoSubstrLen = 0) => {
            const regResult = txt.match(reg);
            if (!regResult) {
                return null;
            }
            const [input, ...result] = regResult;
            txt = txt.substring(input.length + autoSubstrLen);
            return result;
        };
        while (txt) {
            /** 获取开始标签 */
            const tagName = (match(/^\s*<([^\!\"\#\$\%\&\'\(\)\*\+\,\/\;\<\=\>\?\@\[\\\]\^\`\{\|\}\~\s]+)/) || [])[0];
            if (!tagName) {
                console.log("----------");
                console.log(stack, txt);
                throw new Error("没开始标签？");
                break;
            }
            stack.push(tagName);
            /** 获取属性 */
            let attribute;
            const attributes = {};
            while ((attribute = match(/^\s*([^=\s]+?)=("[^"]*?"|'[^']*?')\s*/))) {
                Object.defineProperty(attributes, attribute[0], {
                    value: attribute[1].substring(1, attribute[1].length - 1),
                    enumerable: true,
                });
            }
            /** 自闭合 */
            if (match(/^\s*\/\>/)) {
                out.push({
                    path: [...stack],
                    tagName,
                    attributes,
                    hasChildren: false,
                    content: "",
                });
                stack.pop();
            }
            else {
                /** 非自闭合应该满足条件 */
                if (txt[0] !== ">") {
                    throw new Error("非自闭合应该满足条件");
                }
                txt = txt.substring(1);
                /** 判断<![CDATA[内容 */
                if (match(/^\s*\<\!\[CDATA\[/)) {
                    let content = "";
                    while (1) {
                        let end_CDATA = txt.indexOf("]]>");
                        if (end_CDATA < 0) {
                            throw new Error("no CDATA end");
                        }
                        /** 判断CDATA里有没有“]]>”字符，有的话要判断是不是特殊标志“]]]><![CDATA[”，若是则替换成“]” */
                        if (txt.substring(end_CDATA - 1, end_CDATA + 12) !== "]]]><![CDATA[") {
                            content += txt.substring(0, end_CDATA);
                            txt = txt.substring(end_CDATA + 3);
                            break;
                        }
                        content += txt.substring(0, end_CDATA) + "]";
                        txt = txt.substring(end_CDATA + 12);
                    }
                    if (!match(new RegExp(`^<\\/${getTagNameRegExp(tagName)}>\\s*`))) {
                        throw new Error("CDATA 没有结束标签？？？");
                    }
                    out.push({
                        path: [...stack],
                        tagName,
                        attributes,
                        hasChildren: false,
                        content,
                    });
                    stack.pop();
                }
                else {
                    /** 判断普通内容（非CDATA的content） */
                    const data = match(new RegExp(`^([^\\<]*?)\\<\\/${getTagNameRegExp(tagName)}>\\s*`));
                    if (data) {
                        out.push({
                            path: [...stack],
                            tagName,
                            attributes,
                            hasChildren: false,
                            content: data[0],
                        });
                        stack.pop();
                    }
                    else {
                        /** 有子标签的情况 */
                        out.push({
                            path: [...stack],
                            tagName,
                            attributes,
                            hasChildren: true,
                            content: "",
                        });
                        continue;
                    }
                }
            }
            /** 尝试删除栈中的结束标签 */
            while (stack.length) {
                if (match(new RegExp(`^<\\/${getTagNameRegExp(stack[stack.length - 1])}>\\s*`))) {
                    stack.pop();
                }
                else {
                    break;
                }
            }
        }
        if (stack.length || txt) {
            throw new Error("失败");
        }
        return out;
    },
    parse(text, isArray) {
        const out = {};
        const stack = [out];
        const raw = this.parseRaw(text);
        const fn = (deep, length) => {
            if (!raw[0] || raw[0].path?.length !== length) {
                return;
            }
            const obj = raw.splice(0, 1)[0];
            const pen = stack[deep];
            if (obj.hasChildren) {
                if (Array.isArray(pen[obj.tagName]) || (isArray && isArray(obj))) {
                    /** 新建新数组 */
                    stack[deep + 1] = pen[obj.tagName] = pen[obj.tagName] || [];
                    /** 往老数组追加 */
                    pen[obj.tagName].push((stack[deep + 2] = {}));
                    /** 因为数组独占一个stack位置，数组的元素也要占一个stack位置 */
                    fn(deep + 2, length + 1);
                }
                else {
                    /** 普通obj对象 */
                    pen[obj.tagName] = stack[deep + 1] = {};
                    fn(deep + 1, length + 1);
                }
            }
            else {
                pen[obj.tagName] = this.contentToString(obj.content);
            }
            fn(deep, length);
        };
        fn(0, 1);
        return out;
    },
    /** 预定义实体 */
    predefinedEntities: {
        quot: `"`,
        amp: `&`,
        apos: `'`,
        lt: `<`,
        gt: `>`,
    },
    contentToString(text) {
        return text.replace(/\&([^;]+)\;/g, (_, letter) => this.predefinedEntities[letter] || String.fromCharCode(parseInt(letter.substring(2), 16)));
    },
};
//# sourceMappingURL=XML.js.map