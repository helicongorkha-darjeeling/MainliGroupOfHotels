"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="simple-page site-shell">
          <p className="eyebrow">Something went wrong</p>
          <h1>We couldn&apos;t open<br />this page safely.</h1>
          <p className="lead">Your booking has not been changed. Please try again.</p>
          <button className="button button-primary" type="button" onClick={() => reset()}>Try again</button>
        </main>
      </body>
    </html>
  );
}
