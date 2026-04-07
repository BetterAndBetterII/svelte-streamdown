"use client";

// ../../shared/plugin-core/math.ts
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
function createMathPlugin(options = {}) {
  return {
    name: "katex",
    type: "math",
    remarkPlugin: [remarkMath, { singleDollarTextMath: options.singleDollarTextMath ?? false }],
    rehypePlugin: [rehypeKatex, { errorColor: options.errorColor ?? "var(--color-muted-foreground)" }],
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
