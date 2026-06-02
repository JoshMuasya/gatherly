import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM ?? "Gatherly <noreply@gatherly.app>";

function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
  return new Resend(process.env.RESEND_API_KEY);
}

export interface RegistrationEmailData {
  to: string;
  name: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  registrationId: string;
}

export interface PaymentReceiptData {
  to: string;
  name: string;
  eventTitle: string;
  amount: number;
  method: "cash" | "mpesa";
  mpesaCode?: string;
  paymentDate: string;
}

export interface InvitationEmailData {
  to: string;
  name: string;
  orgName: string;
  inviteLink: string;
  role: string;
}

export interface PaymentApprovalEmailData {
  to: string;
  leaderName: string;
  submittedBy: string;
  eventTitle: string;
  amount: number;
  mpesaCode: string;
  paymentId: string;
  orgName: string;
  dashboardUrl: string;
}

export async function sendRegistrationConfirmation(data: RegistrationEmailData): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  await getResend().emails.send({
    from: FROM,
    to: data.to,
    subject: `You're registered for ${data.eventTitle}`,
    html: registrationHtml(data),
  });
}

export async function sendInvitation(data: InvitationEmailData): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  await getResend().emails.send({
    from: FROM,
    to: data.to,
    subject: `You've been invited to ${data.orgName} on Gatherly`,
    html: invitationHtml(data),
  });
}

export async function sendPaymentApprovalRequest(data: PaymentApprovalEmailData): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  await getResend().emails.send({
    from: FROM,
    to: data.to,
    subject: `Payment Approval Required – ${data.eventTitle}`,
    html: paymentApprovalHtml(data),
  });
}

export async function sendPaymentReceipt(data: PaymentReceiptData): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  await getResend().emails.send({
    from: FROM,
    to: data.to,
    subject: `Payment Receipt – ${data.eventTitle}`,
    html: paymentHtml(data),
  });
}

function registrationHtml(d: RegistrationEmailData): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:24px}
.card{background:#fff;border-radius:12px;max-width:520px;margin:0 auto;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
h1{color:#111827;font-size:22px;margin:0 0 4px}
p{color:#6b7280;font-size:15px;line-height:1.6;margin:8px 0}
.row{display:flex;gap:12px;margin:6px 0;font-size:14px;color:#374151}
.label{font-weight:600;min-width:80px;color:#111827}
.badge{display:inline-block;background:#eff6ff;color:#1d4ed8;border-radius:6px;padding:6px 14px;font-size:13px;font-weight:600;margin-top:16px;letter-spacing:.5px}
.footer{margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af}
</style></head><body><div class="card">
<h1>You&rsquo;re registered! 🎉</h1>
<p>Hi ${d.name}, your spot is confirmed.</p>
<h2 style="color:#111827;font-size:18px;margin:20px 0 12px">${d.eventTitle}</h2>
<div class="row"><span class="label">Date</span><span>${d.eventDate}</span></div>
${d.eventTime ? `<div class="row"><span class="label">Time</span><span>${d.eventTime}</span></div>` : ""}
<div class="row"><span class="label">Location</span><span>${d.eventLocation}</span></div>
<div class="badge">ID: ${d.registrationId}</div>
<p style="margin-top:20px">Show this ID or your QR code at the door for check-in.</p>
<div class="footer">Sent by Gatherly &middot; Event management for communities</div>
</div></body></html>`;
}

function paymentHtml(d: PaymentReceiptData): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:24px}
.card{background:#fff;border-radius:12px;max-width:520px;margin:0 auto;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
h1{color:#111827;font-size:22px;margin:0 0 4px}
p{color:#6b7280;font-size:15px;line-height:1.6;margin:8px 0}
.amount{font-size:32px;font-weight:700;color:#059669;margin:16px 0}
.row{display:flex;gap:12px;margin:6px 0;font-size:14px;color:#374151}
.label{font-weight:600;min-width:110px;color:#111827}
.footer{margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af}
</style></head><body><div class="card">
<h1>Payment Receipt</h1>
<p>Hi ${d.name}, your payment has been recorded.</p>
<div class="amount">KES ${d.amount.toLocaleString()}</div>
<div class="row"><span class="label">Event</span><span>${d.eventTitle}</span></div>
<div class="row"><span class="label">Method</span><span>${d.method === "mpesa" ? "M-Pesa" : "Cash"}</span></div>
${d.mpesaCode ? `<div class="row"><span class="label">M-Pesa Code</span><span>${d.mpesaCode}</span></div>` : ""}
<div class="row"><span class="label">Date</span><span>${d.paymentDate}</span></div>
<div class="footer">Sent by Gatherly &middot; Event management for communities</div>
</div></body></html>`;
}

function paymentApprovalHtml(d: PaymentApprovalEmailData): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:24px}
.card{background:#fff;border-radius:12px;max-width:520px;margin:0 auto;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
h1{color:#111827;font-size:22px;margin:0 0 4px}
p{color:#6b7280;font-size:15px;line-height:1.6;margin:8px 0}
.amount{font-size:32px;font-weight:700;color:#d97706;margin:16px 0}
.row{display:flex;gap:12px;margin:6px 0;font-size:14px;color:#374151}
.label{font-weight:600;min-width:110px;color:#111827}
.btn{display:inline-block;background:#2563eb;color:#fff;border-radius:8px;padding:12px 28px;font-size:15px;font-weight:600;text-decoration:none;margin:20px 0}
.footer{margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af}
</style></head><body><div class="card">
<h1>Payment Awaiting Approval</h1>
<p>Hi ${d.leaderName}, a payment has been submitted and needs your approval.</p>
<div class="amount">KES ${d.amount.toLocaleString()}</div>
<div class="row"><span class="label">Submitted by</span><span>${d.submittedBy}</span></div>
<div class="row"><span class="label">Event</span><span>${d.eventTitle}</span></div>
<div class="row"><span class="label">M-Pesa Code</span><span>${d.mpesaCode}</span></div>
<div class="row"><span class="label">Organisation</span><span>${d.orgName}</span></div>
<a href="${d.dashboardUrl}" class="btn">Review Payment</a>
<p style="font-size:13px;color:#9ca3af">Payment ID: ${d.paymentId}</p>
<div class="footer">Sent by Gatherly &middot; Event management for communities</div>
</div></body></html>`;
}

function invitationHtml(d: InvitationEmailData): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:24px}
.card{background:#fff;border-radius:12px;max-width:520px;margin:0 auto;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
h1{color:#111827;font-size:22px;margin:0 0 4px}
p{color:#6b7280;font-size:15px;line-height:1.6;margin:8px 0}
.btn{display:inline-block;background:#2563eb;color:#fff;border-radius:8px;padding:12px 28px;font-size:15px;font-weight:600;text-decoration:none;margin:20px 0}
.role{display:inline-block;background:#eff6ff;color:#1d4ed8;border-radius:6px;padding:4px 12px;font-size:13px;font-weight:600}
.footer{margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af}
</style></head><body><div class="card">
<h1>You&rsquo;re invited! \u{1F389}</h1>
<p>Hi ${d.name}, you&rsquo;ve been invited to join <strong>${d.orgName}</strong> on Gatherly as a <span class="role">${d.role}</span>.</p>
<p>Click the button below to set up your account:</p>
<a href="${d.inviteLink}" class="btn">Accept Invitation</a>
<p style="font-size:13px;color:#9ca3af">This link expires in 24 hours. If you didn&rsquo;t expect this, you can safely ignore this email.</p>
<div class="footer">Sent by Gatherly &middot; Event management for communities</div>
</div></body></html>`;
}
