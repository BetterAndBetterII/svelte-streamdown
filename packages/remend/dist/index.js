import {
  boldItalicPattern,
  boldPattern,
  doubleTildeGlobalPattern,
  findMatchingClosingBracket,
  findMatchingOpeningBracket,
  fourOrMoreAsterisksPattern,
  halfCompleteTildePattern,
  halfCompleteUnderscorePattern,
  inlineCodePattern,
  inlineTripleBacktickPattern,
  isHorizontalRule,
  isWithinCodeBlock,
  isWithinHtmlTag,
  isWithinLinkOrImageUrl,
  isWithinMathBlock,
  isWordChar,
  italicPattern,
  listItemPattern,
  singleAsteriskPattern,
  singleUnderscorePattern,
  strikethroughPattern,
  whitespaceOrMarkersPattern
} from "./chunk-IFGMKX45.js";

// src/code-block-utils.ts
var isInsideCodeBlock = (text, position) => {
  let inInlineCode = false;
  let inMultilineCode = false;
  for (let i = 0; i < position; i += 1) {
    if (text[i] === "\\" && i + 1 < text.length && text[i + 1] === "`") {
      i += 1;
      continue;
    }
    if (text.substring(i, i + 3) === "```") {
      inMultilineCode = !inMultilineCode;
      i += 2;
      continue;
    }
    if (!inMultilineCode && text[i] === "`") {
      inInlineCode = !inInlineCode;
    }
  }
  return inInlineCode || inMultilineCode;
};
var isPartOfTripleBacktick = (text, i) => {
  const isTripleStart = text.substring(i, i + 3) === "```";
  const isTripleMiddle = i > 0 && text.substring(i - 1, i + 2) === "```";
  const isTripleEnd = i > 1 && text.substring(i - 2, i + 1) === "```";
  return isTripleStart || isTripleMiddle || isTripleEnd;
};
var countSingleBackticks = (text) => {
  let count = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\\" && i + 1 < text.length && text[i + 1] === "`") {
      i += 1;
      continue;
    }
    if (text[i] === "`" && !isPartOfTripleBacktick(text, i)) {
      count += 1;
    }
  }
  return count;
};
var isWithinCompleteInlineCode = (text, position) => {
  let inInlineCode = false;
  let inMultilineCode = false;
  let inlineCodeStart = -1;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\\" && i + 1 < text.length && text[i + 1] === "`") {
      i += 1;
      continue;
    }
    if (text.substring(i, i + 3) === "```") {
      inMultilineCode = !inMultilineCode;
      i += 2;
      continue;
    }
    if (!inMultilineCode && text[i] === "`") {
      if (inInlineCode) {
        if (inlineCodeStart < position && position < i) {
          return true;
        }
        inInlineCode = false;
        inlineCodeStart = -1;
      } else {
        inInlineCode = true;
        inlineCodeStart = i;
      }
    }
  }
  return false;
};

// src/comparison-operator-handler.ts
var LIST_COMPARISON_PATTERN = /^(\s*(?:[-*+]|\d+[.)]) +)>(=?\s*[$]?\d)/gm;
var handleComparisonOperators = (text) => {
  if (!text || typeof text !== "string") {
    return text;
  }
  if (!text.includes(">")) {
    return text;
  }
  return text.replace(
    LIST_COMPARISON_PATTERN,
    (match, prefix, suffix, offset) => {
      if (isInsideCodeBlock(text, offset)) {
        return match;
      }
      return `${prefix}\\>${suffix}`;
    }
  );
};

