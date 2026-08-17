"use client";

import { Turnstile as TurnstileWidget, type TurnstileInstance } from "@marsidev/react-turnstile";
import { forwardRef, useImperativeHandle, useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export interface TurnstileHandle {
  reset: () => void;
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
  }));

  if (!SITE_KEY) return null;

  return (
    <TurnstileWidget
      ref={widgetRef}
      siteKey={SITE_KEY}
      onSuccess={onVerify}
      onExpire={() => onVerify(null)}
      onError={() => onVerify(null)}
      options={{
        theme: "auto",
        size: "compact",
        // Renders nothing until Cloudflare actually needs the visitor to solve
        // something - most legit visitors never see a widget at all.
        appearance: "interaction-only",
      }}
    />
  );
});
