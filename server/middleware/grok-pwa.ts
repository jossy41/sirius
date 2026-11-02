/**
 * Deployed-app half of platform PWA chrome (manifest, ?install=1 tutorial,
 * head-tag injection). Dev/preview counterpart: scripts/grok-pwa-plugin.mjs.
 * Shared logic: scripts/grok-pwa-shared.mjs.
 *
 * OG identity is baked for Vite as virtual:grok-og-identity; Nitro uses the
 * same snapshotOgIdentity() helper from the shared module.
 */
import { defineMiddleware } from "nitro";
import {
  acceptsHtml,
  createHeadInjector,
  isDocumentPath,
  isInstallQuery,
  renderInstallPageHtml,
  renderWebManifest,
  snapshotOgIdentity,
} from "../../scripts/grok-pwa-shared.mjs";
// Vite/Nitro both resolve ?raw to the file contents as a string.
import installPageTemplate from "../../scripts/install-page.html?raw";

function requestHost(event: any): string {
  const headers = event?.node?.req?.headers;
  if (headers) {
    const forwarded = headers["x-forwarded-host"];
    const host = forwarded ?? headers.host ?? headers[":authority"];
    return Array.isArray(host) ? String(host[0] ?? "") : String(host ?? "");
  }
  try {
    const h = event.headers?.get?.("x-forwarded-host") ?? event.headers?.get?.("host");
    return h ?? "";
  } catch {
    return "";
  }
}

function pathnameOf(url: string): string {
  try {
    return new URL(url, "http://local").pathname;
  } catch {
    return url.split("?", 1)[0] ?? "";
  }
}

export default defineMiddleware((event: any) => {
  const method = String(event.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return;

  const reqUrl = String(event.path ?? event.node?.req?.url ?? "/");
  const pathOnly = pathnameOf(reqUrl);
  const host = requestHost(event);

  if (pathOnly === "/__grok/manifest.webmanifest" || pathOnly === "/__grok/manifest.json") {
    const body = renderWebManifest(host);
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "application/manifest+json; charset=utf-8",
        "cache-control": "no-cache",
      },
    });
  }

  const acceptRaw = event.node?.req?.headers?.accept ?? event.headers?.get?.("accept") ?? "";
  const acceptStr = Array.isArray(acceptRaw) ? acceptRaw.join(",") : String(acceptRaw);

  if (isInstallQuery(reqUrl) && isDocumentPath(pathOnly) && acceptsHtml(acceptStr)) {
    const html = renderInstallPageHtml(installPageTemplate, { host, url: reqUrl });
    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache",
      },
    });
  }

  if (!isDocumentPath(pathOnly) || isInstallQuery(reqUrl)) return;
  if (acceptStr && !acceptsHtml(acceptStr)) return;

  const res = event.node?.res as any;
  if (!res || typeof res.write !== "function") return;

  const identity = snapshotOgIdentity(process.cwd());
  const injector = createHeadInjector({
    host,
    cwd: process.cwd(),
    site: identity.site,
  });

  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);
  let mode: null | "inject" | "passthrough" = null;

  const decideMode = () => {
    if (mode) return mode;
    const ct = String(res.getHeader?.("content-type") ?? "");
    const encoded = Boolean(res.getHeader?.("content-encoding"));
    mode = ct.includes("text/html") && !encoded ? "inject" : "passthrough";
    if (mode === "inject" && !res.headersSent) {
      try {
        res.removeHeader("content-length");
      } catch {
        /* locked */
      }
    }
    return mode;
  };

  const toBuffer = (chunk: any, encoding?: any): Buffer => {
    if (Buffer.isBuffer(chunk)) return chunk;
    if (typeof chunk === "string") {
      return Buffer.from(chunk, (typeof encoding === "string" ? encoding : "utf8") as BufferEncoding);
    }
    if (chunk == null) return Buffer.alloc(0);
    if (chunk instanceof Uint8Array) return Buffer.from(chunk);
    return Buffer.from(String(chunk));
  };

  res.write = (chunk: any, encoding?: any, cb?: any) => {
    if (decideMode() === "passthrough") return originalWrite(chunk, encoding, cb);
    const done = typeof encoding === "function" ? encoding : cb;
    if (chunk) {
      for (const out of injector.push(toBuffer(chunk, encoding))) originalWrite(out);
    }
    if (typeof done === "function") done();
    return true;
  };

  res.end = (chunk?: any, encoding?: any, cb?: any) => {
    const done = typeof encoding === "function" ? encoding : cb;
    if (decideMode() === "passthrough") return originalEnd(chunk, encoding, cb);
    if (chunk) {
      for (const out of injector.push(toBuffer(chunk, encoding))) originalWrite(out);
    }
    for (const out of injector.flush()) originalWrite(out);
    if (typeof done === "function") return originalEnd(done);
    return originalEnd();
  };
});