// src/emphasis-handlers.ts
var shouldSkipAsterisk = (text, index, prevChar, nextChar) => {
  if (prevChar === "\\") {
    return true;
  }
  const hasMathBlocks = text.includes("$");
  if (hasMathBlocks && isWithinMathBlock(text, index)) {
    return true;
  }
  if (prevChar !== "*" && nextChar === "*") {
    const nextNextChar = index < text.length - 2 ? text[index + 2] : "";
    if (nextNextChar === "*") {
      return false;
    }
    return true;
  }
  if (prevChar === "*") {
    return true;
  }
  if (prevChar && nextChar && isWordChar(prevChar) && isWordChar(nextChar)) {
    return true;
  }
  const prevIsWhitespace = !prevChar || prevChar === " " || prevChar === "	" || prevChar === "\n";
  const nextIsWhitespace = !nextChar || nextChar === " " || nextChar === "	" || nextChar === "\n";
  if (prevIsWhitespace && nextIsWhitespace) {
    return true;
  }
  return false;
};
var countSingleAsterisks = (text) => {
  let count = 0;
  let inCodeBlock = false;
  const len = text.length;
  for (let index = 0; index < len; index += 1) {
    if (text[index] === "`" && index + 2 < len && text[index + 1] === "`" && text[index + 2] === "`") {
      inCodeBlock = !inCodeBlock;
      index += 2;
      continue;
    }
    if (inCodeBlock) {
      continue;
    }
    if (text[index] !== "*") {
      continue;
    }
    const prevChar = index > 0 ? text[index - 1] : "";
    const nextChar = index < len - 1 ? text[index + 1] : "";
    if (!shouldSkipAsterisk(text, index, prevChar, nextChar)) {
      count += 1;
    }
  }
  return count;
};
var shouldSkipUnderscore = (text, index, prevChar, nextChar) => {
  if (prevChar === "\\") {
    return true;
  }
  const hasMathBlocks = text.includes("$");
  if (hasMathBlocks && isWithinMathBlock(text, index)) {
    return true;
  }
  if (isWithinLinkOrImageUrl(text, index)) {
    return true;
  }
  if (isWithinHtmlTag(text, index)) {
    return true;
  }
  if (prevChar === "_" || nextChar === "_") {
    return true;
  }
  if (prevChar && nextChar && isWordChar(prevChar) && isWordChar(nextChar)) {
    return true;
  }
  return false;
};
var countSingleUnderscores = (text) => {
  let count = 0;
  let inCodeBlock = false;
  const len = text.length;
  for (let index = 0; index < len; index += 1) {
    if (text[index] === "`" && index + 2 < len && text[index + 1] === "`" && text[index + 2] === "`") {
      inCodeBlock = !inCodeBlock;
      index += 2;
      continue;
    }
    if (inCodeBlock) {
      continue;
    }
    if (text[index] !== "_") {
      continue;
    }
    const prevChar = index > 0 ? text[index - 1] : "";
    const nextChar = index < len - 1 ? text[index + 1] : "";
    if (!shouldSkipUnderscore(text, index, prevChar, nextChar)) {
      count += 1;
    }
  }
  return count;
};
var countTripleAsterisks = (text) => {
  let count = 0;
  let consecutiveAsterisks = 0;
  let inCodeBlock = false;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "`" && i + 2 < text.length && text[i + 1] === "`" && text[i + 2] === "`") {
      if (consecutiveAsterisks >= 3) {
        count += Math.floor(consecutiveAsterisks / 3);
      }
      consecutiveAsterisks = 0;
      inCodeBlock = !inCodeBlock;
      i += 2;
      continue;
    }
    if (inCodeBlock) {
      continue;
    }
    if (text[i] === "*") {
      consecutiveAsterisks += 1;
    } else {
      if (consecutiveAsterisks >= 3) {
        count += Math.floor(consecutiveAsterisks / 3);
      }
      consecutiveAsterisks = 0;
    }
  }
  if (consecutiveAsterisks >= 3) {
    count += Math.floor(consecutiveAsterisks / 3);
  }
  return count;
};
var countDoubleAsterisksOutsideCodeBlocks = (text) => {
  let count = 0;
  let inCodeBlock = false;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "`" && i + 2 < text.length && text[i + 1] === "`" && text[i + 2] === "`") {
      inCodeBlock = !inCodeBlock;
      i += 2;
      continue;
    }
    if (inCodeBlock) {
      continue;
    }
    if (text[i] === "*" && i + 1 < text.length && text[i + 1] === "*") {
      count += 1;
      i += 1;
    }
  }
  return count;
};
var countDoubleUnderscoresOutsideCodeBlocks = (text) => {
  let count = 0;
  let inCodeBlock = false;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "`" && i + 2 < text.length && text[i + 1] === "`" && text[i + 2] === "`") {
      inCodeBlock = !inCodeBlock;
      i += 2;
      continue;
    }
    if (inCodeBlock) {
      continue;
    }
    if (text[i] === "_" && i + 1 < text.length && text[i + 1] === "_") {
      count += 1;
      i += 1;
    }
  }
  return count;
};
var shouldSkipBoldCompletion = (text, contentAfterMarker, markerIndex) => {
  if (!contentAfterMarker || whitespaceOrMarkersPattern.test(contentAfterMarker)) {
    return true;
  }
  const beforeMarker = text.substring(0, markerIndex);
  const lastNewlineBeforeMarker = beforeMarker.lastIndexOf("\n");
  const lineStart = lastNewlineBeforeMarker === -1 ? 0 : lastNewlineBeforeMarker + 1;
  const lineBeforeMarker = text.substring(lineStart, markerIndex);
  if (listItemPattern.test(lineBeforeMarker)) {
    const hasNewlineInContent = contentAfterMarker.includes("\n");
    if (hasNewlineInContent) {
      return true;
    }
  }
  return isHorizontalRule(text, markerIndex, "*");
};
var handleIncompleteBold = (text) => {
  const boldMatch = text.match(boldPattern);
  if (!boldMatch) {
    return text;
  }
  const contentAfterMarker = boldMatch[2];
  const markerIndex = text.lastIndexOf(boldMatch[1]);
  if (isInsideCodeBlock(text, markerIndex) || isWithinCompleteInlineCode(text, markerIndex)) {
    return text;
  }
  if (shouldSkipBoldCompletion(text, contentAfterMarker, markerIndex)) {
    return text;
  }
  const asteriskPairs = countDoubleAsterisksOutsideCodeBlocks(text);
  if (asteriskPairs % 2 === 1) {
    if (contentAfterMarker.endsWith("*")) {
      return `${text}*`;
    }
    return `${text}**`;
  }
  return text;
};
var shouldSkipItalicCompletion = (text, contentAfterMarker, markerIndex) => {
  if (!contentAfterMarker || whitespaceOrMarkersPattern.test(contentAfterMarker)) {
    return true;
  }
  const beforeMarker = text.substring(0, markerIndex);
  const lastNewlineBeforeMarker = beforeMarker.lastIndexOf("\n");
  const lineStart = lastNewlineBeforeMarker === -1 ? 0 : lastNewlineBeforeMarker + 1;
  const lineBeforeMarker = text.substring(lineStart, markerIndex);
  if (listItemPattern.test(lineBeforeMarker)) {
    const hasNewlineInContent = contentAfterMarker.includes("\n");
    if (hasNewlineInContent) {
      return true;
    }
  }
  return isHorizontalRule(text, markerIndex, "_");
};
var handleIncompleteDoubleUnderscoreItalic = (text) => {
  const italicMatch = text.match(italicPattern);
  if (!italicMatch) {
    const halfCompleteMatch = text.match(halfCompleteUnderscorePattern);
    if (halfCompleteMatch) {
      const markerIndex2 = text.lastIndexOf(halfCompleteMatch[1]);
      if (!(isInsideCodeBlock(text, markerIndex2) || isWithinCompleteInlineCode(text, markerIndex2))) {
        const underscorePairs2 = countDoubleUnderscoresOutsideCodeBlocks(text);
        if (underscorePairs2 % 2 === 1) {
          return `${text}_`;
        }
      }
    }
    return text;
  }
  const contentAfterMarker = italicMatch[2];
  const markerIndex = text.lastIndexOf(italicMatch[1]);
  if (isInsideCodeBlock(text, markerIndex) || isWithinCompleteInlineCode(text, markerIndex)) {
    return text;
  }
  if (shouldSkipItalicCompletion(text, contentAfterMarker, markerIndex)) {
    return text;
  }
  const underscorePairs = countDoubleUnderscoresOutsideCodeBlocks(text);
  if (underscorePairs % 2 === 1) {
    return `${text}__`;
  }
  return text;
};
var findFirstSingleAsteriskIndex = (text) => {
  let inCodeBlock = false;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "`" && i + 2 < text.length && text[i + 1] === "`" && text[i + 2] === "`") {
      inCodeBlock = !inCodeBlock;
      i += 2;
      continue;
    }
    if (inCodeBlock) {
      continue;
    }
    if (text[i] === "*" && text[i - 1] !== "*" && text[i + 1] !== "*" && text[i - 1] !== "\\" && !isWithinMathBlock(text, i)) {
      const prevChar = i > 0 ? text[i - 1] : "";
      const nextChar = i < text.length - 1 ? text[i + 1] : "";
      const prevIsWs = !prevChar || prevChar === " " || prevChar === "	" || prevChar === "\n";
      const nextIsWs = !nextChar || nextChar === " " || nextChar === "	" || nextChar === "\n";
      if (prevIsWs && nextIsWs) {
        continue;
      }
      if (prevChar && nextChar && isWordChar(prevChar) && isWordChar(nextChar)) {
        continue;
      }
      return i;
    }
  }
  return -1;
};
var handleIncompleteSingleAsteriskItalic = (text) => {
  const singleAsteriskMatch = text.match(singleAsteriskPattern);
  if (!singleAsteriskMatch) {
    return text;
  }
  const firstSingleAsteriskIndex = findFirstSingleAsteriskIndex(text);
  if (firstSingleAsteriskIndex === -1) {
    return text;
  }
  if (isInsideCodeBlock(text, firstSingleAsteriskIndex) || isWithinCompleteInlineCode(text, firstSingleAsteriskIndex)) {
    return text;
  }
  const contentAfterFirstAsterisk = text.substring(
    firstSingleAsteriskIndex + 1
  );
  if (!contentAfterFirstAsterisk || whitespaceOrMarkersPattern.test(contentAfterFirstAsterisk)) {
    return text;
  }
  const singleAsterisks = countSingleAsterisks(text);
  if (singleAsterisks % 2 === 1) {
    return `${text}*`;
  }
  return text;
};
var findFirstSingleUnderscoreIndex = (text) => {
  let inCodeBlock = false;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "`" && i + 2 < text.length && text[i + 1] === "`" && text[i + 2] === "`") {
      inCodeBlock = !inCodeBlock;
      i += 2;
      continue;
    }
    if (inCodeBlock) {
      continue;
    }
    if (text[i] === "_" && text[i - 1] !== "_" && text[i + 1] !== "_" && text[i - 1] !== "\\" && !isWithinMathBlock(text, i) && !isWithinLinkOrImageUrl(text, i)) {
      const prevChar = i > 0 ? text[i - 1] : "";
      const nextChar = i < text.length - 1 ? text[i + 1] : "";
      if (prevChar && nextChar && isWordChar(prevChar) && isWordChar(nextChar)) {
        continue;
      }
      return i;
    }
  }
  return -1;
};
var insertClosingUnderscore = (text) => {
  let endIndex = text.length;
  while (endIndex > 0 && text[endIndex - 1] === "\n") {
    endIndex -= 1;
  }
  if (endIndex < text.length) {
    const textBeforeNewlines = text.slice(0, endIndex);
    const trailingNewlines = text.slice(endIndex);
    return `${textBeforeNewlines}_${trailingNewlines}`;
  }
  return `${text}_`;
};
var handleTrailingAsterisksForUnderscore = (text) => {
  if (!text.endsWith("**")) {
    return null;
  }
  const textWithoutTrailingAsterisks = text.slice(0, -2);
  const asteriskPairsAfterRemoval = countDoubleAsterisksOutsideCodeBlocks(
    textWithoutTrailingAsterisks
  );
  if (asteriskPairsAfterRemoval % 2 !== 1) {
    return null;
  }
  const firstDoubleAsteriskIndex = textWithoutTrailingAsterisks.indexOf("**");
  const underscoreIndex = findFirstSingleUnderscoreIndex(
    textWithoutTrailingAsterisks
  );
  if (firstDoubleAsteriskIndex !== -1 && underscoreIndex !== -1 && firstDoubleAsteriskIndex < underscoreIndex) {
    return `${textWithoutTrailingAsterisks}_**`;
  }
  return null;
};
var handleIncompleteSingleUnderscoreItalic = (text) => {
  const singleUnderscoreMatch = text.match(singleUnderscorePattern);
  if (!singleUnderscoreMatch) {
    return text;
  }
  const firstSingleUnderscoreIndex = findFirstSingleUnderscoreIndex(text);
  if (firstSingleUnderscoreIndex === -1) {
    return text;
  }
  const contentAfterFirstUnderscore = text.substring(
    firstSingleUnderscoreIndex + 1
  );
  if (!contentAfterFirstUnderscore || whitespaceOrMarkersPattern.test(contentAfterFirstUnderscore)) {
    return text;
  }
  if (isInsideCodeBlock(text, firstSingleUnderscoreIndex) || isWithinCompleteInlineCode(text, firstSingleUnderscoreIndex)) {
    return text;
  }
  const singleUnderscores = countSingleUnderscores(text);
  if (singleUnderscores % 2 === 1) {
    const trailingResult = handleTrailingAsterisksForUnderscore(text);
    if (trailingResult !== null) {
      return trailingResult;
    }
    return insertClosingUnderscore(text);
  }
  return text;
};
var areBoldItalicMarkersBalanced = (text) => {
  const asteriskPairs = countDoubleAsterisksOutsideCodeBlocks(text);
  const singleAsterisks = countSingleAsterisks(text);
  return asteriskPairs % 2 === 0 && singleAsterisks % 2 === 0;
};
var shouldSkipBoldItalicCompletion = (text, contentAfterMarker, markerIndex) => {
  if (!contentAfterMarker || whitespaceOrMarkersPattern.test(contentAfterMarker)) {
    return true;
  }
  if (isInsideCodeBlock(text, markerIndex) || isWithinCompleteInlineCode(text, markerIndex)) {
    return true;
  }
  return isHorizontalRule(text, markerIndex, "*");
};
var handleIncompleteBoldItalic = (text) => {
  if (fourOrMoreAsterisksPattern.test(text)) {
    return text;
  }
  const boldItalicMatch = text.match(boldItalicPattern);
  if (!boldItalicMatch) {
    return text;
  }
  const contentAfterMarker = boldItalicMatch[2];
  const markerIndex = text.lastIndexOf(boldItalicMatch[1]);
  if (shouldSkipBoldItalicCompletion(text, contentAfterMarker, markerIndex)) {
    return text;
  }
  const tripleAsteriskCount = countTripleAsterisks(text);
  if (tripleAsteriskCount % 2 === 1) {
    if (areBoldItalicMarkersBalanced(text)) {
      return text;
    }
    return `${text}***`;
  }
  return text;
};

