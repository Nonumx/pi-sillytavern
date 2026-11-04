export const HTML_FRAME_HEIGHT_MESSAGE = 'simple-tavern-html-height'

const HTML_MARKERS = /<!doctype\s+html|<html\b|<head\b|<body\b/i

const FRAME_SCRIPT = `
<script>
  (() => {
    const sendHeight = () => parent.postMessage({ type: '${HTML_FRAME_HEIGHT_MESSAGE}', height: document.documentElement.scrollHeight }, '*');
    new ResizeObserver(sendHeight).observe(document.documentElement);
    addEventListener('load', sendHeight);
    sendHeight();
  })();
</script>`

export function isHtmlDocumentCodeBlock(content: string): boolean {
  return HTML_MARKERS.test(content)
}

export function renderHtmlInIframe(content: string): string {
  const srcdoc = /<\/body\s*>/i.test(content)
    ? content.replace(/<\/body\s*>/i, `${FRAME_SCRIPT}</body>`)
    : `${content}${FRAME_SCRIPT}`

  return `<iframe class="message-html-frame" sandbox="allow-scripts" srcdoc="${escapeAttribute(srcdoc)}"></iframe>`
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
