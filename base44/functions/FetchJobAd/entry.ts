// Fetch a public job-ad page (HTML) and return cleaned text.
// Retrieval + SSRF hardening live in the shared publicFetch module (one
// implementation, shared with ResearchPublicSource). Behaviour unchanged.

import { fetchPublicPage } from "../../shared/publicFetch.ts";

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = (body && body.url && String(body.url).trim()) || "";

    const page = await fetchPublicPage(raw);
    if (!page.ok) return Response.json({ error: page.error }, { status: page.status });

    return Response.json({ url: page.url, title: page.title, text: page.text, length: page.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}