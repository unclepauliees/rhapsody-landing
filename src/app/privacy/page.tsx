import { BRAND_NAME, PRESS_EMAIL } from "@/config/brand";

export const metadata = { title: `Privacy — ${BRAND_NAME}` };

export default function PrivacyPage() {
  return (
    <main
      data-theme="dark"
      className="bg-background text-foreground mx-auto flex min-h-svh w-full max-w-[720px] flex-col justify-center px-6 py-24"
    >
      <h1 className="text-ink-on-ground text-3xl">Privacy</h1>
      <p className="text-ink-on-ground mt-6 max-w-[60ch]">
        We collect the email address you give us so we can write to you once
        there is something to say. We do not sell it, and we do not share it.
        Write to {PRESS_EMAIL} to be removed at any time.
      </p>
    </main>
  );
}
