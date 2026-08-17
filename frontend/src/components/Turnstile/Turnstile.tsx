"use client";

import Script from "next/script";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

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
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
    },
  }));

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.turnstile || !SITE_KEY) return;

    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      theme: "auto",
      size: "compact",
      // Renders nothing until Cloudflare actually needs the visitor to solve
      // something - most legit visitors never see a widget at all, so this
      // can sit inline in the form footer without it looking like a wall.
      appearance: "interaction-only",
      callback: (token: string) => onVerifyRef.current(token),
      "expired-callback": () => onVerifyRef.current(null),
      "error-callback": () => onVerifyRef.current(null),
    });
    widgetIdRef.current = widgetId;

    return () => {
      if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [scriptLoaded]);

  if (!SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <div ref={containerRef} />
    </>
  );
});