// src/html-tag-handler.ts
var incompleteHtmlTagPattern = /<[a-zA-Z/][^>]*$/;
var handleIncompleteHtmlTag = (text) => {
  const match = text.match(incompleteHtmlTagPattern);
  if (!match || match.index === void 0) {
    return text;
  }
  if (isInsideCodeBlock(text, match.index)) {
    return text;
  }
  return text.substring(0, match.index).trimEnd();
};

// src/inline-code-handler.ts
var handleInlineTripleBackticks = (text) => {
  const inlineTripleBacktickMatch = text.match(inlineTripleBacktickPattern);
  if (!inlineTripleBacktickMatch || text.includes("\n")) {
    return null;
  }
  if (text.endsWith("``") && !text.endsWith("```")) {
    return `${text}\``;
  }
  return text;
};
var isInsideIncompleteCodeBlock = (text) => {
  const allTripleBackticks = (text.match(/```/g) || []).length;
  return allTripleBackticks % 2 === 1;
};
var handleIncompleteInlineCode = (text) => {
  const inlineResult = handleInlineTripleBackticks(text);
  if (inlineResult !== null) {
    return inlineResult;
  }
  const inlineCodeMatch = text.match(inlineCodePattern);
  if (inlineCodeMatch && !isInsideIncompleteCodeBlock(text)) {
    const contentAfterMarker = inlineCodeMatch[2];
    if (!contentAfterMarker || whitespaceOrMarkersPattern.test(contentAfterMarker)) {
      return text;
    }
    const singleBacktickCount = countSingleBackticks(text);
    if (singleBacktickCount % 2 === 1) {
      return `${text}\``;
    }
  }
  return text;
};

