/** Build one complete document for model-authored and generated HTML results.
 *
 * The source is the deliverable. Do not run it through the generic text/file
 * sanitizer: doing so silently removes charts, forms, scripts, linked styles,
 * and other content the report needs to render. Isolation belongs to the
 * iframe sandbox, while this function only adds host layout guardrails.
 */
export const RICH_HTML_SANDBOX = 'allow-downloads allow-forms allow-modals allow-pointer-lock allow-popups allow-scripts';

// The public showcase serves PAW's isolated preview document as a static asset.
export const RICH_HTML_PREVIEW_PATH = `${import.meta.env.BASE_URL}__paw_lab_preview.html`;
export const RICH_HTML_PREVIEW_CHUNK_SIZE = 0x8000;
export const RICH_HTML_PREVIEW_MAX_CHARS = 16 * 1024 * 1024;
export const RICH_HTML_PREVIEW_MAX_CHUNKS = Math.ceil(
  RICH_HTML_PREVIEW_MAX_CHARS / RICH_HTML_PREVIEW_CHUNK_SIZE,
);

export type RichHtmlPreviewStart = {
  kind: 'paw.html-preview.start';
  transferId: string;
  chunkCount: number;
  sourceLength: number;
};

export type RichHtmlPreviewChunk = {
  kind: 'paw.html-preview.chunk';
  transferId: string;
  chunkIndex: number;
  chunk: string;
};

export type RichHtmlPreviewEnd = {
  kind: 'paw.html-preview.end';
  transferId: string;
};

/** Split by UTF-16 code units; concatenation restores the exact source string. */
export function richHtmlPreviewChunks(source: string): string[] {
  if (source.length > RICH_HTML_PREVIEW_MAX_CHARS) {
    throw new RangeError(`HTML preview source exceeds ${RICH_HTML_PREVIEW_MAX_CHARS} characters`);
  }
  const chunks: string[] = [];
  for (let offset = 0; offset < source.length; offset += RICH_HTML_PREVIEW_CHUNK_SIZE) {
    chunks.push(source.slice(offset, offset + RICH_HTML_PREVIEW_CHUNK_SIZE));
  }
  return chunks;
}

/**
 * Return the short dedicated loopback document URL. The authored HTML travels
 * after navigation through the bound iframe's postMessage channel; putting it
 * in the URL makes large reports fail before the preview document can load.
 */
export function richHtmlPreviewUrl(): string {
  return RICH_HTML_PREVIEW_PATH;
}

export function richHtmlDocument(source: string): string {
  const completeDocument = /(?:<!doctype\s+html\b|<html\b|<head\b|<body\b)/iu.test(source);
  const document = new DOMParser().parseFromString(
    completeDocument ? source : `<main class="paw-html-fragment">${source}</main>`,
    'text/html',
  );

  if (!document.head.querySelector('meta[name="viewport"]')) {
    const viewport = document.createElement('meta');
    viewport.name = 'viewport';
    viewport.content = 'width=device-width, initial-scale=1';
    document.head.prepend(viewport);
  }

  const guardrails = document.createElement('style');
  guardrails.dataset.pawHtmlHost = 'true';
  guardrails.textContent = [
    'html{box-sizing:border-box;min-width:0}',
    '*,*::before,*::after{box-sizing:inherit}',
    'body{min-width:0;margin:0;overflow-wrap:anywhere}',
    '.paw-html-fragment{padding:18px;font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#17231d;background:#fff}',
    'img,video,svg,canvas{max-width:100%}',
    'pre,table{max-width:100%;overflow:auto}',
  ].join('');
  document.head.append(guardrails);
  return `<!doctype html>${document.documentElement.outerHTML}`;
}
