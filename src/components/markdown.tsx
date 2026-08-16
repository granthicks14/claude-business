import { Fragment, type ReactNode } from "react";

/**
 * A small markdown renderer for AI-written prose.
 *
 * It builds React elements directly rather than setting innerHTML, so model
 * output can never inject markup — and it costs nothing in bundle size next to
 * a full markdown library, which we don't need for headings, lists and emphasis.
 */

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  return <div className={`space-y-3 text-sm leading-relaxed ${className}`}>{renderBlocks(text)}</div>;
}

function renderBlocks(text: string): ReactNode[] {
  const lines = (text ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let code: { lang: string; lines: string[] } | null = null;
  let key = 0;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(
      <p key={key++} className="text-text/90">
        {inline(paragraph.join(" "))}
      </p>,
    );
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={key++} className={`${list.ordered ? "list-decimal" : "list-disc"} pl-5 space-y-1.5 text-text/90 marker:text-faint`}>
        {list.items.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
  };

  for (const line of lines) {
    const fence = line.match(/^```(\w*)/);
    if (fence) {
      if (code) {
        blocks.push(
          <pre key={key++} className="bg-surface-2 border border-border rounded-lg p-3 overflow-x-auto text-[13px] font-mono">
            <code>{code.lines.join("\n")}</code>
          </pre>,
        );
        code = null;
      } else {
        flushAll();
        code = { lang: fence[1], lines: [] };
      }
      continue;
    }
    if (code) {
      code.lines.push(line);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushAll();
      const depth = heading[1].length;
      const size = depth <= 2 ? "text-base font-semibold mt-4" : "text-sm font-semibold mt-3";
      blocks.push(
        <p key={key++} className={`${size} tracking-tight`}>
          {inline(heading[2])}
        </p>,
      );
      continue;
    }

    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || ordered) {
      flushParagraph();
      const isOrdered = !!ordered;
      const content = (bullet ?? ordered)![1];
      if (!list || list.ordered !== isOrdered) {
        flushList();
        list = { ordered: isOrdered, items: [] };
      }
      list.items.push(content);
      continue;
    }

    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      flushAll();
      blocks.push(<hr key={key++} className="border-border" />);
      continue;
    }

    if (!line.trim()) {
      flushAll();
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  if (code) {
    blocks.push(
      <pre key={key++} className="bg-surface-2 border border-border rounded-lg p-3 overflow-x-auto text-[13px] font-mono">
        <code>{code.lines.join("\n")}</code>
      </pre>,
    );
  }
  flushAll();
  return blocks;
}

/** Handles `code`, **bold**, *italic* and bare links. */
function inline(text: string): ReactNode[] {
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*|\bhttps?:\/\/[^\s<>)]+)/g;
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(<Fragment key={key++}>{text.slice(last, match.index)}</Fragment>);
    const token = match[0];

    if (token.startsWith("`")) {
      out.push(
        <code key={key++} className="px-1 py-0.5 rounded bg-surface-2 border border-border text-[0.9em] font-mono">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      out.push(
        <strong key={key++} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*")) {
      out.push(<em key={key++}>{token.slice(1, -1)}</em>);
    } else {
      out.push(
        <a
          key={key++}
          href={token}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-accent-text underline underline-offset-2 break-all hover:opacity-80"
        >
          {token.replace(/^https?:\/\//, "").slice(0, 60)}
        </a>,
      );
    }
    last = match.index + token.length;
  }

  if (last < text.length) out.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  return out;
}
