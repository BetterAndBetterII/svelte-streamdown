export declare const isWordChar: (char: string) => boolean;
export declare const isWithinCodeBlock: (text: string, position: number) => boolean;
export declare const findMatchingOpeningBracket: (text: string, closeIndex: number) => number;
export declare const findMatchingClosingBracket: (text: string, openIndex: number) => number;
export declare const isWithinMathBlock: (text: string, position: number) => boolean;
export declare const isWithinLinkOrImageUrl: (text: string, position: number) => boolean;
export declare const isWithinHtmlTag: (text: string, position: number) => boolean;
export declare const isHorizontalRule: (text: string, markerIndex: number, marker: string) => boolean;
