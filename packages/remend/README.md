# remend

Streaming-friendly incomplete Markdown repair extracted from the `svelte-streamdown` workspace.

## Installation

```bash
pnpm add remend
```

## Usage

```ts
import remend, { isWordChar, type RemendHandler } from 'remend';
import { findMatchingOpeningBracket } from 'remend/utils';

const repaired = remend('Hello **world');
const isWord = isWordChar('a');
const bracketIndex = findMatchingOpeningBracket('[abc]', 4);

const handler: RemendHandler = {
  name: 'demo',
  handle: (text) => text
};
```

This package exposes the standalone parser contract used by the Streamdown-style workspace split, including custom handlers and utility helpers.
