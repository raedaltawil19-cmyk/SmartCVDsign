// Fetch a public job-ad page (HTML) and return cleaned text.
// Hardened against SSRF: only http(s), no private/loopback hosts, no URL
// credentials, manual redirect validation, and a response-size cap.

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_HOPS = 5;

function stripHtml(html) {
  html = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  html = html.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  html = html.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  html = html.replace(/<(nav|footer|header|aside|svg|form)[\s\S]*?<\/\1>/gi, ' ');
  html = html.replace(/<\s*(p|div|li|h[1-6]|br|tr)[^>]*>/gi, '\n');
  html = html.replace(/<\/\s*(p|div|li|h[1-6]|tr)>/gi, '\n');
  html = html.replace(/<[^>]+>/g, ' ');
  html = html.replace(/&nbsp;/g, ' ').replace(/&/g, '&').replace(/"/g, '"').replace(/&#39;/g, "'").replace(/</g, '<').replace(/>/g, '>');
  html = html.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
  return html;
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (m) return m[1].trim();
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og) return og[1].trim();
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return h1[1].replace(/<[^>]+>/g, '').trim();
  return "";
}

function isPrivateHost(host) {
  const h = String(host || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
  if (h === "0" || h === "0.0.0.0" || h === "::" || h === "::1") return true;
  if (h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]), b = Number(m[2]);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  return false;
}

function safeUrl(raw, base) {
  let u;
  try { u = new URL(raw, base); } catch { return null; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (!u.hostname || isPrivateHost(u.hostname)) return null;
  if (u.username || u.password) return null;
  return u;
}

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = (body && body.url && String(body.url).trim()) || "";
    let u = safeUrl(raw);
    if (!u) return Response.json({ error: "ogiltig url" }, { status: 400 });

    let res;
    for (let i = 0; i < MAX_HOPS; i++) {
      res = await fetch(u.toString(), {
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8"
        }
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        const next = loc ? safeUrl(loc, u.toString()) : null;
        if (!next) return Response.json({ error: "ogiltig omdirigering" }, { status: 400 });
        u = next;
        continue;
      }
      break;
    }

    if (!res.ok) return Response.json({ error: `kunde inte hämta (HTTP ${res.status})` }, { status: 502 });

    const len = Number(res.headers.get("content-length") || 0);
    if (len && len > MAX_BYTES) return Response.json({ error: "sidan för stor" }, { status: 413 });

    const ct = res.headers.get("content-type") || "";
    const rawText = await res.text();
    if (rawText.length > MAX_BYTES) return Response.json({ error: "sidan för stor" }, { status: 413 });

    const title = extractTitle(rawText);
    const text = ct.includes("text/html") ? stripHtml(rawText) : rawText.replace(/<[^>]+>/g, " ").trim();
    const trimmed = text.slice(0, 12000);
    return Response.json({ url: u.toString(), title, text: trimmed, length: trimmed.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}