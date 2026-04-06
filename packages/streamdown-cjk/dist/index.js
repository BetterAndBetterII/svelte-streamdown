"use client";

// ../../src/lib/plugins/cjk-shared.ts
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkCjkFriendlyGfmStrikethrough from "remark-cjk-friendly-gfm-strikethrough";
import { visit } from "unist-util-visit";
var CJK_AUTOLINK_BOUNDARY_CHARS = /* @__PURE__ */ new Set([
  "\u3002",
  "\uFF0E",
  "\uFF0C",
  "\u3001",
  "\uFF1F",
  "\uFF01",
  "\uFF1A",
  "\uFF1B",
  "\uFF08",
  "\uFF09",
  "\u3010",
  "\u3011",
  "\u300C",
  "\u300D",
  "\u300E",
  "\u300F",
  "\u3008",
  "\u3009",
  "\u300A",
  "\u300B"
]);
var AUTOLINK_PREFIX_PATTERN = /^(https?:\/\/|mailto:|www\.)/i;
var isAutolinkLiteral = (node) => {
  if (node.children.length !== 1) {
    return false;
  }
  const child = node.children[0];
  return child.type === "text" && child.value === node.url;
};
var findCjkBoundaryIndex = (url) => {
  let index = 0;
  for (const char of url) {
    if (CJK_AUTOLINK_BOUNDARY_CHARS.has(char)) {
      return index;
    }
    index += char.length;
  }
  return null;
};
var buildAutolink = (url, source) => ({
  ...source,
  url,
  children: [
    {
      type: "text",
      value: url
    }
  ]
});
var buildTrailingText = (value) => ({
  type: "text",
  value
});
var remarkCjkAutolinkBoundary = () => (tree) => {
  visit(tree, "link", (node, index, parent) => {
    if (!parent || typeof index !== "number") {
      return;
    }
    if (!isAutolinkLiteral(node) || !AUTOLINK_PREFIX_PATTERN.test(node.url)) {
      return;
    }
    const boundaryIndex = findCjkBoundaryIndex(node.url);
    if (boundaryIndex === null || boundaryIndex === 0) {
      return;
    }
    const trimmedUrl = node.url.slice(0, boundaryIndex);
    const trailing = node.url.slice(boundaryIndex);
    parent.children.splice(index, 1, buildAutolink(trimmedUrl, node), buildTrailingText(trailing));
    return index + 1;
  });
};
function createCjkPlugin() {
  const remarkPluginsBefore = [remarkCjkFriendly];
  const remarkPluginsAfter = [
    remarkCjkAutolinkBoundary,
    remarkCjkFriendlyGfmStrikethrough
  ];
  return {
    name: "cjk",
    type: "cjk",
    remarkPluginsBefore,
    remarkPluginsAfter,
    remarkPlugins: [...remarkPluginsBefore, ...remarkPluginsAfter]
  };
}
var cjk = createCjkPlugin();
export {
  cjk,
  createCjkPlugin
};
