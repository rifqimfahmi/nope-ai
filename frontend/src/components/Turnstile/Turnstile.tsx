"use client";

import { Turnstile as TurnstileWidget, type TurnstileInstance } from "@marsidev/react-turnstile";
import { forwardRef, useImperativeHandle, useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export interface TurnstileHandle {
  reset: () => void;
  // Waits for the in-flight invisible verification to resolve, for callers that
  // submit before onSuccess has fired yet (see ChallengeForm's handleSubmit).
  getToken: () => Promise<string>;
}

interface TurnstileProps {
  onVerify: (token: string | null) => void;
}

export const Turnstile = forwardRef<TurnstileHandle, TurnstileProps>(function Turnstile(
  { onVerify },
  ref,
) {
  const widgetRef = useRef<TurnstileInstance | undefined>(undefined);

  useImperativeHandle(ref, () => ({
    reset() {
      widgetRef.current?.reset();
    },
    getToken() {
      if (!widgetRef.current) return Promise.reject(new Error("Turnstile widget not ready"));
      // 10s: long enough to cover a normal invisible-verification round trip,
      // short enough not to leave the user stuck if it's genuinely broken
      // (e.g. misconfigured domain) - that fails the same way as before.
      return widgetRef.current.getResponsePromise(10_000);
    },
  }));

  if (!SITE_KEY) return null;

  return (
    <TurnstileWidget
      ref={widgetRef}
      siteKey={SITE_KEY}
      onSuccess={onVerify}
      onExpire={() => onVerify(null)}
      onError={(errorCode) => {
        // interaction-only never shows this to the visitor, so this is the only
        // way to see why verification failed - check codes against
        // https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/error-codes/
        console.error("Turnstile error:", errorCode);
        onVerify(null);
      }}
      options={{
        theme: "auto",
        // "compact" is 150x140px - narrower AND taller than the card it sits
        // in, so it reads as cramped. "flexible" fills the available width at
        // a flat 65px instead.
        size: "flexible",
        // Renders nothing until Cloudflare actually needs the visitor to solve
        // something - most legit visitors never see a widget at all.
        appearance: "interaction-only",
      }}
    />
  );
});