// src/katex-handler.ts
var isTripleBacktick = (text, index) => index >= 2 && text.substring(index - 2, index + 1) === "```" || index >= 1 && text.substring(index - 1, index + 2) === "```" || index <= text.length - 3 && text.substring(index, index + 3) === "```";
var countDollarPairs = (text) => {
  let dollarPairs = 0;
  let inInlineCode = false;
  for (let i = 0; i < text.length - 1; i += 1) {
    if (text[i] === "`" && !isTripleBacktick(text, i)) {
      inInlineCode = !inInlineCode;
    }
    if (!inInlineCode && text[i] === "$" && text[i + 1] === "$") {
      dollarPairs += 1;
      i += 1;
    }
  }
  return dollarPairs;
};
var countSingleDollars = (text) => {
  let count = 0;
  let inInlineCode = false;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\\") {
      i += 1;
      continue;
    }
    if (text[i] === "`" && !isTripleBacktick(text, i)) {
      inInlineCode = !inInlineCode;
      continue;
    }
    if (!inInlineCode && text[i] === "$") {
      if (i + 1 < text.length && text[i + 1] === "$") {
        i += 1;
      } else {
        count += 1;
      }
    }
  }
  return count;
};
var addClosingKatex = (text) => {
  if (text.endsWith("$") && !text.endsWith("$$")) {
    return `${text}$`;
  }
  const firstDollarIndex = text.indexOf("$$");
  const hasNewlineAfterStart = firstDollarIndex !== -1 && text.indexOf("\n", firstDollarIndex) !== -1;
  if (hasNewlineAfterStart && !text.endsWith("\n")) {
    return `${text}
$$`;
  }
  return `${text}$$`;
};
var handleIncompleteBlockKatex = (text) => {
  const dollarPairs = countDollarPairs(text);
  if (dollarPairs % 2 === 0) {
    return text;
  }
  return addClosingKatex(text);
};
var handleIncompleteInlineKatex = (text) => {
  const count = countSingleDollars(text);
  if (count % 2 === 1) {
    return `${text}$`;
  }
  return text;
};

