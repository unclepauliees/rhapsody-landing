import { NextResponse } from "next/server";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { DOMAIN, RSVP_NOTIFY_EMAIL } from "@/config/brand";

const subscribeSchema = z.object({ email: z.email() });

// The JSONL append below is the durable record regardless of provider.
// Provider stub: set these env vars to also relay each signup to
// RSVP_NOTIFY_EMAIL (src/config/brand.ts) — no code change needed:
//   SUBSCRIBE_PROVIDER    "resend" | "loops" | "mailchimp"
//   SUBSCRIBE_API_KEY     provider API key
//   SUBSCRIBE_LIST_ID     destination list/audience id
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "subscribers.jsonl");

async function notifyProvider(email: string) {
  if (process.env.SUBSCRIBE_PROVIDER !== "resend" || !process.env.SUBSCRIBE_API_KEY) {
    return;
  }
  // Best-effort: the JSONL append already happened, so a failure here never
  // loses the signup.
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUBSCRIBE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Rhapsody <noreply@${DOMAIN}>`,
      to: RSVP_NOTIFY_EMAIL,
      subject: "New Rhapsody invitation request",
      text: `${email} requested an invitation.`,
    }),
  }).catch(() => {});
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = subscribeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  await mkdir(DATA_DIR, { recursive: true });
  await appendFile(
    DATA_FILE,
    JSON.stringify({ email: parsed.data.email, at: new Date().toISOString() }) + "\n",
    "utf8",
  );
  await notifyProvider(parsed.data.email);

  return NextResponse.json({ ok: true });
}
