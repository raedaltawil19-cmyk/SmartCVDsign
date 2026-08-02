import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

function stripHtml(html) {
  // remove non-content blocks
  html = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  html = html.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  html = html.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  html = html.replace(/<(nav|footer|header|aside|svg|form)[\s\S]*?<\/\1>/gi, ' ');
  // block elements -> newlines for readability
  html = html.replace(/<\s*(p|div|li|h[1-6]|br|tr)[^>]*>/gi, '\n');
  html = html.replace(/<\/\s*(p|div|li|h[1-6]|tr)>/gi, '\n');
  // strip remaining tags
  html = html.replace(/<[^>]+>/g, ' ');
  // decode common entities
  html = html.replace(/&nbsp;/g, ' ').replace(/&/g, '&').replace(/"/g, '"').replace(/&#39;/g, "'").replace(/</g, '<').replace(/>/g, '>');
  // collapse whitespace
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

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const url = (body && body.url && String(body.url).trim()) || "";
    if (!url) return Response.json({ error: "url krävs" }, { status: 400 });
    let u;
    try { u = new URL(url); } catch { return Response.json({ error: "ogiltig url" }, { status: 400 }); }

    const res = await fetch(u.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8"
      },
      redirect: "follow"
    });
    if (!res.ok) return Response.json({ error: `kunde inte hämta (HTTP ${res.status})` }, { status: 502 });
    const ct = res.headers.get("content-type") || "";
    const raw = await res.text();
    const title = extractTitle(raw);
    const text = ct.includes("text/html") ? stripHtml(raw) : raw.replace(/<[^>]+>/g, " ").trim();
    const trimmed = text.slice(0, 12000);
    return Response.json({ url: u.toString(), title, text: trimmed, length: trimmed.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}