// src/patterns.ts
var boldPattern = /(\*\*)([^*]*\*?)$/;
var italicPattern = /(__)([^_]*?)$/;
var boldItalicPattern = /(\*\*\*)([^*]*?)$/;
var singleAsteriskPattern = /(\*)([^*]*?)$/;
var singleUnderscorePattern = /(_)([^_]*?)$/;
var inlineCodePattern = /(`)([^`]*?)$/;
var strikethroughPattern = /(~~)([^~]*?)$/;
var whitespaceOrMarkersPattern = /^[\s_~*`]*$/;
var listItemPattern = /^[\s]*[-*+][\s]+$/;
var letterNumberUnderscorePattern = /[\p{L}\p{N}_]/u;
var inlineTripleBacktickPattern = /^```[^`\n]*```?$/;
var fourOrMoreAsterisksPattern = /^\*{4,}$/;
var halfCompleteUnderscorePattern = /(__)([^_]+)_$/;
var halfCompleteTildePattern = /(~~)([^~]+)~$/;
var doubleTildeGlobalPattern = /~~/g;

// src/utils.ts
var isWordChar = (char) => {
  if (!char) {
    return false;
  }
  const code = char.charCodeAt(0);
  if (code >= 48 && code <= 57 || // 0-9
  code >= 65 && code <= 90 || // A-Z
  code >= 97 && code <= 122 || // a-z
  code === 95) {
    return true;
  }
  return letterNumberUnderscorePattern.test(char);
};
var isWithinCodeBlock = (text, position) => {
  let inCodeBlock = false;
  for (let i = 0; i < position; i += 1) {
    if (text[i] === "`" && text[i + 1] === "`" && text[i + 2] === "`") {
      inCodeBlock = !inCodeBlock;
      i += 2;
    }
  }
  return inCodeBlock;
};
var findMatchingOpeningBracket = (text, closeIndex) => {
  let depth = 1;
  for (let i = closeIndex - 1; i >= 0; i -= 1) {
    if (text[i] === "]") {
      depth += 1;
    } else if (text[i] === "[") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
};
var findMatchingClosingBracket = (text, openIndex) => {
  let depth = 1;
  for (let i = openIndex + 1; i < text.length; i += 1) {
    if (text[i] === "[") {
      depth += 1;
    } else if (text[i] === "]") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
};
var isWithinMathBlock = (text, position) => {
  let inInlineMath = false;
  let inBlockMath = false;
  for (let i = 0; i < text.length && i < position; i += 1) {
    if (text[i] === "\\" && text[i + 1] === "$") {
      i += 1;
      continue;
    }
    if (text[i] === "$") {
      if (text[i + 1] === "$") {
        inBlockMath = !inBlockMath;
        i += 1;
        inInlineMath = false;
      } else if (!inBlockMath) {
        inInlineMath = !inInlineMath;
      }
    }
  }
  return inInlineMath || inBlockMath;
};
var isBeforeClosingParen = (text, position) => {
  for (let j = position; j < text.length; j += 1) {
    if (text[j] === ")") {
      return true;
    }
    if (text[j] === "\n") {
      return false;
    }
  }
  return false;
};
var isWithinLinkOrImageUrl = (text, position) => {
  for (let i = position - 1; i >= 0; i -= 1) {
    if (text[i] === ")") {
      return false;
    }
    if (text[i] === "(") {
      if (i > 0 && text[i - 1] === "]") {
        return isBeforeClosingParen(text, position);
      }
      return false;
    }
    if (text[i] === "\n") {
      return false;
    }
  }
  return false;
};
var isWithinHtmlTag = (text, position) => {
  for (let i = position - 1; i >= 0; i -= 1) {
    if (text[i] === ">") {
      return false;
    }
    if (text[i] === "<") {
      const nextChar = i + 1 < text.length ? text[i + 1] : "";
      if (nextChar >= "a" && nextChar <= "z" || nextChar >= "A" && nextChar <= "Z" || nextChar === "/") {
        return true;
      }
      return false;
    }
    if (text[i] === "\n") {
      return false;
    }
  }
  return false;
};
var isHorizontalRule = (text, markerIndex, marker) => {
  let lineStart = 0;
  for (let i = markerIndex - 1; i >= 0; i -= 1) {
    if (text[i] === "\n") {
      lineStart = i + 1;
      break;
    }
  }
  let lineEnd = text.length;
  for (let i = markerIndex; i < text.length; i += 1) {
    if (text[i] === "\n") {
      lineEnd = i;
      break;
    }
  }
  const line = text.substring(lineStart, lineEnd);
  let markerCount = 0;
  let hasNonWhitespaceNonMarker = false;
  for (const char of line) {
    if (char === marker) {
      markerCount += 1;
    } else if (char !== " " && char !== "	") {
      hasNonWhitespaceNonMarker = true;
      break;
    }
  }
  return markerCount >= 3 && !hasNonWhitespaceNonMarker;
};

export {
  boldPattern,
  italicPattern,
  boldItalicPattern,
  singleAsteriskPattern,
  singleUnderscorePattern,
  inlineCodePattern,
  strikethroughPattern,
  whitespaceOrMarkersPattern,
  listItemPattern,
  inlineTripleBacktickPattern,
  fourOrMoreAsterisksPattern,
  halfCompleteUnderscorePattern,
  halfCompleteTildePattern,
  doubleTildeGlobalPattern,
  isWordChar,
  isWithinCodeBlock,
  findMatchingOpeningBracket,
  findMatchingClosingBracket,
  isWithinMathBlock,
  isWithinLinkOrImageUrl,
  isWithinHtmlTag,
  isHorizontalRule
};
