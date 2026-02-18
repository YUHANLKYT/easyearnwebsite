import { formatUSD } from "@/lib/money";
import { getAppUrl } from "@/lib/app-url";

type WithdrawalProcessedEmailInput = {
  toEmail: string;
  toName: string;
  amountCents: number;
  method: string;
  code: string | null;
  redemptionId: string;
};

type EmailDeliveryResult = {
  sent: boolean;
  reason?: string;
};

type EmailVerificationInput = {
  toEmail: string;
  toName: string;
  token: string;
};

type ResendSendInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();

  if (!apiKey || !from) {
    return null;
  }

  return {
    apiKey,
    from,
  };
}

async function sendViaResend(input: ResendSendInput): Promise<EmailDeliveryResult> {
  const config = getResendConfig();
  if (!config) {
    console.warn("[email] Resend is not configured. Skipping email send.");
    return {
      sent: false,
      reason: "EMAIL_NOT_CONFIGURED",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      console.error("[email] Resend send failed", response.status, bodyText);
      return {
        sent: false,
        reason: "SEND_FAILED",
      };
    }

    return {
      sent: true,
    };
  } catch (error) {
    console.error("[email] Failed to send email via Resend", error);
    return {
      sent: false,
      reason: "SEND_FAILED",
    };
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendWithdrawalProcessedEmail(
  input: WithdrawalProcessedEmailInput,
): Promise<EmailDeliveryResult> {
  const methodLabel = input.method.replaceAll("_", " ");

  const subject = `Easy Earn Withdrawal Processed - ${formatUSD(input.amountCents)}`;
  const text = [
    `Hi ${input.toName},`,
    "",
    "Your Easy Earn withdrawal has been processed.",
    `Amount: ${formatUSD(input.amountCents)}`,
    `Method: ${methodLabel}`,
    input.code ? `CODE: ${input.code}` : "No code is required for this payout method.",
    `Reference ID: ${input.redemptionId}`,
    "",
    "You can also view this in your Store > Recent Redemptions section.",
    "",
    "Easy Earn",
  ].join("\n");

  const html = [
    `<p>Hi ${escapeHtml(input.toName)},</p>`,
    "<p>Your Easy Earn withdrawal has been processed.</p>",
    `<p><strong>Amount:</strong> ${escapeHtml(formatUSD(input.amountCents))}<br/>`,
    `<strong>Method:</strong> ${escapeHtml(methodLabel)}<br/>`,
    `<strong>${input.code ? "CODE" : "Status"}:</strong> ${escapeHtml(input.code ?? "No code required")}<br/>`,
    `<strong>Reference ID:</strong> ${escapeHtml(input.redemptionId)}</p>`,
    "<p>You can also view this in your Store &gt; Recent Redemptions section.</p>",
    "<p>Easy Earn</p>",
  ].join("");

  return sendViaResend({
    to: input.toEmail,
    subject,
    text,
    html,
  });
}

export async function sendEmailVerificationLink(input: EmailVerificationInput): Promise<EmailDeliveryResult> {
  const appUrl = getAppUrl();
  const verifyUrl = `${appUrl}/api/settings/email/verify?token=${encodeURIComponent(input.token)}`;
  const subject = "Verify your Easy Earn email";

  const text = [
    `Hi ${input.toName},`,
    "",
    "Verify your email to secure your Easy Earn account.",
    `Verification link: ${verifyUrl}`,
    "",
    "This link expires in 24 hours.",
    "",
    "Easy Earn",
  ].join("\n");

  const html = [
    `<p>Hi ${escapeHtml(input.toName)},</p>`,
    "<p>Verify your email to secure your Easy Earn account.</p>",
    `<p><a href=\"${escapeHtml(verifyUrl)}\">Verify Email</a></p>`,
    "<p>This link expires in 24 hours.</p>",
    "<p>Easy Earn</p>",
  ].join("");

  return sendViaResend({
    to: input.toEmail,
    subject,
    text,
    html,
  });
}
