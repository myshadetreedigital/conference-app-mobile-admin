import { NextResponse } from "next/server";
import { Resend } from "resend";
import { Webhook } from "standardwebhooks";

/**
 * Supabase's "Send Email" Auth Hook (HTTPS type). Configured in the
 * Supabase dashboard under Authentication -> Hooks, pointing at this
 * route's deployed URL. Bypasses Supabase's built-in email
 * sender/templates entirely (which require Custom SMTP to even edit)
 * — we receive the raw token here and send the email ourselves via
 * Resend, in whatever format the product actually needs (a visible
 * code for password reset, per docs/PRODUCT-DECISIONS.md).
 *
 * Payload shape and signature verification per Supabase's documented
 * Send Email Hook contract (Standard Webhooks spec) — logged
 * verbatim below on any failure so a real mismatch against that
 * contract is visible immediately rather than silently swallowed.
 */

interface SendEmailPayload {
  user: { email: string };
  email_data: {
    token: string;
    token_hash: string;
    email_action_type: string;
  };
}

export async function POST(request: Request) {
  const body = await request.text();
  const headers = Object.fromEntries(request.headers);

  let event: SendEmailPayload;
  try {
    const wh = new Webhook(process.env.SUPABASE_AUTH_HOOK_SECRET ?? "");
    event = wh.verify(body, headers) as SendEmailPayload;
  } catch (error) {
    console.error("[send-email hook] signature verification failed:", error, "raw body:", body);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { user, email_data } = event;

  try {
    if (email_data.email_action_type === "recovery") {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
        to: user.email,
        subject: "Reset your password",
        html: `
          <h2>Reset your password</h2>
          <p>Enter this code in the app to reset your password:</p>
          <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${email_data.token}</p>
          <p>This code expires shortly. If you didn't request this, you can ignore this email.</p>
        `,
      });
    } else {
      // Other action types (signup confirmation, magic link, email
      // change, invite) aren't sent yet — email confirmation is
      // disabled for this project and magic-link login isn't
      // offered. Logged, not silently dropped, so a real future need
      // for one of these is visible instead of a mystery.
      console.log("[send-email hook] no handler for action type:", email_data.email_action_type);
    }
    return NextResponse.json({});
  } catch (error) {
    console.error("[send-email hook] Resend send failed:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