// src/link-image-handler.ts
var handleIncompleteUrl = (text, lastParenIndex, linkMode) => {
  const afterParen = text.substring(lastParenIndex + 2);
  if (afterParen.includes(")")) {
    return null;
  }
  const openBracketIndex = findMatchingOpeningBracket(text, lastParenIndex);
  if (openBracketIndex === -1 || isInsideCodeBlock(text, openBracketIndex)) {
    return null;
  }
  const isImage = openBracketIndex > 0 && text[openBracketIndex - 1] === "!";
  const startIndex = isImage ? openBracketIndex - 1 : openBracketIndex;
  const beforeLink = text.substring(0, startIndex);
  if (isImage) {
    return beforeLink;
  }
  const linkText = text.substring(openBracketIndex + 1, lastParenIndex);
  if (linkMode === "text-only") {
    return `${beforeLink}${linkText}`;
  }
  return `${beforeLink}[${linkText}](streamdown:incomplete-link)`;
};
var findFirstIncompleteBracket = (text, maxPos) => {
  for (let j = 0; j < maxPos; j++) {
    if (text[j] === "[" && !isInsideCodeBlock(text, j)) {
      if (j > 0 && text[j - 1] === "!") {
        continue;
      }
      const closingIdx = findMatchingClosingBracket(text, j);
      if (closingIdx === -1) {
        return j;
      }
      if (closingIdx + 1 < text.length && text[closingIdx + 1] === "(") {
        const urlEnd = text.indexOf(")", closingIdx + 2);
        if (urlEnd !== -1) {
          j = urlEnd;
        }
      }
    }
  }
  return maxPos;
};
var handleIncompleteText = (text, i, linkMode) => {
  const isImage = i > 0 && text[i - 1] === "!";
  const openIndex = isImage ? i - 1 : i;
  const afterOpen = text.substring(i + 1);
  if (!afterOpen.includes("]")) {
    const beforeLink = text.substring(0, openIndex);
    if (isImage) {
      return beforeLink;
    }
    if (linkMode === "text-only") {
      const firstIncomplete = findFirstIncompleteBracket(text, i);
      return text.substring(0, firstIncomplete) + text.substring(firstIncomplete + 1);
    }
    return `${text}](streamdown:incomplete-link)`;
  }
  const closingIndex = findMatchingClosingBracket(text, i);
  if (closingIndex === -1) {
    const beforeLink = text.substring(0, openIndex);
    if (isImage) {
      return beforeLink;
    }
    if (linkMode === "text-only") {
      const firstIncomplete = findFirstIncompleteBracket(text, i);
      return text.substring(0, firstIncomplete) + text.substring(firstIncomplete + 1);
    }
    return `${text}](streamdown:incomplete-link)`;
  }
  return null;
};
var handleIncompleteLinksAndImages = (text, linkMode = "protocol") => {
  const lastParenIndex = text.lastIndexOf("](");
  if (lastParenIndex !== -1 && !isInsideCodeBlock(text, lastParenIndex)) {
    const result = handleIncompleteUrl(text, lastParenIndex, linkMode);
    if (result !== null) {
      return result;
    }
  }
  for (let i = text.length - 1; i >= 0; i -= 1) {
    if (text[i] === "[" && !isInsideCodeBlock(text, i)) {
      const result = handleIncompleteText(text, i, linkMode);
      if (result !== null) {
        return result;
      }
    }
  }
  return text;
};

