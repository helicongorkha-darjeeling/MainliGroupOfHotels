"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

type TurnstileApi = {
  render: (container: HTMLElement, options: {
    sitekey: string; theme: string; size: string; callback: (token: string) => void;
    "expired-callback": () => void; "error-callback": () => void;
  }) => string;
  remove: (widgetId: string) => void;
};

function turnstile() { return (window as Window & { turnstile?: TurnstileApi }).turnstile; }

export function CheckoutCaptcha({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => () => {
    if (widgetRef.current !== null) turnstile()?.remove(widgetRef.current);
    widgetRef.current = null;
  }, []);

  function renderChallenge() {
    if (!containerRef.current || widgetRef.current !== null) return;
    try {
      const api = turnstile();
      if (!api) throw new Error("Security check unavailable");
      widgetRef.current = api.render(containerRef.current, {
        sitekey: siteKey, theme: "light", size: "flexible", callback: onToken,
        "expired-callback": () => onToken(""),
        "error-callback": () => { onToken(""); setFailed(true); },
      });
    } catch { onToken(""); setFailed(true); }
  }

  return <div className="checkout-captcha">
    <div ref={containerRef} />
    <Script id="checkout-turnstile" src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={renderChallenge} onError={() => { onToken(""); setFailed(true); }} />
    {failed && <p role="status">The security check could not load. Reload the page to retry.</p>}
  </div>;
}
