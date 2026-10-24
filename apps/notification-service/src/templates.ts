// ─── Simple HTML email templates for Oferta Suksesi ──────────────────────────
// Replace with MJML later if needed. For now, clean inline HTML.

const BRAND_COLOR = '#2563eb';
const SITE_NAME = 'Oferta Suksesi';

/** Escape user-supplied strings before interpolating into HTML */
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7">
    <div style="background:${BRAND_COLOR};padding:20px 24px">
      <h1 style="margin:0;color:#fff;font-size:20px">${SITE_NAME}</h1>
    </div>
    <div style="padding:24px 24px 32px">
      ${content}
    </div>
    <div style="padding:16px 24px;background:#fafafa;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;text-align:center">
      &copy; ${new Date().getFullYear()} ${SITE_NAME}. Të gjitha të drejtat e rezervuara.
    </div>
  </div>
</body>
</html>`;
}

function button(text: string, url: string): string {
  return `<a href="${esc(url)}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:6px;font-weight:600">${esc(text)}</a>`;
}

// ─── Template functions ──────────────────────────────────────────────────────

export function welcomeEmail(name: string, appUrl: string) {
  return {
    subject: `Mirë se vini në ${SITE_NAME}!`,
    html: layout(`
      <h2 style="margin:0 0 12px;color:#18181b">Mirë se vini, ${esc(name)}!</h2>
      <p style="color:#3f3f46;line-height:1.6">Faleminderit që u regjistruat në ${SITE_NAME}. Tani mund të postoni shpallje dhe të kërkoni oferta.</p>
      ${button('Shiko shpalljet', appUrl)}
    `),
  };
}

export function passwordResetEmail(resetUrl: string) {
  return {
    subject: `Rivendosni fjalëkalimin — ${SITE_NAME}`,
    html: layout(`
      <h2 style="margin:0 0 12px;color:#18181b">Rivendosni fjalëkalimin</h2>
      <p style="color:#3f3f46;line-height:1.6">Keni kërkuar rivendosjen e fjalëkalimit. Klikoni butonin më poshtë për të vazhduar:</p>
      ${button('Rivendos fjalëkalimin', resetUrl)}
      <p style="color:#71717a;font-size:13px;margin-top:16px">Ky link skadon pas 1 ore. Nëse nuk e keni kërkuar, injoroni këtë email.</p>
    `),
  };
}

export function listingApprovedEmail(title: string, listingUrl: string) {
  return {
    subject: `Shpallja juaj u aprovua — ${title}`,
    html: layout(`
      <h2 style="margin:0 0 12px;color:#18181b">Shpallja u aprovua!</h2>
      <p style="color:#3f3f46;line-height:1.6">Shpallja juaj <strong>"${esc(title)}"</strong> u aprovua dhe tani është e publikuar.</p>
      ${button('Shiko shpalljen', listingUrl)}
    `),
  };
}

export function listingAutoApprovedEmail(title: string, listingUrl: string) {
  return {
    subject: `Shpallja juaj është live — ${title}`,
    html: layout(`
      <h2 style="margin:0 0 12px;color:#18181b">Shpallja u publikua!</h2>
      <p style="color:#3f3f46;line-height:1.6">Shpallja juaj <strong>"${esc(title)}"</strong> u publikua automatikisht.</p>
      ${button('Shiko shpalljen', listingUrl)}
    `),
  };
}

export function listingRejectedEmail(title: string, reason: string) {
  return {
    subject: `Shpallja juaj u refuzua — ${title}`,
    html: layout(`
      <h2 style="margin:0 0 12px;color:#18181b">Shpallja u refuzua</h2>
      <p style="color:#3f3f46;line-height:1.6">Shpallja juaj <strong>"${esc(title)}"</strong> u refuzua.</p>
      <div style="margin:16px 0;padding:12px 16px;background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px">
        <strong style="color:#991b1b">Arsyeja:</strong>
        <span style="color:#3f3f46">${esc(reason)}</span>
      </div>
      <p style="color:#71717a;font-size:13px">Mund ta editoni dhe ta ripostoni shpalljen nga paneli juaj.</p>
    `),
  };
}

export function listingExpiredEmail(title: string, renewUrl: string) {
  return {
    subject: `Shpallja juaj ka skaduar — ${title}`,
    html: layout(`
      <h2 style="margin:0 0 12px;color:#18181b">Shpallja ka skaduar</h2>
      <p style="color:#3f3f46;line-height:1.6">Shpallja juaj <strong>"${esc(title)}"</strong> ka skaduar dhe nuk është më e dukshme.</p>
      ${button('Rinovoni shpalljen', renewUrl)}
    `),
  };
}

export function listingExpiringSoonEmail(title: string, expiresAt: string, renewUrl: string) {
  return {
    subject: `Shpallja juaj po skadon së shpejti — ${title}`,
    html: layout(`
      <h2 style="margin:0 0 12px;color:#18181b">Shpallja po skadon</h2>
      <p style="color:#3f3f46;line-height:1.6">Shpallja juaj <strong>"${esc(title)}"</strong> skadon më <strong>${esc(expiresAt)}</strong>.</p>
      ${button('Rinovoni tani', renewUrl)}
    `),
  };
}

export function savedSearchResultsEmail(searchName: string, count: number, searchUrl: string) {
  return {
    subject: `${count} shpallje të reja për "${searchName}"`,
    html: layout(`
      <h2 style="margin:0 0 12px;color:#18181b">Rezultate të reja!</h2>
      <p style="color:#3f3f46;line-height:1.6">Ka <strong>${count}</strong> shpallje të reja që përputhen me kërkimin tuaj <strong>"${esc(searchName)}"</strong>.</p>
      ${button('Shiko rezultatet', searchUrl)}
    `),
  };
}
