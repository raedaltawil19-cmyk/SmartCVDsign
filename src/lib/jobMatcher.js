/**
 * Local (non-LLM) keyword scoring between a CV and a Swedish job ad.
 * Used to pre-rank ads before sending only the best matches to the LLM,
 * cutting integration-credit usage dramatically.
 */

const STOP = new Set([
  "och", "eller", "med", "att", "en", "ett", "som", "av", "till", "for",
  "har", "ar", "var", "vi", "du", "god", "bra", "att", "html", "_css",
  "eller", "sa", "som", "i", "pa",
]);

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .split(/[^a-zåäö0-9]+/i)
    .filter((t) => t && t.length > 2 && !STOP.has(t));
}

export function cvKeywords(cv) {
  const set = new Set();
  if (cv?.titel) tokenize(cv.titel).forEach((t) => set.add(t));
  if (cv?.fardigheter) {
    cv.fardigheter.forEach((f) => {
      if (f?.namn) {
        tokenize(f.namn).forEach((t) => set.add(t));
        if (f.namn.length > 2) set.add(f.namn.toLowerCase());
      }
    });
  }
  if (cv?.erfarenhet) {
    cv.erfarenhet.forEach((e) => {
      if (e?.roll) tokenize(e.roll).forEach((t) => set.add(t));
    });
  }
  if (cv?.sprak) {
    cv.sprak.forEach((s) => {
      if (s?.sprak && s.sprak.length > 2) set.add(s.sprak.toLowerCase());
    });
  }
  return [...set];
}

export function localMatchScore(cv, ad) {
  const kws = cvKeywords(cv);
  if (!kws.length) return 0;
  const haystack = [
    ad?.rubrik,
    ad?.beskrivning,
    ad?.krav?.map((k) => k?.namn).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let hits = 0;
  kws.forEach((k) => {
    if (haystack.includes(k)) hits++;
  });

  const titleKws = cvKeywords({ titel: cv?.titel });
  const titleHits = titleKws.filter((k) =>
    (ad?.rubrik || "").toLowerCase().includes(k)
  );

  const base = Math.round((hits / kws.length) * 80);
  const titleBonus = titleHits.length ? 20 : 0;
  return Math.min(100, base + titleBonus);
}