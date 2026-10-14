import { Resend } from "resend";
import { env } from "../config/env.js";
import type { QuoteDocument, QuoteItemDocument } from "../models/quote.model.js";

function formatCad(value: number): string {
  return value.toLocaleString("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function unitAbbr(unit: QuoteItemDocument["unit"]): string {
  return unit === "lft" ? "lft" : unit;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildQuoteHtml(quote: QuoteDocument): string {
  const rows = quote.items
    .map(
      (item) => `
        <tr>
          <td style="padding:6px 12px;border-bottom:1px solid #e2e2e2;">
            ${escapeHtml(item.name)} (${escapeHtml(item.size)})
          </td>
          <td style="padding:6px 12px;border-bottom:1px solid #e2e2e2;">
            ${item.totalPcs} pcs / ${item.totalCoverage.toFixed(1)} ${unitAbbr(item.unit)}
          </td>
          <td style="padding:6px 12px;border-bottom:1px solid #e2e2e2;">
            ${item.fullSkids} skid${item.fullSkids === 1 ? "" : "s"}${
              item.loosePcs > 0 ? ` + ${item.loosePcs} loose` : ""
            }
          </td>
          <td style="padding:6px 12px;border-bottom:1px solid #e2e2e2;text-align:right;">
            $${formatCad(item.total)}
          </td>
        </tr>`
    )
    .join("");

  const discountRow =
    quote.discountTotal > 0
      ? `<p style="margin:4px 0;">Volume discount: -$${formatCad(quote.discountTotal)}</p>`
      : "";
  const handlingRow =
    quote.handlingTotal > 0
      ? `<p style="margin:4px 0;">Handling: $${formatCad(quote.handlingTotal)}</p>`
      : "";

  const submitterType = quote.submittedBy.userId ? "Account holder" : "Guest";
  const companyRow = quote.submittedBy.company
    ? `<p style="margin:2px 0;">Company: <strong>${escapeHtml(quote.submittedBy.company)}</strong></p>`
    : "";
  const notesRow = quote.notes
    ? `<div style="margin-top:16px;padding:12px;background:#f6f3ea;border-radius:6px;">
         <p style="margin:0 0 4px;font-weight:bold;">Notes</p>
         <p style="margin:0;white-space:pre-wrap;">${escapeHtml(quote.notes)}</p>
       </div>`
    : "";

  return `
    <div style="font-family:Arial,sans-serif;color:#1a1a1a;">
      <p style="margin:0 0 2px;color:#8a7a52;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">
        &#127769; Luna
      </p>
      <h2 style="margin:0 0 4px;">New quote request</h2>
      <p style="margin:2px 0;">${submitterType}: <strong>${escapeHtml(quote.submittedBy.email)}</strong></p>
      ${companyRow}
      <table style="border-collapse:collapse;width:100%;max-width:640px;margin-top:12px;">
        <thead>
          <tr>
            <th style="padding:6px 12px;text-align:left;border-bottom:2px solid #1a1a1a;">Product</th>
            <th style="padding:6px 12px;text-align:left;border-bottom:2px solid #1a1a1a;">Quantity</th>
            <th style="padding:6px 12px;text-align:left;border-bottom:2px solid #1a1a1a;">Skids</th>
            <th style="padding:6px 12px;text-align:right;border-bottom:2px solid #1a1a1a;">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:16px;">
        <p style="margin:4px 0;">Material: $${formatCad(quote.materialTotal)}</p>
        ${handlingRow}
        ${discountRow}
        <p style="margin:8px 0;font-size:16px;">
          <strong>Estimated total: $${formatCad(quote.grandTotal)} CAD</strong>
        </p>
      </div>
      ${notesRow}
      <p style="color:#666;margin-top:16px;">Luna — trade pricing in CAD. Delivery and applicable taxes not included.</p>
    </div>`;
}

export async function notifyAdminsOfQuote(quote: QuoteDocument): Promise<void> {
  if (!env.resendApiKey || !env.resendFrom) {
    console.warn(
      "RESEND_API_KEY or RESEND_FROM is not set; skipping quote notification email"
    );
    return;
  }

  if (env.quoteNotificationEmails.length === 0) {
    console.warn("QUOTE_NOTIFICATION_EMAIL has no valid recipients; skipping quote notification email");
    return;
  }

  const resend = new Resend(env.resendApiKey);
  const { error } = await resend.emails.send({
    from: env.resendFrom,
    to: env.quoteNotificationEmails,
    subject: `New quote request from ${quote.submittedBy.email}`,
    html: buildQuoteHtml(quote),
  });

  if (error) {
    throw new Error(`Resend rejected quote notification: ${error.message}`);
  }
}
