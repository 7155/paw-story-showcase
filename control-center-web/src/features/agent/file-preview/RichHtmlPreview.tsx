import { useMemo } from 'react';
import { RICH_HTML_SANDBOX, richHtmlDocument } from './rich-html';
import { useRichHtmlPreview } from './use-rich-html-url';

export function RichHtmlPreview({ content, title }: { content: string; title: string }) {
  const document = useMemo(() => richHtmlDocument(content), [content]);
  const { frame, key, onLoad, url } = useRichHtmlPreview(document);
  return (
    <iframe
      className="agent-rich-html-preview"
      key={key}
      onLoad={onLoad}
      ref={frame}
      referrerPolicy="no-referrer"
      sandbox={RICH_HTML_SANDBOX}
      src={url}
      title={`${title} 交互预览`}
    />
  );
}