// src/setext-heading-handler.ts
var DASH_ONLY_PATTERN = /^-{1,2}$/;
var DASH_WITH_SPACE_PATTERN = /^[\s]*-{1,2}[\s]+$/;
var EQUALS_ONLY_PATTERN = /^={1,2}$/;
var EQUALS_WITH_SPACE_PATTERN = /^[\s]*={1,2}[\s]+$/;
var handleIncompleteSetextHeading = (text) => {
  if (!text || typeof text !== "string") {
    return text;
  }
  const lastNewlineIndex = text.lastIndexOf("\n");
  if (lastNewlineIndex === -1) {
    return text;
  }
  const lastLine = text.substring(lastNewlineIndex + 1);
  const previousContent = text.substring(0, lastNewlineIndex);
  const trimmedLastLine = lastLine.trim();
  if (DASH_ONLY_PATTERN.test(trimmedLastLine) && !lastLine.match(DASH_WITH_SPACE_PATTERN)) {
    const lines = previousContent.split("\n");
    const previousLine = lines.at(-1);
    if (previousLine && previousLine.trim().length > 0) {
      return `${text}\u200B`;
    }
  }
  if (EQUALS_ONLY_PATTERN.test(trimmedLastLine) && !lastLine.match(EQUALS_WITH_SPACE_PATTERN)) {
    const lines = previousContent.split("\n");
    const previousLine = lines.at(-1);
    if (previousLine && previousLine.trim().length > 0) {
      return `${text}\u200B`;
    }
  }
  return text;
};

