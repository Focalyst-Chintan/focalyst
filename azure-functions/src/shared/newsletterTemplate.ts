export interface NewsletterCopy {
  subject: string;
  preheader: string;
  heroHeadlineHtml: string;
  heroSubtitle: string;
  introParagraph: string;
  featureTitle: string;
  featureBody: string;
  proTip: string;
  replyQuestion: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Allows only safe <i>...</i> emphasis inside the hero headline while escaping everything else.
 */
function sanitizeHeroHeadlineHtml(raw: string): string {
  const escaped = escapeHtml(raw);
  return escaped
    .replace(/&lt;i&gt;/gi, '<i>')
    .replace(/&lt;\/i&gt;/gi, '</i>');
}

const FOCALYST_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{subject}}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<style>
  body { margin: 0; padding: 0; background-color: #EEF2F8; -webkit-text-size-adjust: 100%; }
  table { border-collapse: separate; border-spacing: 0; }
  a { color: #1951FC; }
  @media only screen and (max-width: 620px) {
    .px { padding-left: 16px !important; padding-right: 16px !important; }
    .card-pad { padding: 22px 20px !important; }
    .hero-pad { padding: 36px 24px !important; }
    .h1 { font-size: 38px !important; line-height: 42px !important; }
    .h2 { font-size: 30px !important; line-height: 34px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#EEF2F8;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#EEF2F8;font-size:1px;line-height:1px;">{{preheader}}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#EEF2F8" style="background-color:#EEF2F8;border-collapse:separate;border-spacing:0;">
  <tr>
    <td align="center" style="padding:28px 12px 44px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:separate;border-spacing:0;">
        <tr>
          <td align="center" style="padding:8px 0 28px 0;font-family:'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:4px;color:#0B1020;">FOCALYST</td>
        </tr>
        <tr>
          <td bgcolor="#0B2CB1" class="hero-pad" style="background-color:#0B2CB1;border-radius:24px;padding:44px 36px;">
            <div style="font-family:'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#CBE9FD;padding-bottom:14px;">Weekly Focus Spotlight</div>
            <h1 class="h1" style="margin:0;font-family:'Instrument Serif',Georgia,'Times New Roman',serif;font-weight:400;font-size:46px;line-height:50px;letter-spacing:-0.5px;color:#FFFFFF;">{{{heroHeadlineHtml}}}</h1>
            <div style="font-family:'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:26px;color:#E2EFFF;padding-top:16px;">{{heroSubtitle}}</div>
          </td>
        </tr>
        <tr>
          <td class="px" style="padding:36px 8px 0 8px;font-family:'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:27px;color:#334155;">
            <p style="margin:0 0 18px 0;font-weight:600;color:#0B1020;">Hey there,</p>
            <p style="margin:0;">{{introParagraph}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 0 0 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0;">
              <tr>
                <td bgcolor="#FFFFFF" class="card-pad" style="background-color:#FFFFFF;border-radius:18px;padding:24px;font-family:'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
                  <div style="font-size:18px;line-height:26px;font-weight:600;color:#0B1020;letter-spacing:-0.2px;">
                    <span style="color:#1951FC;font-weight:700;">Spotlight:</span> {{featureTitle}}
                  </div>
                  <div style="padding-top:10px;font-size:15px;line-height:25px;color:#475569;">{{featureBody}}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 0 0 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0;">
              <tr>
                <td bgcolor="#DFE9FF" class="card-pad" style="background-color:#DFE9FF;border-radius:18px;padding:22px 24px;font-family:'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
                  <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#0B2CB1;padding-bottom:8px;">Quick workflow tip</div>
                  <div style="font-size:15px;line-height:24px;color:#1E293B;">{{proTip}}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:32px 0 0 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0;">
              <tr>
                <td align="center" bgcolor="#1951FC" style="background-color:#1951FC;border-radius:14px;">
                  <a href="https://focalyst.online/app" style="display:inline-block;padding:15px 36px;font-family:'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;line-height:20px;color:#FFFFFF;text-decoration:none;border-radius:14px;">Unlock Focalyst Pro</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td class="px" style="padding:40px 8px 0 8px;">
            <h2 class="h2" style="margin:0;font-family:'Instrument Serif',Georgia,'Times New Roman',serif;font-weight:400;font-size:34px;line-height:38px;letter-spacing:-0.5px;color:#0B1020;">
              Quick <i style="color:#1951FC;">question</i> for you.
            </h2>
            <p style="margin:12px 0 0 0;font-family:'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:27px;color:#334155;">
              {{replyQuestion}} Hit reply—I read and respond to every message personally.
            </p>
          </td>
        </tr>
        <tr>
          <td class="px" style="padding:32px 8px 0 8px;">
            <div style="font-family:'Instrument Serif',Georgia,'Times New Roman',serif;font-style:italic;font-size:28px;line-height:32px;color:#0B1020;">Stay focused,</div>
            <div style="font-family:'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;line-height:22px;color:#0B1020;padding-top:14px;">Sohan</div>
            <div style="font-family:'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:18px;color:#64748B;padding-top:2px;">Founder, Focalyst</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 0 0 0;"><div style="border-top:1px solid #D5DFEE;font-size:0;line-height:0;height:1px;">&nbsp;</div></td>
        </tr>
        <tr>
          <td align="center" style="padding:24px 8px 0 8px;font-family:'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:22px;color:#64748B;">
            <div style="font-size:12px;font-weight:700;letter-spacing:4px;color:#0B1020;padding-bottom:8px;">FOCALYST</div>
            <a href="https://focalyst.online/app" style="color:#1951FC;text-decoration:none;font-weight:500;">focalyst.online/app</a><br>
            Focalyst by Chintan, Kolkata, India<br>
            <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

export function renderNewsletterHtml(copy: NewsletterCopy): string {
  return FOCALYST_TEMPLATE
    .replace('{{subject}}', escapeHtml(copy.subject))
    .replace('{{preheader}}', escapeHtml(copy.preheader))
    .replace('{{{heroHeadlineHtml}}}', sanitizeHeroHeadlineHtml(copy.heroHeadlineHtml))
    .replace('{{heroSubtitle}}', escapeHtml(copy.heroSubtitle))
    .replace('{{introParagraph}}', escapeHtml(copy.introParagraph))
    .replace('{{featureTitle}}', escapeHtml(copy.featureTitle))
    .replace('{{featureBody}}', escapeHtml(copy.featureBody))
    .replace('{{proTip}}', escapeHtml(copy.proTip))
    .replace('{{replyQuestion}}', escapeHtml(copy.replyQuestion));
}
