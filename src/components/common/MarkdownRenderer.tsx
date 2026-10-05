import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Parses inline formatting:
 * - Bold + Italic: ***text*** or ___text___
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Inline code: `code`
 * - Strikethrough: ~~text~~
 */
function renderInline(text: string): React.ReactNode[] {
  if (!text) return [];

  // Regex tokenizing inline patterns
  const tokenRegex = /(\*\*\*[\s\S]+?\*\*\*|___[\s\S]+?___|\*\*[\s\S]+?\*\*|__[\s\S]+?__|(?<!\w)\*[\s\S]+?\*(?!\w)|(?<!\w)_[\s\S]+?_(?!\w)|`[^`]+`|~~[\s\S]+?~~)/g;

  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold + Italic: ***text***
    if ((part.startsWith('***') && part.endsWith('***')) || (part.startsWith('___') && part.endsWith('___'))) {
      const inner = part.slice(3, -3);
      return (
        <strong key={index} className="font-semibold text-main">
          <em className="italic">{renderInline(inner)}</em>
        </strong>
      );
    }

    // Bold: **text**
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      const inner = part.slice(2, -2);
      return (
        <strong key={index} className="font-semibold text-main">
          {renderInline(inner)}
        </strong>
      );
    }

    // Italic: *text* or _text_
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      const inner = part.slice(1, -1);
      return (
        <em key={index} className="italic text-main">
          {renderInline(inner)}
        </em>
      );
    }

    // Inline code: `code`
    if (part.startsWith('`') && part.endsWith('`')) {
      const inner = part.slice(1, -1);
      return (
        <code
          key={index}
          className="font-mono text-[13px] bg-surface-hover px-1.5 py-0.5 rounded border border-theme-subtle text-accent"
        >
          {inner}
        </code>
      );
    }

    // Strikethrough: ~~text~~
    if (part.startsWith('~~') && part.endsWith('~~')) {
      const inner = part.slice(2, -2);
      return (
        <del key={index} className="line-through text-muted">
          {renderInline(inner)}
        </del>
      );
    }

    return part;
  }).filter(Boolean);
}

/**
 * Tries to parse and render JSON responses (e.g. from "Extract Atomic Ideas") gracefully
 */
function tryRenderStructuredJson(raw: string): React.ReactNode | null {
  const trimmed = raw.trim();
  if (!(trimmed.startsWith('{') && trimmed.endsWith('}')) && !(trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    return null;
  }

  try {
    const data = JSON.parse(trimmed);
    if (typeof data !== 'object' || data === null) return null;

    // Check if it's an extraction object { ideas: [], observations: [], questions: [] }
    if (data.ideas || data.observations || data.questions || data.quotes) {
      return (
        <div className="space-y-4 my-2">
          {data.ideas && Array.isArray(data.ideas) && data.ideas.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-mono uppercase tracking-wider text-muted font-semibold">
                Atomic Ideas ({data.ideas.length})
              </h4>
              <ul className="space-y-1.5 pl-2 border-l-2 border-theme-subtle">
                {data.ideas.map((idea: string, i: number) => (
                  <li key={i} className="text-sm font-serif text-main leading-relaxed">
                    {renderInline(idea)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.observations && Array.isArray(data.observations) && data.observations.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-mono uppercase tracking-wider text-muted font-semibold">
                Observations ({data.observations.length})
              </h4>
              <ul className="space-y-1.5 pl-2 border-l-2 border-theme-subtle">
                {data.observations.map((obs: string, i: number) => (
                  <li key={i} className="text-sm font-serif text-main leading-relaxed">
                    {renderInline(obs)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.questions && Array.isArray(data.questions) && data.questions.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-mono uppercase tracking-wider text-muted font-semibold">
                Open Questions Raised ({data.questions.length})
              </h4>
              <ul className="space-y-1.5 pl-2 border-l-2 border-theme-subtle">
                {data.questions.map((q: string, i: number) => (
                  <li key={i} className="text-sm font-serif text-main leading-relaxed italic">
                    {renderInline(q)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.quotes && Array.isArray(data.quotes) && data.quotes.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-mono uppercase tracking-wider text-muted font-semibold">
                Direct Quotes ({data.quotes.length})
              </h4>
              <ul className="space-y-1.5 pl-2 border-l-2 border-theme-subtle">
                {data.quotes.map((quote: string, i: number) => (
                  <li key={i} className="text-sm font-serif text-main leading-relaxed italic">
                    “{renderInline(quote)}”
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
  } catch {
    return null;
  }
  return null;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // 1. Try structured JSON extraction rendering first
  const structuredJson = tryRenderStructuredJson(content);
  if (structuredJson) {
    return <div className={`markdown-content ${className}`}>{structuredJson}</div>;
  }

  // 2. Parse Markdown blocks
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  const flushList = (keyPrefix: string) => {
    if (!currentList) return;
    if (currentList.type === 'ul') {
      blocks.push(
        <ul key={`${keyPrefix}-ul`} className="list-disc list-outside ml-5 space-y-1.5 my-2.5">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="text-sm font-serif text-main leading-relaxed pl-1">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
    } else {
      blocks.push(
        <ol key={`${keyPrefix}-ol`} className="list-decimal list-outside ml-5 space-y-1.5 my-2.5">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="text-sm font-serif text-main leading-relaxed pl-1">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  };

  const flushCodeBlock = (keyPrefix: string) => {
    if (!inCodeBlock) return;
    blocks.push(
      <pre
        key={`${keyPrefix}-code`}
        className="p-3 bg-surface-hover rounded-md border border-theme-subtle overflow-x-auto my-3 font-mono text-xs text-main leading-relaxed"
      >
        <code>{codeBlockLines.join('\n')}</code>
      </pre>
    );
    inCodeBlock = false;
    codeBlockLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block toggle (```)
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock(`block-${i}`);
      } else {
        flushList(`flush-${i}`);
        inCodeBlock = true;
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Blank line
    if (!trimmed) {
      flushList(`blank-${i}`);
      continue;
    }

    // Heading 1 (# ...)
    if (/^#\s+/.test(trimmed)) {
      flushList(`h1-${i}`);
      const text = trimmed.replace(/^#\s+/, '');
      blocks.push(
        <h2 key={`h1-${i}`} className="text-lg font-serif font-semibold text-main tracking-tight mt-5 mb-2 border-b border-theme-subtle pb-1">
          {renderInline(text)}
        </h2>
      );
      continue;
    }

    // Heading 2 (## ...)
    if (/^##\s+/.test(trimmed)) {
      flushList(`h2-${i}`);
      const text = trimmed.replace(/^##\s+/, '');
      blocks.push(
        <h3 key={`h2-${i}`} className="text-base font-serif font-semibold text-main tracking-tight mt-4 mb-2">
          {renderInline(text)}
        </h3>
      );
      continue;
    }

    // Heading 3 (### ...)
    if (/^###\s+/.test(trimmed)) {
      flushList(`h3-${i}`);
      const text = trimmed.replace(/^###\s+/, '');
      blocks.push(
        <h4 key={`h3-${i}`} className="text-xs font-mono uppercase tracking-wider text-muted font-semibold mt-4 mb-1.5">
          {renderInline(text)}
        </h4>
      );
      continue;
    }

    // Heading 4 (#### ...)
    if (/^####\s+/.test(trimmed)) {
      flushList(`h4-${i}`);
      const text = trimmed.replace(/^####\s+/, '');
      blocks.push(
        <h5 key={`h4-${i}`} className="text-xs font-mono uppercase tracking-wider text-muted font-medium mt-3 mb-1">
          {renderInline(text)}
        </h5>
      );
      continue;
    }

    // Blockquote (> ...)
    if (/^>\s+/.test(trimmed)) {
      flushList(`bq-${i}`);
      const text = trimmed.replace(/^>\s+/, '');
      blocks.push(
        <blockquote key={`bq-${i}`} className="border-l-2 border-theme-subtle pl-3.5 my-2.5 italic text-muted font-serif text-sm leading-relaxed">
          {renderInline(text)}
        </blockquote>
      );
      continue;
    }

    // Horizontal Rule (--- or ***)
    if (/^(---|___|\*\*\*)$/.test(trimmed)) {
      flushList(`hr-${i}`);
      blocks.push(<hr key={`hr-${i}`} className="border-t border-theme-subtle my-3" />);
      continue;
    }

    // Unordered List (- ... or * ... or • ...)
    if (/^[-*•]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*•]\s+/, '');
      if (!currentList || currentList.type !== 'ul') {
        flushList(`ul-start-${i}`);
        currentList = { type: 'ul', items: [itemText] };
      } else {
        currentList.items.push(itemText);
      }
      continue;
    }

    // Ordered List (1. ... or 2. ...)
    if (/^\d+\.\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^\d+\.\s+/, '');
      if (!currentList || currentList.type !== 'ol') {
        flushList(`ol-start-${i}`);
        currentList = { type: 'ol', items: [itemText] };
      } else {
        currentList.items.push(itemText);
      }
      continue;
    }

    // Regular paragraph
    flushList(`p-flush-${i}`);
    blocks.push(
      <p key={`p-${i}`} className="text-sm font-serif leading-relaxed text-main my-2">
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList('final-list');
  flushCodeBlock('final-code');

  return <div className={`markdown-content ${className}`}>{blocks}</div>;
};
