declare const isWordChar: (char: string) => boolean;
declare const isWithinCodeBlock: (text: string, position: number) => boolean;
declare const findMatchingOpeningBracket: (text: string, closeIndex: number) => number;
declare const findMatchingClosingBracket: (text: string, openIndex: number) => number;
declare const isWithinMathBlock: (text: string, position: number) => boolean;
declare const isWithinLinkOrImageUrl: (text: string, position: number) => boolean;
declare const isWithinHtmlTag: (text: string, position: number) => boolean;
declare const isHorizontalRule: (text: string, markerIndex: number, marker: string) => boolean;

export { findMatchingClosingBracket, findMatchingOpeningBracket, isHorizontalRule, isWithinCodeBlock, isWithinHtmlTag, isWithinLinkOrImageUrl, isWithinMathBlock, isWordChar };