// src/single-tilde-handler.ts
var SINGLE_TILDE_PATTERN = /(?<=[\p{L}\p{N}_])~(?!~)(?=[\p{L}\p{N}_])/gu;
var handleSingleTildeEscape = (text) => {
  if (!text || typeof text !== "string") {
    return text;
  }
  if (!text.includes("~")) {
    return text;
  }
  return text.replace(SINGLE_TILDE_PATTERN, (match, offset) => {
    if (isInsideCodeBlock(text, offset)) {
      return match;
    }
    return "\\~";
  });
};

// src/strikethrough-handler.ts
var handleIncompleteStrikethrough = (text) => {
  const strikethroughMatch = text.match(strikethroughPattern);
  if (strikethroughMatch) {
    const contentAfterMarker = strikethroughMatch[2];
    if (!contentAfterMarker || whitespaceOrMarkersPattern.test(contentAfterMarker)) {
      return text;
    }
    const markerIndex = text.lastIndexOf(strikethroughMatch[1]);
    if (isInsideCodeBlock(text, markerIndex) || isWithinCompleteInlineCode(text, markerIndex)) {
      return text;
    }
    const tildePairs = text.match(doubleTildeGlobalPattern)?.length ?? 0;
    if (tildePairs % 2 === 1) {
      return `${text}~~`;
    }
  } else {
    const halfCompleteMatch = text.match(halfCompleteTildePattern);
    if (halfCompleteMatch) {
      const markerIndex = text.lastIndexOf(halfCompleteMatch[0].slice(0, 2));
      if (isInsideCodeBlock(text, markerIndex) || isWithinCompleteInlineCode(text, markerIndex)) {
        return text;
      }
      const tildePairs = text.match(doubleTildeGlobalPattern)?.length ?? 0;
      if (tildePairs % 2 === 1) {
        return `${text}~`;
      }
    }
  }
  return text;
};

