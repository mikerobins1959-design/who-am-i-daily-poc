const revision = new URL(import.meta.url).searchParams.get("preview") ?? Date.now();

// Install the preview clock and storage facade before the application reads
// either one. If preview setup fails, the production application stays closed.
await import(`./date-shim.js?preview=${encodeURIComponent(revision)}`);
await import(`../../js/app.js?preview=${encodeURIComponent(revision)}`);
