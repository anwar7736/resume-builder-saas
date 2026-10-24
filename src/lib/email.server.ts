type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for email delivery.`);
  return value;
}

export async function sendEmail({ to, subject, text, html, replyTo }: OutboundEmail) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requiredEnvironment("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: requiredEnvironment("EMAIL_FROM"),
      to: [to],
      subject,
      text,
      ...(html ? { html } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Email provider returned HTTP ${response.status}${errorText ? `: ${errorText}` : "."}`);
  }
}