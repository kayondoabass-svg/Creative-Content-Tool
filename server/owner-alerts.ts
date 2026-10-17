// Keep founder-alert content separate from delivery so it can be tested without
// sending mail or connecting to the database.
export interface OwnerAlert {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

function buildAlert(subject: string, fields: [string, string][]): OwnerAlert {
  const dashboard = "https://www.brightboardapp.com/owner-dashboard";
  return {
    subject,
    text: `${subject}\n\n${fields.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\nFounder dashboard: ${dashboard}`,
    html: `<h1>${escapeHtml(subject)}</h1><table>${fields.map(([label, value]) =>
      `<tr><th style="text-align:left;padding:8px;vertical-align:top">${escapeHtml(label)}</th><td style="padding:8px;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`
    ).join("")}</table><p><a href="${dashboard}">Open founder dashboard</a></p>`,
  };
}

export function paymentOwnerAlert(data: {
  orderId: string; amount: number; currency: string; tier: string;
  customerName: string; customerEmail: string; paymentMethod?: string | null;
  confirmationCode?: string | null;
}): OwnerAlert {
  return buildAlert("[BrightBoard] Successful payment", [
    ["Customer", data.customerName || "Not provided"],
    ["Email", data.customerEmail || "Not available"],
    ["Amount paid", `${data.currency} ${data.amount.toFixed(2)}`],
    ["Plan", data.tier],
    ["Order", data.orderId],
    ["Payment method", data.paymentMethod || "Not provided"],
    ["Confirmation", data.confirmationCode || "Not provided"],
    ["Confirmed at (UTC)", new Date().toISOString()],
  ]);
}

export function referralApplicationOwnerAlert(data: {
  name: string; email: string; website?: string; socialMedia?: string;
  audience?: string; reason: string;
}): OwnerAlert {
  return buildAlert("[BrightBoard] New referral program application", [
    ["Name", data.name], ["Email", data.email],
    ["Website", data.website || "Not provided"],
    ["Social media", data.socialMedia || "Not provided"],
    ["Audience", data.audience || "Not provided"],
    ["Reason for applying", data.reason],
    ["Status", "Pending your review"],
  ]);
}

export async function deliverOwnerAlert(
  alert: OwnerAlert,
  send: (to: string, subject: string, html: string, text: string) => Promise<{ success: boolean }>,
): Promise<void> {
  // A server-only destination: never accept a recipient from a public form.
  const recipient = process.env.OWNER_NOTIFICATION_EMAIL || "kayondoabass@gmail.com";
  const result = await send(recipient, alert.subject, alert.html, alert.text);
  if (!result.success) throw new Error("Founder email alert was not accepted");
}
