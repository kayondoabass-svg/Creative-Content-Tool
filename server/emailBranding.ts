// Keep this public PNG URL stable for email clients that do not support SVG.
const BRAND_LOGO_URL = "https://www.brightboardapp.com/brand-logo.png";
const MARKER = 'data-brightboard-email-brand="true"';

export function withBrightBoardBranding(html: string): string {
  if (html.includes(MARKER)) return html;
  const header = `<div ${MARKER} style="background:#ffffff;text-align:center;padding:24px 16px;border-bottom:1px solid #e5eeeb;">
    <a href="https://www.brightboardapp.com" style="text-decoration:none;">
      <img src="${BRAND_LOGO_URL}" alt="BrightBoard" width="190" style="display:block;width:190px;max-width:100%;height:auto;margin:0 auto;border:0;" />
    </a>
  </div>`;
  // Support complete documents as well as the existing fragment templates.
  if (/<body\b[^>]*>/i.test(html)) {
    return html.replace(/<body\b[^>]*>/i, (body) => body + header);
  }
  return header + html;
}
