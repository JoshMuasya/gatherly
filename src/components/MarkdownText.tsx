"use client"

import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { cn } from '@/lib/utils';

// Shared renderer for admin-authored rich text (currently form descriptions),
// used by both the builder's live preview and the public form so they always
// look identical.
//
// Security: react-markdown does not render raw HTML unless rehype-raw is
// added — deliberately omitted here, so anything HTML-ish an admin types is
// escaped and shown as literal text rather than executed on the public page.
export function MarkdownText({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('space-y-2 text-sm', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={{
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          del: ({ children }) => <del className="line-through opacity-70">{children}</del>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-primary underline underline-offset-4 hover:no-underline break-words"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          h1: ({ children }) => <h3 className="text-base font-semibold text-foreground">{children}</h3>,
          h2: ({ children }) => <h4 className="text-sm font-semibold text-foreground">{children}</h4>,
          h3: ({ children }) => <h5 className="text-sm font-semibold text-foreground">{children}</h5>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 pl-3 italic">{children}</blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>
          ),
          hr: () => <hr className="my-3" />,
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={typeof src === 'string' ? src : ''} alt={alt ?? ''} className="max-w-full rounded-md" />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
