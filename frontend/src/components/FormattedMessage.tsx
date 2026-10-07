import React from 'react';

interface FormattedMessageProps {
  content: string;
  className?: string;
}

export const FormattedMessage: React.FC<FormattedMessageProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Pre-process text to ensure inline numbered lists (e.g. "resume: 1. **Project**: ... 2. **Project**:") get proper line breaks
  let processed = content;

  // Insert double line breaks before numbered list items if they appear inline
  processed = processed.replace(/([:\.\?\!])\s+(\d+\.\s+)/g, "$1\n\n$2");
  processed = processed.replace(/([^\n])\s+(\d+\.\s+\*\*)/g, "$1\n\n$2");

  // Split content into paragraph/list blocks by double or single newlines
  const rawBlocks = processed.split(/\n+/);

  const renderInline = (text: string) => {
    // Regex matches bold (**text**), italic (*text*), code (`code`)
    const tokens = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

    return tokens.map((token, i) => {
      if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
        return (
          <strong key={i} className="font-semibold text-white">
            {token.slice(2, -2)}
          </strong>
        );
      }
      if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
        return (
          <em key={i} className="italic text-slate-300">
            {token.slice(1, -1)}
          </em>
        );
      }
      if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[12px] border border-slate-700/60">
            {token.slice(1, -1)}
          </code>
        );
      }
      return token;
    });
  };

  return (
    <div className={`space-y-3 leading-relaxed ${className}`}>
      {rawBlocks.map((block, idx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Check for numbered list item (e.g. "1. **Title**:")
        const listMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (listMatch) {
          return (
            <div key={idx} className="flex gap-2.5 items-start pl-1 my-2 animate-fade-in">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[11px] font-bold flex items-center justify-center border border-indigo-500/30 mt-0.5">
                {listMatch[1]}
              </span>
              <div className="flex-1 text-slate-200">
                {renderInline(listMatch[2])}
              </div>
            </div>
          );
        }

        // Check for bullet list item (e.g. "- **Title**:")
        const bulletMatch = trimmed.match(/^[-*•]\s+(.*)/);
        if (bulletMatch) {
          return (
            <div key={idx} className="flex gap-2.5 items-start pl-2 my-1.5 animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
              <div className="flex-1 text-slate-200">
                {renderInline(bulletMatch[1])}
              </div>
            </div>
          );
        }

        // Standard paragraph
        return (
          <p key={idx} className="text-slate-200">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

export default FormattedMessage;
