import { fourOrMoreAsterisksPattern, boldItalicPattern, boldPattern, italicPattern, halfCompleteUnderscorePattern, singleAsteriskPattern, whitespaceOrMarkersPattern, singleUnderscorePattern, inlineCodePattern, strikethroughPattern, doubleTildeGlobalPattern, halfCompleteTildePattern, findMatchingOpeningBracket, findMatchingClosingBracket, isHorizontalRule, listItemPattern, isWithinMathBlock, isWordChar, isWithinLinkOrImageUrl, inlineTripleBacktickPattern, isWithinHtmlTag } from './chunk-RQY6JLME.js';
export { isWithinCodeBlock, isWithinLinkOrImageUrl, isWithinMathBlock, isWordChar } from './chunk-RQY6JLME.js';

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

// src/incomplete-markdown.ts
var IncompleteMarkdownParser = class {
  plugins = [];
  state = {
    currentLine: 0,
    context: "normal",
    blockingContexts: /* @__PURE__ */ new Set(),
    lineContexts: []
  };
  setState = (state) => {
    this.state = { ...this.state, ...state };
  };
  constructor(plugins = []) {
    this.plugins = plugins;
  }
  // Main parsing methods
  parse(text) {
    if (!text || typeof text !== "string") {
      return text;
    }
    this.state = {
      currentLine: 0,
      context: "normal",
      blockingContexts: /* @__PURE__ */ new Set(),
      lineContexts: [],
      fenceInfo: void 0
    };
    let result = text;
    for (const plugin of this.plugins) {
      if (plugin.preprocess) {
        try {
          const preprocessResult = plugin.preprocess({
            text: result,
            state: this.state,
            setState: this.setState
          });
          if (typeof preprocessResult === "string") {
            result = preprocessResult;
          } else {
            result = preprocessResult.text;
            this.setState(preprocessResult.state);
          }
        } catch (error) {
          console.error(`Plugin ${plugin.name} preprocess hook failed:`, error);
        }
      }
    }
    const lines = result.split("\n");
    const processedLines = [...lines];
    for (let i = 0; i < processedLines.length; i++) {
      this.state.currentLine = i;
      let line = processedLines[i];
      for (const plugin of this.plugins) {
        const currentLineContext = this.state.lineContexts?.[i];
        const shouldSkip = currentLineContext && (plugin.skipInBlockTypes || []).some(
          (blockType) => currentLineContext[blockType]
        );
        if (shouldSkip) {
          continue;
        }
        try {
          const previousLine = line;
          const match = plugin.pattern ? line.match(plugin.pattern) : line.match(/.*/);
          if (match && plugin.handler) {
            line = plugin.handler({
              line,
              text: line,
              match,
              state: this.state,
              setState: this.setState
            });
            const shouldStop = typeof plugin.stopProcessingOnChange === "function" ? plugin.stopProcessingOnChange(previousLine, line) : plugin.stopProcessingOnChange && line !== previousLine;
            if (shouldStop) {
              break;
            }
          }
        } catch (error) {
          console.error(`Plugin ${plugin.name} failed on line ${i}:`, error);
        }
      }
      processedLines[i] = line;
    }
    result = processedLines.join("\n");
    for (const plugin of this.plugins) {
      if (plugin.postprocess) {
        try {
          result = plugin.postprocess({ text: result, state: this.state, setState: this.setState });
        } catch (error) {
          console.error(`Plugin ${plugin.name} afterParse hook failed:`, error);
        }
      }
    }
    return result;
  }
  // Create default plugins that replicate the original handler functions
  static createDefaultPlugins() {
    return [
      // Block-level plugin that manages blocking contexts
      {
        name: "contextManager",
        preprocess: ({ text }) => {
          const lines = text.split("\n");
          let inCodeBlock = false;
          let inMathBlock = false;
          let inCenterBlock = false;
          let inRightBlock = false;
          const lineContexts = [];
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const contentLine = line.replace(/^(?:\s*>\s*)+/, "");
            const trimmedLine = contentLine.trim();
            const startsBacktickFence = trimmedLine.startsWith("```");
            const startsTildeFence = trimmedLine.startsWith("~~~");
            const hasInlineBacktickFence = startsBacktickFence && (trimmedLine.slice(3).includes("```") || trimmedLine.endsWith("``") && !trimmedLine.endsWith("```"));
            const hasInlineTildeFence = startsTildeFence && trimmedLine.slice(3).includes("~~~");
            if (startsBacktickFence && !hasInlineBacktickFence || startsTildeFence && !hasInlineTildeFence) {
              inCodeBlock = !inCodeBlock;
            }
            if (line.trim() === "$$") {
              inMathBlock = !inMathBlock;
            }
            if (line.trim() === "[center]") {
              inCenterBlock = true;
            }
            if (line.trim() === "[/center]") {
              inCenterBlock = false;
            }
            if (line.trim() === "[right]") {
              inRightBlock = true;
            }
            if (line.trim() === "[/right]") {
              inRightBlock = false;
            }
            lineContexts[i] = {
              code: inCodeBlock,
              math: inMathBlock,
              center: inCenterBlock,
              right: inRightBlock
            };
          }
          const finalContexts = /* @__PURE__ */ new Set();
          if (inCodeBlock) finalContexts.add("code");
          if (inMathBlock) finalContexts.add("math");
          if (inCenterBlock) finalContexts.add("center");
          if (inRightBlock) finalContexts.add("right");
          return {
            text,
            // Don't modify text in preprocess
            state: {
              lines,
              blockingContexts: finalContexts,
              lineContexts
            }
          };
        },
        postprocess: ({ text, state }) => {
          let result = text;
          if (state.blockingContexts.has("code")) {
            result += "\n```";
          }
          if (state.blockingContexts.has("math")) {
            result += "\n$$";
          }
          if (state.blockingContexts.has("center")) {
            const openIdx = result.lastIndexOf("[center]");
            const afterOpen = openIdx !== -1 ? result.slice(openIdx + "[center]".length) : "";
            if (afterOpen.replace(/\n/g, "").trim().length > 0) {
              result += "\n[/center]";
            }
          }
          if (state.blockingContexts.has("right")) {
            const openIdx = result.lastIndexOf("[right]");
            const afterOpen = openIdx !== -1 ? result.slice(openIdx + "[right]".length) : "";
            if (afterOpen.replace(/\n/g, "").trim().length > 0) {
              result += "\n[/right]";
            }
          }
          return result;
        }
      },
      {
        name: "singleTildeEscape",
        pattern: /~/,
        skipInBlockTypes: ["code", "math"],
        handler: ({ line }) => escapeSingleTildes(line)
      },
      {
        name: "comparisonOperators",
        pattern: /^(\s*(?:[-*+]|\d+[.)]) +)>(=?\s*[$]?\d)/,
        skipInBlockTypes: ["code", "math"],
        handler: ({ line }) => line.replace(
          /^(\s*(?:[-*+]|\d+[.)]) +)>(=?\s*[$]?\d)/,
          (_, prefix, suffix) => `${prefix}\\>${suffix}`
        )
      },
      {
        name: "htmlTags",
        postprocess: ({ text }) => stripTrailingIncompleteHtmlTag(text)
      },
      {
        name: "setextHeadingGuard",
        pattern: /^[ \t]*[-=]{1,2}[ \t]*$/,
        skipInBlockTypes: ["code", "math", "center", "right"],
        handler: ({ line, state }) => {
          const lines = state.lines ?? [];
          const isLastLine = state.currentLine === lines.length - 1;
          const previousLine = state.currentLine > 0 ? lines[state.currentLine - 1] : void 0;
          const marker = line.trim();
          if (!isLastLine || !previousLine?.trim() || !/^[-=]{1,2}$/.test(marker)) {
            return line;
          }
          return line.trimEnd() + "\u200B";
        }
      },
      {
        name: "footnoteRef",
        pattern: /\[\^[^\]\s,]*/,
        skipInBlockTypes: ["code", "math"],
        handler: ({ line }) => replaceIncompleteFootnoteRefs(line)
      },
      {
        name: "links",
        pattern: /\[/,
        skipInBlockTypes: ["code", "math"],
        stopProcessingOnChange: (_previousLine, nextLine) => nextLine !== _previousLine && nextLine.includes("streamdown:incomplete-link"),
        handler: ({ line }) => handleIncompleteLinksAndImages2(line, "links")
      },
      {
        name: "boldItalic",
        pattern: /\*\*\*/,
        skipInBlockTypes: ["code", "math"],
        handler: ({ line }) => handleIncompleteBoldItalic2(line)
      },
      {
        name: "bold",
        pattern: /\*\*/,
        skipInBlockTypes: ["code", "math"],
        handler: ({ line }) => handleIncompleteBold2(line)
      },
      {
        name: "doubleUnderscoreItalic",
        pattern: /__/,
        skipInBlockTypes: ["code", "math"],
        handler: ({ line }) => handleIncompleteDoubleUnderscoreItalic2(line)
      },
      {
        name: "singleAsteriskItalic",
        pattern: /[\s\S]*/,
        skipInBlockTypes: ["code", "math"],
        handler: ({ line }) => handleIncompleteSingleAsteriskItalic2(line)
      },
      {
        name: "singleUnderscoreItalic",
        pattern: /[\s\S]*/,
        skipInBlockTypes: ["code", "math"],
        handler: ({ line }) => handleIncompleteSingleUnderscoreItalic2(line)
      },
      {
        name: "inlineCode",
        skipInBlockTypes: ["code", "math"],
        pattern: /`/,
        handler: ({ line }) => {
          const inlineTripleBacktickMatch = line.match(/^```[^`\n]*```?$/);
          if (inlineTripleBacktickMatch && !line.includes("\n")) {
            if (line.endsWith("``") && !line.endsWith("```")) {
              return `${line}\``;
            }
            return line;
          }
          const inlineCodeMatch = line.match(/(`)([^`]*?)$/);
          if (!inlineCodeMatch) {
            return line;
          }
          const tripleBackticks = (line.match(/```/g) || []).length;
          if (tripleBackticks % 2 === 1) {
            return line;
          }
          const contentAfterMarker = inlineCodeMatch[2];
          if (!contentAfterMarker || whitespaceOrMarkersPattern2.test(contentAfterMarker)) {
            return line;
          }
          let singleBacktickCount = 0;
          for (let i = 0; i < line.length; i++) {
            if (line[i] === "\\" && i + 1 < line.length && line[i + 1] === "`") {
              i += 1;
              continue;
            }
            if (line[i] !== "`") {
              continue;
            }
            const isTripleStart = line.substring(i, i + 3) === "```";
            const isTripleMiddle = i > 0 && line.substring(i - 1, i + 2) === "```";
            const isTripleEnd = i > 1 && line.substring(i - 2, i + 1) === "```";
            if (!isTripleStart && !isTripleMiddle && !isTripleEnd) {
              singleBacktickCount += 1;
            }
          }
          return singleBacktickCount % 2 === 1 ? `${line}\`` : line;
        }
      },
      {
        name: "strikethrough",
        pattern: /~~/,
        skipInBlockTypes: ["code", "math"],
        handler: ({ line }) => handleIncompleteStrikethrough2(line)
      },
      {
        name: "subscript",
        pattern: /~/,
        skipInBlockTypes: ["code", "math"],
        handler: ({ line }) => line
      },
      {
        name: "inlineCitation",
        pattern: /\[/,
        skipInBlockTypes: ["code", "math"],
        handler: ({ line }) => {
          let result = line;
          while (true) {
            const unmatchedBrackets = [];
            const matchedBrackets = [];
            for (let i = 0; i < result.length; i++) {
              if (result[i] !== "[" || i > 0 && result[i - 1] === "\\") {
                continue;
              }
              if (isInsideCodeBlock2(result, i) || isWithinCompleteInlineCode2(result, i)) {
                continue;
              }
              const candidate = result.substring(i + 1);
              if (candidate.includes("|") || candidate.includes("`") || candidate.includes("*") || candidate.includes("(")) {
                continue;
              }
              if (result[i + 1] === "^") {
                continue;
              }
              const closingIndex = result.indexOf("]", i + 1);
              if (closingIndex === -1) {
                unmatchedBrackets.push(i);
                continue;
              }
              matchedBrackets.push(i);
            }
            if (unmatchedBrackets.length === 0) {
              return result;
            }
            const current = unmatchedBrackets[0];
            const nextUnmatched = unmatchedBrackets[1] ?? -1;
            if (result[current - 1] === "!") {
              return result;
            }
            let insertionPoint = nextUnmatched === -1 ? findEndOfCellOrLineContaining(result, result.length - 1) : nextUnmatched;
            const between = nextUnmatched === -1 ? "" : result.slice(current, nextUnmatched);
            const conjunctionMatch = between.match(/\s+and\s+$/);
            if (conjunctionMatch && nextUnmatched !== -1) {
              insertionPoint = current + between.length - conjunctionMatch[0].length;
            }
            const citationText = result.slice(current + 1, insertionPoint).trim();
            if (!(nextUnmatched !== -1 && conjunctionMatch) && !looksLikeInlineCitationText(citationText)) {
              return result;
            }
            result = result.slice(0, insertionPoint) + "]" + result.slice(insertionPoint);
            if (matchedBrackets.length === 0 && nextUnmatched === -1) {
              return result;
            }
          }
        }
      },
      {
        name: "quotedInlineMath",
        pattern: /\$/,
        skipInBlockTypes: ["code", "math"],
        handler: ({ line }) => {
          if (!/^\s*>/.test(line) || line.includes("$$")) {
            return line;
          }
          let count = 0;
          for (let i = 0; i < line.length; i++) {
            if (line[i] === "\\" && i + 1 < line.length && line[i + 1] === "$") {
              i++;
              continue;
            }
            if (line[i] === "$" && (i === 0 || line[i - 1] !== "$") && (i === line.length - 1 || line[i + 1] !== "$") && !isWithinCompleteInlineCode2(line, i)) {
              count++;
            }
          }
          if (count % 2 === 1) {
            const endOfCellOrLine = findEndOfCellOrLineContaining(line, line.length - 1);
            return line.substring(0, endOfCellOrLine) + "$" + line.substring(endOfCellOrLine);
          }
          return line;
        }
      },
      {
        name: "superscript",
        pattern: /\^/,
        skipInBlockTypes: ["code", "math"],
        handler: ({ line }) => {
          let singleCarets = 0;
          for (let i = 0; i < line.length; i++) {
            if (line[i] === "^") {
              const prevChar = i > 0 ? line[i - 1] : "";
              if (prevChar === "\\") continue;
              if (!isWithinFootnoteRef(line, i)) singleCarets++;
            }
          }
          if (singleCarets % 2 === 1) {
            const lastCaretIndex = line.lastIndexOf("^");
            if (lastCaretIndex !== -1 && !isWithinMathBlock2(line, lastCaretIndex) && !isWithinFootnoteRef(line, lastCaretIndex)) {
              const endOfCellOrLine = findEndOfCellOrLineContaining(line, lastCaretIndex);
              const contentAfterCaret = line.substring(lastCaretIndex + 1, endOfCellOrLine);
              if (contentAfterCaret.trim().length > 0) {
                return line.substring(0, endOfCellOrLine) + "^" + line.substring(endOfCellOrLine);
              }
            }
          }
          return line;
        }
      },
      {
        name: "blockMath",
        pattern: /\$\$/,
        skipInBlockTypes: ["code", "math"],
        handler: ({ line }) => {
          if (line.trim() === "$$") return line;
          const dollarPairs = (line.match(/\$\$/g) || []).length;
          if (dollarPairs % 2 === 0) return line;
          const firstDollarIndex = line.indexOf("$$");
          const hasNewlineAfterStart = line.indexOf("\n", firstDollarIndex) !== -1;
          if (!hasNewlineAfterStart) {
            if (line.endsWith("$") && !line.endsWith("$$")) {
              return line + "$";
            }
            return line + "$$";
          }
          return line;
        }
      },
      {
        name: "descriptionList",
        pattern: /^(\s*):/,
        skipInBlockTypes: ["code", "math"],
        handler: ({ line }) => {
          const colonMatch = line.match(/^(\s*):(.+)$/);
          if (colonMatch) {
            const [, indent, content] = colonMatch;
            if (!content.includes(":")) {
              const endOfCellOrLine = findEndOfCellOrLineContaining(line, line.length - 1);
              return line.substring(0, endOfCellOrLine) + ":" + line.substring(endOfCellOrLine);
            }
          }
          return line;
        }
      },
      {
        name: "images",
        pattern: /\[/,
        skipInBlockTypes: ["code", "math"],
        handler: ({ line }) => handleIncompleteLinksAndImages2(line, "images")
      },
      {
        name: "alignmentBlocks",
        pattern: /^(\s*\[(center|right)\])$/,
        skipInBlockTypes: ["code", "math"],
        handler: ({ line }) => {
          return line;
        }
      },
      {
        name: "mdx",
        skipInBlockTypes: ["code", "math", "center", "right"],
        preprocess: ({ text }) => {
          const lines = text.split("\n");
          const openTags = [];
          let mdxLineStates = [];
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let inMdx = false;
            let incompletePositions = [];
            let searchPos = 0;
            while (searchPos < line.length) {
              const tagStart = line.indexOf("<", searchPos);
              if (tagStart === -1 || tagStart >= line.length - 1) break;
              const nextChar = line[tagStart + 1];
              if (!/[A-Z]/.test(nextChar)) {
                searchPos = tagStart + 1;
                continue;
              }
              const selfClosingMatch = line.substring(tagStart).match(/^<([A-Z][a-zA-Z0-9]*)((?:\s+\w+=(?:"[^"]*"|{[^}]*}))*)\s*\/>/);
              if (selfClosingMatch) {
                searchPos = tagStart + selfClosingMatch[0].length;
                continue;
              }
              const completeMatch = line.substring(tagStart).match(/^<([A-Z][a-zA-Z0-9]*)((?:\s+\w+=(?:"[^"]*"|{[^}]*}))*)\s*>.*?<\/\1>/);
              if (completeMatch) {
                searchPos = tagStart + completeMatch[0].length;
                continue;
              }
              const openTagMatch = line.substring(tagStart).match(/^<([A-Z][a-zA-Z0-9]*)((?:\s+\w+=(?:"[^"]*"|{[^}]*}))*)\s*>/);
              if (openTagMatch) {
                const tagName = openTagMatch[1];
                openTags.push({ tagName, lineIndex: i });
                inMdx = true;
                searchPos = tagStart + openTagMatch[0].length;
                continue;
              }
              const incompleteSelfClosing = line.substring(tagStart).match(/^<([A-Z][a-zA-Z0-9]*)[^>]*\/$/);
              if (incompleteSelfClosing) {
                incompletePositions.push(tagStart);
                break;
              }
              const incompleteTag = line.substring(tagStart).match(/^<([A-Z][a-zA-Z0-9]*)(?:\s+[^>]*)?$/);
              if (incompleteTag) {
                incompletePositions.push(tagStart);
                break;
              }
              searchPos = tagStart + 1;
            }
            const closeTagMatches = line.matchAll(/<\/([A-Z][a-zA-Z0-9]*)>/g);
            for (const closeMatch of closeTagMatches) {
              const tagName = closeMatch[1];
              const openIndex = openTags.findIndex((t) => t.tagName === tagName);
              if (openIndex !== -1) {
                openTags.splice(openIndex, 1);
              }
            }
            mdxLineStates[i] = { inMdx, incompletePositions };
          }
          return {
            text,
            state: {
              mdxUnclosedTags: openTags,
              mdxLineStates
            }
          };
        },
        handler: ({ line, state }) => {
          const lineStates = state.mdxLineStates || [];
          const currentState = lineStates[state.currentLine];
          if (currentState?.incompletePositions && currentState.incompletePositions.length > 0) {
            let result = line;
            for (let i = currentState.incompletePositions.length - 1; i >= 0; i--) {
              const pos = currentState.incompletePositions[i];
              const before = result.substring(0, pos);
              const incompleteTag = result.substring(pos);
              const shouldPreserveWhitespace = currentState.inMdx || /^<[A-Z][a-zA-Z0-9]*\s+/.test(incompleteTag);
              result = shouldPreserveWhitespace ? before : before.replace(/[ \t]+$/, "");
            }
            return result;
          }
          return line;
        },
        postprocess: ({ text, state }) => {
          const unclosedTags = state.mdxUnclosedTags || [];
          if (unclosedTags.length > 0) {
            let result = text;
            for (let i = unclosedTags.length - 1; i >= 0; i--) {
              result += `
</${unclosedTags[i].tagName}>`;
            }
            return result;
          }
          return text;
        }
      }
    ];
  }
};
var defaultPlugins = IncompleteMarkdownParser.createDefaultPlugins();
var defaultParser = new IncompleteMarkdownParser(defaultPlugins);
var parseIncompleteMarkdown = (text) => {
  if (!text || typeof text !== "string") {
    return text;
  }
  if (text.trim().length === 0) {
    return "";
  }
  return defaultParser.parse(text);
};
var findEndOfCellOrLineContaining = (text, position) => {
  let endPos = position;
  while (endPos < text.length && text[endPos] !== "\n" && text[endPos] !== "|") {
    endPos++;
  }
  return endPos;
};
var isWithinMathBlock2 = (text, position) => {
  let inInlineMath = false;
  let inBlockMath = false;
  for (let i = 0; i < text.length && i < position; i++) {
    if (text[i] === "\\" && text[i + 1] === "$") {
      i++;
      continue;
    }
    if (text[i] === "$") {
      if (text[i + 1] === "$") {
        inBlockMath = !inBlockMath;
        i++;
        inInlineMath = false;
      } else if (!inBlockMath) {
        inInlineMath = !inInlineMath;
      }
    }
  }
  return inInlineMath || inBlockMath;
};
var isWithinCompleteInlineCode2 = (text, position) => {
  let inInlineCode = false;
  let inFencedCode = false;
  let inlineCodeStart = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\\" && text[i + 1] === "`") {
      i++;
      continue;
    }
    if (text.slice(i, i + 3) === "```") {
      inFencedCode = !inFencedCode;
      i += 2;
      continue;
    }
    if (inFencedCode || text[i] !== "`") {
      continue;
    }
    if (inInlineCode) {
      if (inlineCodeStart < position && position < i) {
        return true;
      }
      inInlineCode = false;
      inlineCodeStart = -1;
      continue;
    }
    inInlineCode = true;
    inlineCodeStart = i;
  }
  return false;
};
var isWithinFencedCodeBlock = (text, position) => {
  let inFencedCode = false;
  for (let i = 0; i < text.length && i < position; i++) {
    if (text[i] === "\\" && text[i + 1] === "`") {
      i++;
      continue;
    }
    if (text.slice(i, i + 3) === "```") {
      inFencedCode = !inFencedCode;
      i += 2;
    }
  }
  return inFencedCode;
};
var isWordCharacter = (char) => /[\p{L}\p{N}_]/u.test(char);
var isWordChar2 = (char) => isWordCharacter(char);
var whitespaceOrMarkersPattern2 = /^[\s_~*`]*$/;
var fourOrMoreAsterisksPattern2 = /^\*{4,}$/;
var boldPattern2 = /(\*\*)([^*]*\*?)$/;
var italicPattern2 = /(__)([^_]*?)$/;
var boldItalicPattern2 = /(\*\*\*)([^*]*?)$/;
var singleAsteriskPattern2 = /(\*)([^*]*?)$/;
var singleUnderscorePattern2 = /(_)([^_]*?)$/;
var halfCompleteUnderscorePattern2 = /(__)([^_]+)_$/;
var halfCompleteTildePattern2 = /(~~)([^~]+)~$/;
var listItemPattern2 = /^[\s]*[-*+][\s]+$/;
var isInsideCodeBlock2 = (text, position) => {
  let inInlineCode = false;
  let inMultilineCode = false;
  let inlineCodeStart = -1;
  for (let i = 0; i < position; i++) {
    if (text[i] === "\\" && i + 1 < text.length && text[i + 1] === "`") {
      i++;
      continue;
    }
    if (text.slice(i, i + 3) === "```") {
      inMultilineCode = !inMultilineCode;
      i += 2;
      continue;
    }
    if (!inMultilineCode && text[i] === "`") {
      inInlineCode = !inInlineCode;
      inlineCodeStart = inInlineCode ? i : -1;
    }
  }
  if (inInlineCode && !inMultilineCode && inlineCodeStart !== -1) {
    const closingBacktickIndex = text.indexOf("`", position);
    const spanContent = text.slice(
      inlineCodeStart + 1,
      closingBacktickIndex === -1 ? void 0 : closingBacktickIndex
    );
    if (spanContent.includes("[") && !spanContent.includes("]")) {
      return false;
    }
  }
  return inInlineCode || inMultilineCode;
};
var isInsideUnclosedInlineCode = (text, position) => {
  let inInlineCode = false;
  let inMultilineCode = false;
  for (let i = 0; i < position; i++) {
    if (text[i] === "\\" && i + 1 < text.length && text[i + 1] === "`") {
      i++;
      continue;
    }
    if (text.slice(i, i + 3) === "```") {
      inMultilineCode = !inMultilineCode;
      i += 2;
      continue;
    }
    if (!inMultilineCode && text[i] === "`") {
      inInlineCode = !inInlineCode;
    }
  }
  return inInlineCode && !inMultilineCode && text.indexOf("`", position) === -1;
};
var isWithinLinkOrImageUrl2 = (text, position) => {
  for (let i = position - 1; i >= 0; i--) {
    if (text[i] === ")") {
      return false;
    }
    if (text[i] === "(") {
      if (i > 0 && text[i - 1] === "]") {
        for (let j = position; j < text.length; j++) {
          if (text[j] === ")") {
            return true;
          }
          if (text[j] === "\n") {
            return false;
          }
        }
      }
      return false;
    }
    if (text[i] === "\n") {
      return false;
    }
  }
  return false;
};
var isWithinHtmlTag2 = (text, position) => {
  for (let i = position - 1; i >= 0; i--) {
    if (text[i] === ">") {
      return false;
    }
    if (text[i] === "<") {
      const nextChar = i + 1 < text.length ? text[i + 1] : "";
      return /[A-Za-z/]/.test(nextChar);
    }
    if (text[i] === "\n") {
      return false;
    }
  }
  return false;
};
var looksLikeInlineCitationText = (text) => {
  const normalized = text.replace(/\s+and\s+$/i, "").trim();
  if (!normalized) {
    return false;
  }
  return normalized.split(/[\s,;]+/).filter((token) => token.length > 0).every((token) => /^(?:ref[\w-]*|\d[\w-]*)$/i.test(token));
};
var isHorizontalRule2 = (text, markerIndex, marker) => {
  let lineStart = 0;
  for (let i = markerIndex - 1; i >= 0; i--) {
    if (text[i] === "\n") {
      lineStart = i + 1;
      break;
    }
  }
  let lineEnd = text.length;
  for (let i = markerIndex; i < text.length; i++) {
    if (text[i] === "\n") {
      lineEnd = i;
      break;
    }
  }
  let markerCount = 0;
  for (const char of text.slice(lineStart, lineEnd)) {
    if (char === marker) {
      markerCount++;
      continue;
    }
    if (char !== " " && char !== "	") {
      return false;
    }
  }
  return markerCount >= 3;
};
var shouldSkipAsterisk2 = (text, index, prevChar, nextChar) => {
  if (prevChar === "\\") {
    return true;
  }
  if (text.includes("$") && isWithinMathBlock2(text, index)) {
    return true;
  }
  if (prevChar !== "*" && nextChar === "*" && text[index + 2] !== "*") {
    return true;
  }
  if (prevChar === "*") {
    return true;
  }
  if (prevChar && nextChar && isWordChar2(prevChar) && isWordChar2(nextChar)) {
    return true;
  }
  const prevIsWhitespace = !prevChar || prevChar === " " || prevChar === "	" || prevChar === "\n";
  const nextIsWhitespace = !nextChar || nextChar === " " || nextChar === "	" || nextChar === "\n";
  return prevIsWhitespace && nextIsWhitespace;
};
var countSingleAsterisks2 = (text) => {
  let count = 0;
  let inCodeBlock = false;
  for (let i = 0; i < text.length; i++) {
    if (text.slice(i, i + 3) === "```") {
      inCodeBlock = !inCodeBlock;
      i += 2;
      continue;
    }
    if (inCodeBlock || text[i] !== "*") {
      continue;
    }
    const prevChar = i > 0 ? text[i - 1] : "";
    const nextChar = i < text.length - 1 ? text[i + 1] : "";
    if (!shouldSkipAsterisk2(text, i, prevChar, nextChar)) {
      count++;
    }
  }
  return count;
};
var shouldSkipUnderscore2 = (text, index, prevChar, nextChar) => {
  if (prevChar === "\\") {
    return true;
  }
  if (text.includes("$") && isWithinMathBlock2(text, index)) {
    return true;
  }
  if (isWithinLinkOrImageUrl2(text, index) || isWithinHtmlTag2(text, index)) {
    return true;
  }
  if (prevChar === "_" || nextChar === "_") {
    return true;
  }
  return Boolean(prevChar && nextChar && isWordChar2(prevChar) && isWordChar2(nextChar));
};
var countSingleUnderscores2 = (text) => {
  let count = 0;
  let inCodeBlock = false;
  for (let i = 0; i < text.length; i++) {
    if (text.slice(i, i + 3) === "```") {
      inCodeBlock = !inCodeBlock;
      i += 2;
      continue;
    }
    if (inCodeBlock || text[i] !== "_") {
      continue;
    }
    const prevChar = i > 0 ? text[i - 1] : "";
    const nextChar = i < text.length - 1 ? text[i + 1] : "";
    if (!shouldSkipUnderscore2(text, i, prevChar, nextChar)) {
      count++;
    }
  }
  return count;
};
var countTripleAsterisks2 = (text) => {
  let count = 0;
  let consecutiveAsterisks = 0;
  let inCodeBlock = false;
  for (let i = 0; i < text.length; i++) {
    if (text.slice(i, i + 3) === "```") {
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
      consecutiveAsterisks++;
      continue;
    }
    if (consecutiveAsterisks >= 3) {
      count += Math.floor(consecutiveAsterisks / 3);
    }
    consecutiveAsterisks = 0;
  }
  if (consecutiveAsterisks >= 3) {
    count += Math.floor(consecutiveAsterisks / 3);
  }
  return count;
};
var countDoubleAsterisksOutsideCodeBlocks2 = (text) => {
  let count = 0;
  let inCodeBlock = false;
  for (let i = 0; i < text.length; i++) {
    if (text.slice(i, i + 3) === "```") {
      inCodeBlock = !inCodeBlock;
      i += 2;
      continue;
    }
    if (inCodeBlock) {
      continue;
    }
    if (text[i] === "*" && i + 1 < text.length && text[i + 1] === "*") {
      count++;
      i++;
    }
  }
  return count;
};
var countDoubleUnderscoresOutsideCodeBlocks2 = (text) => {
  let count = 0;
  let inCodeBlock = false;
  for (let i = 0; i < text.length; i++) {
    if (text.slice(i, i + 3) === "```") {
      inCodeBlock = !inCodeBlock;
      i += 2;
      continue;
    }
    if (inCodeBlock) {
      continue;
    }
    if (text[i] === "_" && i + 1 < text.length && text[i + 1] === "_") {
      count++;
      i++;
    }
  }
  return count;
};
var shouldSkipBoldCompletion2 = (text, contentAfterMarker, markerIndex) => {
  if (!contentAfterMarker || whitespaceOrMarkersPattern2.test(contentAfterMarker)) {
    return true;
  }
  const beforeMarker = text.slice(0, markerIndex);
  const lastNewlineBeforeMarker = beforeMarker.lastIndexOf("\n");
  const lineStart = lastNewlineBeforeMarker === -1 ? 0 : lastNewlineBeforeMarker + 1;
  if (listItemPattern2.test(text.slice(lineStart, markerIndex)) && contentAfterMarker.includes("\n")) {
    return true;
  }
  return isHorizontalRule2(text, markerIndex, "*");
};
var handleIncompleteBold2 = (text) => {
  const boldMatch = text.match(boldPattern2);
  if (!boldMatch) {
    const markerIndex2 = text.lastIndexOf("**");
    const beforeMarker = markerIndex2 === -1 ? "" : text.slice(0, markerIndex2);
    const openStrikethroughs = (beforeMarker.match(/~~/g) || []).length;
    const trimmedPrefix = beforeMarker.trim();
    const hasMarkdownPrefix = /^(?:[#>-]|\d+\.)/.test(trimmedPrefix);
    const plainPrefixWordCount = trimmedPrefix.replace(/^(?:[#>-]|\d+\.)\s*/, "").split(/\s+/).filter(Boolean).length;
    if (markerIndex2 !== -1 && (hasMarkdownPrefix || plainPrefixWordCount > 2) && openStrikethroughs % 2 === 0 && countDoubleAsterisksOutsideCodeBlocks2(text) % 2 === 1 && !isInsideCodeBlock2(text, markerIndex2) && !isWithinCompleteInlineCode2(text, markerIndex2)) {
      const contentAfterMarker2 = text.slice(markerIndex2 + 2);
      if (contentAfterMarker2.includes("*") && !/[`~[]/.test(contentAfterMarker2) && !shouldSkipBoldCompletion2(text, contentAfterMarker2, markerIndex2)) {
        return `${text}**`;
      }
    }
    return text;
  }
  const contentAfterMarker = boldMatch[2];
  const markerIndex = text.lastIndexOf(boldMatch[1]);
  if (isInsideCodeBlock2(text, markerIndex) || isWithinCompleteInlineCode2(text, markerIndex) || shouldSkipBoldCompletion2(text, contentAfterMarker, markerIndex)) {
    return text;
  }
  const asteriskPairs = countDoubleAsterisksOutsideCodeBlocks2(text);
  if (asteriskPairs % 2 === 1) {
    return contentAfterMarker.endsWith("*") ? `${text}*` : `${text}**`;
  }
  return text;
};
var shouldSkipItalicCompletion2 = (text, contentAfterMarker, markerIndex) => {
  if (!contentAfterMarker || whitespaceOrMarkersPattern2.test(contentAfterMarker)) {
    return true;
  }
  const beforeMarker = text.slice(0, markerIndex);
  const lastNewlineBeforeMarker = beforeMarker.lastIndexOf("\n");
  const lineStart = lastNewlineBeforeMarker === -1 ? 0 : lastNewlineBeforeMarker + 1;
  if (listItemPattern2.test(text.slice(lineStart, markerIndex)) && contentAfterMarker.includes("\n")) {
    return true;
  }
  return isHorizontalRule2(text, markerIndex, "_");
};
var handleIncompleteDoubleUnderscoreItalic2 = (text) => {
  const italicMatch = text.match(italicPattern2);
  if (!italicMatch) {
    const halfCompleteMatch = text.match(halfCompleteUnderscorePattern2);
    if (!halfCompleteMatch) {
      return text;
    }
    const markerIndex2 = text.lastIndexOf(halfCompleteMatch[1]);
    if (isInsideCodeBlock2(text, markerIndex2) || isWithinCompleteInlineCode2(text, markerIndex2)) {
      return text;
    }
    return countDoubleUnderscoresOutsideCodeBlocks2(text) % 2 === 1 ? `${text}_` : text;
  }
  const contentAfterMarker = italicMatch[2];
  const markerIndex = text.lastIndexOf(italicMatch[1]);
  if (isInsideCodeBlock2(text, markerIndex) || isWithinCompleteInlineCode2(text, markerIndex) || shouldSkipItalicCompletion2(text, contentAfterMarker, markerIndex)) {
    return text;
  }
  return countDoubleUnderscoresOutsideCodeBlocks2(text) % 2 === 1 ? `${text}__` : text;
};
var findFirstSingleAsteriskIndex2 = (text) => {
  let inCodeBlock = false;
  for (let i = 0; i < text.length; i++) {
    if (text.slice(i, i + 3) === "```") {
      inCodeBlock = !inCodeBlock;
      i += 2;
      continue;
    }
    if (inCodeBlock) {
      continue;
    }
    if (text[i] === "*" && text[i - 1] !== "*" && text[i + 1] !== "*" && text[i - 1] !== "\\" && !isWithinMathBlock2(text, i)) {
      const prevChar = i > 0 ? text[i - 1] : "";
      const nextChar = i < text.length - 1 ? text[i + 1] : "";
      const prevIsWhitespace = !prevChar || prevChar === " " || prevChar === "	" || prevChar === "\n";
      const nextIsWhitespace = !nextChar || nextChar === " " || nextChar === "	" || nextChar === "\n";
      if (prevIsWhitespace && nextIsWhitespace) {
        continue;
      }
      if (prevChar && nextChar && isWordChar2(prevChar) && isWordChar2(nextChar)) {
        continue;
      }
      return i;
    }
  }
  return -1;
};
var handleIncompleteSingleAsteriskItalic2 = (text) => {
  if (!text.match(singleAsteriskPattern2)) {
    return text;
  }
  const firstSingleAsteriskIndex = findFirstSingleAsteriskIndex2(text);
  if (firstSingleAsteriskIndex === -1) {
    return text;
  }
  if (isInsideCodeBlock2(text, firstSingleAsteriskIndex) || isWithinCompleteInlineCode2(text, firstSingleAsteriskIndex)) {
    return text;
  }
  const contentAfterFirstAsterisk = text.slice(firstSingleAsteriskIndex + 1);
  if (!contentAfterFirstAsterisk || whitespaceOrMarkersPattern2.test(contentAfterFirstAsterisk)) {
    return text;
  }
  return countSingleAsterisks2(text) % 2 === 1 ? `${text}*` : text;
};
var findFirstSingleUnderscoreIndex2 = (text) => {
  let inCodeBlock = false;
  for (let i = 0; i < text.length; i++) {
    if (text.slice(i, i + 3) === "```") {
      inCodeBlock = !inCodeBlock;
      i += 2;
      continue;
    }
    if (inCodeBlock) {
      continue;
    }
    if (text[i] === "_" && text[i - 1] !== "_" && text[i + 1] !== "_" && text[i - 1] !== "\\" && !isWithinMathBlock2(text, i) && !isWithinLinkOrImageUrl2(text, i)) {
      const prevChar = i > 0 ? text[i - 1] : "";
      const nextChar = i < text.length - 1 ? text[i + 1] : "";
      if (prevChar && nextChar && isWordChar2(prevChar) && isWordChar2(nextChar)) {
        continue;
      }
      return i;
    }
  }
  return -1;
};
var insertClosingUnderscore2 = (text) => {
  let endIndex = text.length;
  while (endIndex > 0 && text[endIndex - 1] === "\n") {
    endIndex--;
  }
  return endIndex < text.length ? `${text.slice(0, endIndex)}_${text.slice(endIndex)}` : `${text}_`;
};
var handleTrailingAsterisksForUnderscore2 = (text) => {
  if (!text.endsWith("**")) {
    return null;
  }
  const textWithoutTrailingAsterisks = text.slice(0, -2);
  if (countDoubleAsterisksOutsideCodeBlocks2(textWithoutTrailingAsterisks) % 2 !== 1) {
    return null;
  }
  const firstDoubleAsteriskIndex = textWithoutTrailingAsterisks.indexOf("**");
  const underscoreIndex = findFirstSingleUnderscoreIndex2(textWithoutTrailingAsterisks);
  if (firstDoubleAsteriskIndex !== -1 && underscoreIndex !== -1 && firstDoubleAsteriskIndex < underscoreIndex) {
    return `${textWithoutTrailingAsterisks}_**`;
  }
  return null;
};
var handleIncompleteSingleUnderscoreItalic2 = (text) => {
  if (!text.match(singleUnderscorePattern2)) {
    return text;
  }
  const firstSingleUnderscoreIndex = findFirstSingleUnderscoreIndex2(text);
  if (firstSingleUnderscoreIndex === -1) {
    return text;
  }
  const contentAfterFirstUnderscore = text.slice(firstSingleUnderscoreIndex + 1);
  if (!contentAfterFirstUnderscore || whitespaceOrMarkersPattern2.test(contentAfterFirstUnderscore) || isInsideCodeBlock2(text, firstSingleUnderscoreIndex) || isWithinCompleteInlineCode2(text, firstSingleUnderscoreIndex)) {
    return text;
  }
  if (countSingleUnderscores2(text) % 2 !== 1) {
    return text;
  }
  return handleTrailingAsterisksForUnderscore2(text) ?? insertClosingUnderscore2(text);
};
var areBoldItalicMarkersBalanced2 = (text) => countDoubleAsterisksOutsideCodeBlocks2(text) % 2 === 0 && countSingleAsterisks2(text) % 2 === 0;
var shouldSkipBoldItalicCompletion2 = (text, contentAfterMarker, markerIndex) => {
  if (!contentAfterMarker || whitespaceOrMarkersPattern2.test(contentAfterMarker) || isInsideCodeBlock2(text, markerIndex) || isWithinCompleteInlineCode2(text, markerIndex)) {
    return true;
  }
  return isHorizontalRule2(text, markerIndex, "*");
};
var handleIncompleteBoldItalic2 = (text) => {
  if (fourOrMoreAsterisksPattern2.test(text)) {
    return text;
  }
  const boldItalicMatch = text.match(boldItalicPattern2);
  if (!boldItalicMatch) {
    return text;
  }
  const contentAfterMarker = boldItalicMatch[2];
  const markerIndex = text.lastIndexOf(boldItalicMatch[1]);
  if (shouldSkipBoldItalicCompletion2(text, contentAfterMarker, markerIndex)) {
    return text;
  }
  if (countTripleAsterisks2(text) % 2 !== 1) {
    return text;
  }
  return areBoldItalicMarkersBalanced2(text) ? text : `${text}***`;
};
var findMatchingOpeningBracket2 = (text, closeIndex) => {
  let depth = 1;
  for (let i = closeIndex - 1; i >= 0; i--) {
    if (text[i] === "]") {
      depth++;
    } else if (text[i] === "[") {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
};
var findMatchingClosingBracket2 = (text, openIndex) => {
  let depth = 1;
  for (let i = openIndex + 1; i < text.length; i++) {
    if (text[i] === "[") {
      depth++;
    } else if (text[i] === "]") {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
};
var handleIncompleteUrl2 = (text, lastParenIndex, target) => {
  const afterParen = text.slice(lastParenIndex + 2);
  if (afterParen.includes(")")) {
    return null;
  }
  const openBracketIndex = findMatchingOpeningBracket2(text, lastParenIndex);
  if (openBracketIndex === -1 || isInsideCodeBlock2(text, openBracketIndex) && !isInsideUnclosedInlineCode(text, openBracketIndex)) {
    return null;
  }
  const isImage = openBracketIndex > 0 && text[openBracketIndex - 1] === "!";
  if (isImage && target === "links" || !isImage && target === "images") {
    return null;
  }
  const startIndex = isImage ? openBracketIndex - 1 : openBracketIndex;
  const beforeLink = text.slice(0, startIndex);
  const linkText = text.slice(openBracketIndex + 1, lastParenIndex);
  const urlText = text.slice(lastParenIndex + 2);
  if (/^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(urlText) || urlText.includes("/")) {
    return `${text})`;
  }
  return isImage ? `${beforeLink}![${linkText}](streamdown:incomplete-image)` : `${beforeLink}[${linkText}](streamdown:incomplete-link)`;
};
var handleIncompleteTextLink = (text, index, target) => {
  const isImage = index > 0 && text[index - 1] === "!";
  if (isImage && target === "links" || !isImage && target === "images") {
    return null;
  }
  const openIndex = isImage ? index - 1 : index;
  const closingIndex = findMatchingClosingBracket2(text, index);
  const placeholderProtocol = isImage ? "streamdown:incomplete-image" : "streamdown:incomplete-link";
  const incompleteText = text.slice(index + 1);
  if (closingIndex === -1) {
    if (!isImage && looksLikeInlineCitationText(incompleteText)) {
      return null;
    }
    if (!isImage) {
      const nestedCitationMatch = incompleteText.match(/^(.*)\[(.*)$/);
      if (nestedCitationMatch && looksLikeInlineCitationText(nestedCitationMatch[1]) && looksLikeInlineCitationText(nestedCitationMatch[2])) {
        return null;
      }
    }
    if (!isImage) {
      const lineStart = text.lastIndexOf("\n", index - 1) + 1;
      const prefix = text.slice(lineStart, index);
      if (/^\s*[-*+]\s+$/.test(prefix)) {
        const trimmedItem = incompleteText.trim();
        if (trimmedItem === "" || trimmedItem === "x" || trimmedItem === "X") {
          return `${text}]`;
        }
      }
    }
    if (!isImage) {
      const prevBracketEnd2 = text.lastIndexOf("]", openIndex - 1);
      if (prevBracketEnd2 !== -1) {
        const prevBracketStart = findMatchingOpeningBracket2(text, prevBracketEnd2);
        if (prevBracketStart !== -1) {
          const prevBracketText = text.slice(prevBracketStart + 1, prevBracketEnd2).trim();
          const previousGroupIsLink = text[prevBracketEnd2 + 1] === "(" && text.indexOf(")", prevBracketEnd2 + 2) !== -1;
          const betweenGroups = text.slice(prevBracketEnd2 + 1, openIndex);
          const trimmedIncompleteText = incompleteText.trim();
          if (!previousGroupIsLink && prevBracketText.length > 0 && /^(?:\([^)\n]*\))?\s+and\s+$/.test(betweenGroups) && /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(trimmedIncompleteText)) {
            return `${text}]`;
          }
        }
      }
    }
    if (incompleteText.includes("|") || incompleteText.startsWith("[") || incompleteText.includes("![") || isImage && incompleteText.includes("[")) {
      return null;
    }
    const prevBracketEnd = text.lastIndexOf("]", openIndex - 1);
    if (prevBracketEnd !== -1) {
      const prevBracketStart = findMatchingOpeningBracket2(text, prevBracketEnd);
      if (prevBracketStart !== -1) {
        const prevBracketText = text.slice(prevBracketStart + 1, prevBracketEnd);
        if (prevBracketText === incompleteText) {
          return null;
        }
      }
    }
    return `${text}](${placeholderProtocol})`;
  }
  const afterClosing = text.slice(closingIndex + 1);
  if (afterClosing.startsWith("(")) {
    return null;
  }
  if (afterClosing.trim().length === 0) {
    const linkText = text.slice(index + 1, closingIndex);
    const beforeLink = text.slice(0, openIndex);
    if (linkText.startsWith("[") || linkText.includes("![") || isImage && linkText.includes("[")) {
      return null;
    }
    const shouldRecoverAsLink = isImage || linkText.includes("[") || /[*_~`]/.test(linkText);
    if (!shouldRecoverAsLink) {
      return null;
    }
    const hasOuterBracketTakingPrecedence = Array.from({ length: index }, (_, i) => i).some(
      (i) => text[i] === "[" && !isInsideCodeBlock2(text, i) && (() => {
        const outerClosingIndex = findMatchingClosingBracket2(text, i);
        return outerClosingIndex === -1 || outerClosingIndex > closingIndex;
      })()
    );
    if (hasOuterBracketTakingPrecedence) {
      return null;
    }
    return isImage ? `${beforeLink}![${linkText}](${placeholderProtocol})` : `${beforeLink}[${linkText}](${placeholderProtocol})`;
  }
  return null;
};
var handleIncompleteLinksAndImages2 = (text, target = "all") => {
  const lastParenIndex = text.lastIndexOf("](");
  if (lastParenIndex !== -1 && !isInsideCodeBlock2(text, lastParenIndex)) {
    const result = handleIncompleteUrl2(text, lastParenIndex, target);
    if (result !== null) {
      return result;
    }
  }
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === "[" && (!isInsideCodeBlock2(text, i) || isInsideUnclosedInlineCode(text, i))) {
      const result = handleIncompleteTextLink(text, i, target);
      if (result !== null) {
        return result;
      }
    }
  }
  return text;
};
var handleIncompleteStrikethrough2 = (text) => {
  const strikethroughMatch = text.match(/(~~)([^~]*?)$/);
  if (strikethroughMatch) {
    const contentAfterMarker = strikethroughMatch[2];
    if (!contentAfterMarker || whitespaceOrMarkersPattern2.test(contentAfterMarker)) {
      return text;
    }
    const markerIndex2 = text.lastIndexOf(strikethroughMatch[1]);
    if (isInsideCodeBlock2(text, markerIndex2) || isWithinCompleteInlineCode2(text, markerIndex2)) {
      return text;
    }
    return (text.match(/~~/g)?.length ?? 0) % 2 === 1 ? `${text}~~` : text;
  }
  const halfCompleteMatch = text.match(halfCompleteTildePattern2);
  if (!halfCompleteMatch) {
    return text;
  }
  const markerIndex = text.lastIndexOf(halfCompleteMatch[1]);
  if (isInsideCodeBlock2(text, markerIndex) || isWithinCompleteInlineCode2(text, markerIndex)) {
    return text;
  }
  return (text.match(/~~/g)?.length ?? 0) % 2 === 1 ? `${text}~` : text;
};
var escapeSingleTildes = (text) => {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char !== "~") {
      result += char;
      continue;
    }
    const prevChar = i > 0 ? text[i - 1] : "";
    const nextChar = i < text.length - 1 ? text[i + 1] : "";
    const isSingleTilde = prevChar !== "~" && nextChar !== "~";
    const shouldEscape = isSingleTilde && prevChar !== "\\" && prevChar !== "" && nextChar !== "" && isWordCharacter(prevChar) && isWordCharacter(nextChar) && !isWithinCompleteInlineCode2(text, i) && !isWithinMathBlock2(text, i);
    result += shouldEscape ? "\\~" : "~";
  }
  return result;
};
var stripTrailingIncompleteHtmlTag = (text) => {
  const trimmedText = text.trimEnd();
  const lastOpeningBracketIndex = trimmedText.lastIndexOf("<");
  if (lastOpeningBracketIndex === -1 || trimmedText.includes(">", lastOpeningBracketIndex)) {
    return text;
  }
  if (isWithinCompleteInlineCode2(trimmedText, lastOpeningBracketIndex) || isWithinFencedCodeBlock(trimmedText, lastOpeningBracketIndex) || isWithinMathBlock2(trimmedText, lastOpeningBracketIndex)) {
    return text;
  }
  const candidate = trimmedText.slice(lastOpeningBracketIndex);
  if (!/^<\/?[A-Za-z][A-Za-z0-9-]*(?:\s+[^<>]*)?$/.test(candidate)) {
    return text;
  }
  return trimmedText.slice(0, lastOpeningBracketIndex).trimEnd();
};
var isWithinFootnoteRef = (text, position) => {
  let openBracketPos = -1;
  let caretPos = -1;
  for (let i = position; i >= 0; i--) {
    if (text[i] === "]") return false;
    if (text[i] === "^" && caretPos === -1) caretPos = i;
    if (text[i] === "[") {
      openBracketPos = i;
      break;
    }
  }
  if (openBracketPos !== -1 && caretPos === openBracketPos + 1 && position >= caretPos) {
    for (let i = position + 1; i < text.length; i++) {
      if (text[i] === "]") return true;
      if (text[i] === "[" || text[i] === "\n") break;
    }
  }
  return false;
};
var replaceIncompleteFootnoteRefs = (line) => {
  const matches = line.matchAll(/\[\^[^\]\s,]*/g);
  let result = "";
  let lastIndex = 0;
  let foundMatch = false;
  for (const match of matches) {
    if (match.index === void 0) {
      continue;
    }
    foundMatch = true;
    const start = match.index;
    const end = start + match[0].length;
    result += line.slice(lastIndex, start);
    result += line[end] === "]" ? match[0] : "[^streamdown:footnote]";
    lastIndex = end;
  }
  return foundMatch ? result + line.slice(lastIndex) : line;
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

export { IncompleteMarkdownParser, index_default as default, parseIncompleteMarkdown };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map