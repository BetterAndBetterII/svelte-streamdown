"use client";

// index.ts
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
function createMathPlugin(options = {}) {
  const remarkMathPlugin = [
    remarkMath,
    { singleDollarTextMath: options.singleDollarTextMath ?? false }
  ];
  const rehypeKatexPlugin = [
    rehypeKatex,
    { errorColor: options.errorColor ?? "var(--color-muted-foreground)" }
  ];
  return {
    name: "katex",
    type: "math",
    remarkPlugin: remarkMathPlugin,
    rehypePlugin: rehypeKatexPlugin,
    getStyles() {
      return "katex/dist/katex.min.css";
    }
  };
}
var math = createMathPlugin();
export {
  createMathPlugin,
  math
};
