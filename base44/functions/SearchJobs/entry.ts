import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

// Search live Swedish job ads via Arbetsförmedlingen JobTech Search API.
// Only returns ads that are NOT removed and whose application deadline is still in the future
// (or open-ended), guaranteeing currently valid listings.

function isoOffsetDays(days) {
  const d = new Date(Date.now() - days * 86400000);
  return d.toISOString();
}

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const q = (body && body.q && String(body.q).trim()) || "";
    const publishedDays = Math.min(Math.max(Number(body?.publishedDays) || 14, 1), 60);
    const remote = body?.remote === true ? "true" : null;
    const limit = Math.min(Math.max(Number(body?.limit) || 20, 1), 50);
    const regions = Array.isArray(body?.regions) ? body.regions.map(String).filter(Boolean) : [];
    const municipalities = Array.isArray(body?.municipalities) ? body.municipalities.map(String).filter(Boolean) : [];

    const u = new URL("https://jobsearch.api.jobtechdev.se/search");
    if (q) u.searchParams.set("q", q);
    u.searchParams.set("published-after", String(publishedDays * 1440)); // minutes
    if (remote) u.searchParams.set("remote", remote);
    regions.forEach((id) => u.searchParams.append("region", id));
    municipalities.forEach((id) => u.searchParams.append("municipality", id));
    u.searchParams.set("limit", String(limit));

    const res = await fetch(u.toString(), {
      headers: {
        "Accept": "application/json",
        "User-Agent": "CVcraft/1.0 (+job-suggestions)"
      },
      redirect: "follow"
    });
    if (!res.ok) return Response.json({ error: `JobTech HTTP ${res.status}` }, { status: 502 });
    const json = await res.json();

    const now = Date.now();
    const hits = (json && Array.isArray(json.hits)) ? json.hits : [];
    const cleaned = [];

    for (const ad of hits) {
      if (ad.removed) continue;
      const deadline = ad.application_deadline ? new Date(ad.application_deadline).getTime() : Infinity;
      if (deadline && deadline < now) continue; // expired
      const wa = ad.workplace_address || {};
      const desc = (ad.description && (ad.description.text || ad.description.text_formatted)) || "";
      cleaned.push({
        id: ad.id,
        rubrik: ad.headline || "",
        arbetsgivare: ad.employer ? (ad.employer.name || "") : "",
        kommun: wa.municipality || "",
        lan: wa.region || "",
        land: wa.country || "",
        publicerad: ad.publication_date || "",
        deadline: ad.application_deadline || "",
        webbadress: ad.web_url || (ad.id ? `https://arbetsformedlingen.se/platsbanken/annons/${ad.id}` : ""),
        beskrivning: (desc || "").slice(0, 1400),
        remote: !!ad.remote,
        anstallningTyp: ad.employment_type ? (ad.employment_type.label || "") : "",
        varaktighet: ad.duration ? (ad.duration.label || "") : "",
        yrkesomrade: ad.occupation_field ? (ad.occupation_field.label || "") : "",
        erfarenhetKrav: !!ad.experience_required
      });
      if (cleaned.length >= 25) break;
    }

    return Response.json({ count: cleaned.length, query: q, jobs: cleaned });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}