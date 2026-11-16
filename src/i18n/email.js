// Text of the one confirmation email (double opt-in), in each site language.
// Same rules as src/i18n/ui/*.json: write English first, keep every {placeholder},
// run the back-translation check (docs/translation/). tests/subscribe.test.js checks
// that every language has every key and the same placeholders.
export const EMAIL_TEXT = {
  en: {
    subject: "Confirm your CarePayNY email updates",
    intro: "Someone asked to get free email updates from CarePayNY at this address. The updates are about New York home care pay rules, CDPAP and training.",
    action: "To start getting the updates, click this link:",
    button: "Confirm my email updates",
    expires: "The link works for 48 hours.",
    ignore: "If you did not ask for this, you don't need to do anything. We won't email you again.",
    footer: "CarePayNY is a free, independent website. It is not part of any government agency."
  },
  es: {
    subject: "Confirme sus actualizaciones por correo electrónico de CarePayNY",
    intro: "Alguien pidió recibir actualizaciones gratis de CarePayNY por correo electrónico en esta dirección. Las actualizaciones son sobre las reglas de pago del cuidado en el hogar en Nueva York, CDPAP y la capacitación.",
    action: "Para empezar a recibir las actualizaciones, haga clic en este enlace:",
    button: "Confirmar mis actualizaciones por correo electrónico",
    expires: "El enlace funciona por 48 horas.",
    ignore: "Si usted no pidió esto, no tiene que hacer nada. No le volveremos a escribir.",
    footer: "CarePayNY es un sitio web gratis e independiente. No es parte de ninguna agencia del gobierno."
  },
  zh: {
    subject: "确认订阅 CarePayNY 电子邮件更新",
    intro: "有人用这个电子邮件地址申请接收 CarePayNY 的免费电子邮件更新。更新内容是关于纽约州居家护理工资规定、CDPAP 和培训。",
    action: "如果要开始接收更新，请点击这个链接：",
    button: "确认接收电子邮件更新",
    expires: "这个链接在48小时内有效。",
    ignore: "如果您没有申请，不需要做任何事。我们不会再给您发邮件。",
    footer: "CarePayNY 是一个免费的独立网站，不属于任何政府机构。"
  },
  ru: {
    subject: "Подтвердите подписку на новости CarePayNY",
    intro: "Кто-то попросил присылать на этот адрес бесплатные новости от CarePayNY по электронной почте. Новости — о правилах оплаты ухода на дому в штате Нью-Йорк, о CDPAP и об обучении.",
    action: "Чтобы начать получать новости, нажмите на эту ссылку:",
    button: "Подтвердить подписку",
    expires: "Ссылка работает 48 часов.",
    ignore: "Если вы не просили об этом, ничего делать не нужно. Мы больше не будем вам писать.",
    footer: "CarePayNY — бесплатный независимый сайт. Он не относится ни к одному государственному учреждению."
  }
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Builds the confirmation email for one language. confirmUrl is the signed link.
export function confirmationEmail(lang, confirmUrl) {
  const T = EMAIL_TEXT[lang] ?? EMAIL_TEXT.en;
  const html = `<!doctype html><html lang="${lang}"><body style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#111;max-width:560px;margin:0 auto;padding:16px">
<p>${esc(T.intro)}</p>
<p>${esc(T.action)}</p>
<p><a href="${esc(confirmUrl)}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">${esc(T.button)}</a></p>
<p style="word-break:break-all;font-size:14px"><a href="${esc(confirmUrl)}">${esc(confirmUrl)}</a></p>
<p>${esc(T.expires)}</p>
<p>${esc(T.ignore)}</p>
<p style="font-size:13px;color:#555">${esc(T.footer)}</p>
</body></html>`;
  const text = [T.intro, "", T.action, confirmUrl, "", T.expires, T.ignore, "", T.footer].join("\n");
  return { subject: T.subject, html, text };
}
