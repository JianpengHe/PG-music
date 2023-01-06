export declare type XMLParseTerseType = {
    [x: string]: XMLParseTerseType | string;
};
export declare type IParseRaw = {
    path: string[];
    tagName: string;
    attributes: {
        [x: string]: string;
    };
    hasChildren: boolean;
    content: string;
};
export declare const XML: {
    parseRaw(txt: string): IParseRaw[];
    parse(text: string, isArray?: ((parseRaw: IParseRaw) => boolean) | undefined): {
        [x: string]: string | any | (string | any | (string | any | (string | any | (string | any | (string | any | (string | any | (string | any | (string | any | (string | any | (string | any | (string | any | any)[])[])[])[])[])[])[])[])[])[])[];
    };
    /** 预定义实体 */
    predefinedEntities: {
        quot: string;
        amp: string;
        apos: string;
        lt: string;
        gt: string;
    };
    contentToString(text: string): string;
};
