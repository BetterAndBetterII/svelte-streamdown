export const heroTitle = 'Streamdown';
export const heroDescription =
	'A markdown renderer designed for streaming content from AI models. Highly interactive, customizable, and easy to use.';
export const installCommand = 'npm i streamdown';

export const demoMarkdown = `# Streamdown

Streamdown is a **streaming-optimized** Markdown renderer for React. It was designed for AI chat interfaces where content arrives token-by-token, but it works just as well for static content.

Most Markdown renderers re-parse the entire document on every update. Streamdown takes a different approach — it splits content into discrete blocks and only re-renders the block that changed. This means your UI stays fast, even when the response is hundreds of lines long.

## Getting started

Install the package from npm, then drop it into your component tree. It accepts a \`children\` string and handles the rest.

\`\`\`tsx
import { Streamdown } from "streamdown";

const Chat = ({ content }: { content: string }) => (
  <Streamdown animated caret="block">
    {content}
  </Streamdown>
);
\`\`\`

The \`animated\` prop enables a smooth fade-in on new blocks, and \`caret\` renders a blinking cursor at the end of the stream — just like the one you're watching right now.

## Plugin ecosystem

Streamdown ships with optional plugins for common use cases. Each one is a separate package, so you only bundle what you need.

| Plugin | Package | Purpose |
| --- | --- | --- |
| Syntax highlighting | \`@streamdown-svelte/code\` | Shiki-powered code blocks |
| Diagrams | \`@streamdown-svelte/mermaid\` | Mermaid diagram rendering |
| Math | \`@streamdown-svelte/math\` | KaTeX math expressions |
| CJK | \`@streamdown-svelte/cjk\` | CJK line-breaking rules |

For example, the quadratic formula renders beautifully: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

## Why Streamdown?

There are plenty of Markdown renderers out there, but most of them weren't built for streaming. Here's what makes Streamdown different:

- [x] Block-level diffing for *incremental* re-renders
- [x] First-class support for ~~incomplete~~ partial Markdown
- [x] Configurable caret styles and animations
- [ ] World domination

> Streamdown is open-source and Apache-2.0 licensed. Contributions are welcome.
`;

export const usageCode = `import { useChat } from "@ai-sdk/react";
import { Streamdown } from "streamdown";
import { code } from "@streamdown-svelte/code";
import { mermaid } from "@streamdown-svelte/mermaid";
import { math } from "@streamdown-svelte/math";
import { cjk } from "@streamdown-svelte/cjk";
import "katex/dist/katex.min.css";

export default function Chat() {
  const { messages, status } = useChat();

  return (
    <div>
      {messages.map(message => (
        <div key={message.id}>
          {message.role === 'user' ? 'User: ' : 'AI: '}
          {message.parts.map((part, index) =>
            part.type === 'text' ? (
              <Streamdown
                key={index}
                plugins={{ code, mermaid, math, cjk }}
                isAnimating={status === 'streaming'}
              >
                {part.text}
              </Streamdown>
            ) : null,
          )}
        </div>
      ))}
    </div>
  );
}`;

export const usageMarkdown = `\`\`\`tsx
${usageCode}
\`\`\``;

export const brands = [
	'Mintlify',
	'Ollama',
	'Supabase',
	'Trigger.dev',
	'Mastra',
	'Cloudflare',
	'ElevenLabs',
	'Upstash',
	'Langfuse',
	'Dify',
	'Sentry',
	'Moonshot AI',
	'AWS',
	'Google Cloud',
	'Hugging Face'
] as const;

export const featureCards = [
	{
		id: 'typography',
		title: 'Typography & GFM',
		description:
			'Built-in <a href="/playground">typography</a> for headings, lists, and code blocks. <a href="/playground">GitHub Flavored Markdown</a> adds tables, task lists, strikethrough, and autolinks.'
	},
	{
		id: 'streaming',
		title: 'Streaming experience',
		description:
			'Built-in <a href="#demo">caret indicators</a> show users content is generating. Unterminated block styling and <a href="#demo">animations</a> make partial Markdown look polished while tokens are still arriving.'
	},
	{
		id: 'code',
		title: 'Interactive code blocks',
		description:
			'<a href="/playground">Shiki-powered</a> syntax highlighting with copy and download controls. Streamdown supports language detection, line numbers, and custom renderers for rich fenced blocks.'
	},
	{
		id: 'plugins',
		title: 'Math, diagrams & CJK',
		description:
			'LaTeX math through KaTeX, interactive Mermaid diagrams with fullscreen viewing, and <a href="/playground?fixture=15-composite-playground.md">CJK support</a> for correct ideographic punctuation.'
	},
	{
		id: 'security',
		title: 'Security & link safety',
		description:
			'Security hardening blocks images and links from unexpected origins. URL policy, safe HTML handling, and controlled embeds keep streamed content predictable.'
	},
	{
		id: 'customization',
		title: 'Fully customizable',
		description:
			'Override any element with custom Svelte components, apply your own styles, and fine-tune behavior through plugins and configuration without forking the renderer.'
	}
] as const;

export const templates = [
	{
		title: 'Next.js Chatbot Template',
		description:
			'A free, open-source template that helps you dive right into building powerful chatbot applications.',
		link: 'https://github.com/vercel/ai-chatbot',
		image: '/home/nextjs-chatbot-template.png'
	},
	{
		title: 'AI Elements',
		description: 'A collection of UI elements for building AI-powered applications.',
		link: 'https://elements.ai-sdk.dev/',
		image: '/home/ai-elements.png'
	},
	{
		title: 'Vibe Coding Platform',
		description: 'An end to end text-to-app coding platform.',
		link: 'https://oss-vibe-coding-platform.vercel.app/',
		image: '/home/vibe-coding-platform.png'
	}
] as const;