// src/index.ts
var isEnabled = (option) => option !== false;
var isOptedIn = (option) => option === true;
var PRIORITY = {
  SINGLE_TILDE: 0,
  COMPARISON_OPERATORS: 5,
  HTML_TAGS: 10,
  SETEXT_HEADINGS: 15,
  LINKS: 20,
  BOLD_ITALIC: 30,
  BOLD: 35,
  ITALIC_DOUBLE_UNDERSCORE: 40,
  ITALIC_SINGLE_ASTERISK: 41,
  ITALIC_SINGLE_UNDERSCORE: 42,
  INLINE_CODE: 50,
  STRIKETHROUGH: 60,
  KATEX: 70,
  INLINE_KATEX: 75,
  DEFAULT: 100
};
var builtInHandlers = [
  {
    handler: {
      name: "singleTilde",
      handle: handleSingleTildeEscape,
      priority: PRIORITY.SINGLE_TILDE
    },
    optionKey: "singleTilde"
  },
  {
    handler: {
      name: "comparisonOperators",
      handle: handleComparisonOperators,
      priority: PRIORITY.COMPARISON_OPERATORS
    },
    optionKey: "comparisonOperators"
  },
  {
    handler: {
      name: "htmlTags",
      handle: handleIncompleteHtmlTag,
      priority: PRIORITY.HTML_TAGS
    },
    optionKey: "htmlTags"
  },
  {
    handler: {
      name: "setextHeadings",
      handle: handleIncompleteSetextHeading,
      priority: PRIORITY.SETEXT_HEADINGS
    },
    optionKey: "setextHeadings"
  },
  {
    handler: {
      name: "links",
      handle: handleIncompleteLinksAndImages,
      priority: PRIORITY.LINKS
    },
    optionKey: "links",
    earlyReturn: (result) => result.endsWith("](streamdown:incomplete-link)")
  },
  {
    handler: {
      name: "boldItalic",
      handle: handleIncompleteBoldItalic,
      priority: PRIORITY.BOLD_ITALIC
    },
    optionKey: "boldItalic"
  },
  {
    handler: {
      name: "bold",
      handle: handleIncompleteBold,
      priority: PRIORITY.BOLD
    },
    optionKey: "bold"
  },
  {
    handler: {
      name: "italicDoubleUnderscore",
      handle: handleIncompleteDoubleUnderscoreItalic,
      priority: PRIORITY.ITALIC_DOUBLE_UNDERSCORE
    },
    optionKey: "italic"
  },
  {
    handler: {
      name: "italicSingleAsterisk",
      handle: handleIncompleteSingleAsteriskItalic,
      priority: PRIORITY.ITALIC_SINGLE_ASTERISK
    },
    optionKey: "italic"
  },
  {
    handler: {
      name: "italicSingleUnderscore",
      handle: handleIncompleteSingleUnderscoreItalic,
      priority: PRIORITY.ITALIC_SINGLE_UNDERSCORE
    },
    optionKey: "italic"
  },
  {
    handler: {
      name: "inlineCode",
      handle: handleIncompleteInlineCode,
      priority: PRIORITY.INLINE_CODE
    },
    optionKey: "inlineCode"
  },
  {
    handler: {
      name: "strikethrough",
      handle: handleIncompleteStrikethrough,
      priority: PRIORITY.STRIKETHROUGH
    },
    optionKey: "strikethrough"
  },
  {
    handler: {
      name: "katex",
      handle: handleIncompleteBlockKatex,
      priority: PRIORITY.KATEX
    },
    optionKey: "katex"
  },
  {
    handler: {
      name: "inlineKatex",
      handle: handleIncompleteInlineKatex,
      priority: PRIORITY.INLINE_KATEX
    },
    optionKey: "inlineKatex"
  }
];
var getEnabledBuiltInHandlers = (options) => {
  const linkMode = options?.linkMode ?? "protocol";
  return builtInHandlers.filter(({ handler, optionKey }) => {
    if (handler.name === "links") {
      return isEnabled(options?.links) || isEnabled(options?.images);
    }
    if (handler.name === "inlineKatex") {
      return isOptedIn(options?.inlineKatex);
    }
    return isEnabled(options?.[optionKey]);
  }).map(({ handler, earlyReturn }) => {
    if (handler.name === "links") {
      return {
        handler: {
          ...handler,
          handle: (text) => handleIncompleteLinksAndImages(text, linkMode)
        },
        // Only use early return for protocol mode (text-only won't end with the marker)
        earlyReturn: linkMode === "protocol" ? earlyReturn : void 0
      };
    }
    return { handler, earlyReturn };
  });
};
var remend = (text, options) => {
  if (!text || typeof text !== "string") {
    return text;
  }
  let result = text.endsWith(" ") && !text.endsWith("  ") ? text.slice(0, -1) : text;
  const enabledBuiltIns = getEnabledBuiltInHandlers(options);
  const customHandlers = (options?.handlers ?? []).map((h) => ({
    handler: { ...h, priority: h.priority ?? PRIORITY.DEFAULT },
    earlyReturn: void 0
  }));
  const allHandlers = [...enabledBuiltIns, ...customHandlers].sort(
    (a, b) => (a.handler.priority ?? 0) - (b.handler.priority ?? 0)
  );
  for (const { handler, earlyReturn } of allHandlers) {
    result = handler.handle(result);
    if (earlyReturn?.(result)) {
      return result;
    }
  }
  return result;
};
var index_default = remend;
export {
  index_default as default,
  isWithinCodeBlock,
  isWithinLinkOrImageUrl,
  isWithinMathBlock,
  isWordChar
};
