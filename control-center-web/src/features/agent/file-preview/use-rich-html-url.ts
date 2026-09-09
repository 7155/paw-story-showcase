import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  richHtmlPreviewChunks,
  richHtmlPreviewUrl,
  type RichHtmlPreviewEnd,
  type RichHtmlPreviewStart,
} from './rich-html';

let transferSequence = 0;

function newTransferId(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === 'function') return randomUUID.call(globalThis.crypto);
  transferSequence += 1;
  return `paw-html-${Date.now().toString(36)}-${transferSequence.toString(36)}`;
}

/**
 * The preview is a dedicated loopback document rather than srcdoc/blob/data.
 * Those local documents inherit the Control Center CSP and therefore cannot
 * execute authored inline scripts. The loopback document has its own
 * preview-only CSP and is still isolated by an opaque iframe sandbox.
 */
export function useRichHtmlPreview(document: string, enabled = true) {
  const frame = useRef<HTMLIFrameElement>(null);
  const sentForGeneration = useRef<string | null>(null);
  const previewKey = useMemo(() => newTransferId(), [document, enabled]);
  const activeGeneration = useRef(previewKey);
  activeGeneration.current = previewKey;
  const url = useMemo(() => (enabled ? richHtmlPreviewUrl() : ''), [enabled]);
  const transfer = useCallback(() => {
    if (!enabled || activeGeneration.current !== previewKey || sentForGeneration.current === previewKey) return;
    const target = frame.current?.contentWindow;
    if (!target) return;
    let chunks: string[];
    try {
      chunks = richHtmlPreviewChunks(document);
      if (!chunks.length) return;
      const transferId = newTransferId();
      const start: RichHtmlPreviewStart = {
        kind: 'paw.html-preview.start',
        transferId,
        chunkCount: chunks.length,
        sourceLength: document.length,
      };
      const end: RichHtmlPreviewEnd = { kind: 'paw.html-preview.end', transferId };
      sentForGeneration.current = previewKey;
      target.postMessage(start, '*');
      chunks.forEach((chunk, chunkIndex) => {
        target.postMessage({ kind: 'paw.html-preview.chunk', transferId, chunkIndex, chunk }, '*');
      });
      target.postMessage(end, '*');
    } catch {
      // A navigation can detach the child between onLoad and the transfer.
      // The next load or source change retries against the current frame.
      if (sentForGeneration.current === previewKey) sentForGeneration.current = null;
    }
  }, [document, enabled, previewKey]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      if (!event.data || typeof event.data !== 'object' || event.data.kind !== 'paw.html-preview.ready') return;
      transfer();
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [transfer]);

  return { frame, key: previewKey, onLoad: transfer, url };
}
