// Code-based source classification. The LLM NEVER decides that a source is
// official: the verdict comes from the host of the page that was actually
// fetched. Unsure => "unknown". No guessing.

// Swedish/EU authorities and official registries relevant to qualifications,
// education, licensing and labour-market information.
const AUTHORITY_HOSTS = [
  "uhr.se", "universityadmissions.se", "antagning.se", "studera.nu",
  "skolverket.se", "utbildningsguiden.skolverket.se", "uka.se", "csn.se",
  "socialstyrelsen.se", "arbetsformedlingen.se", "skatteverket.se",
  "migrationsverket.se", "scb.se", "regeringen.se", "riksdagen.se",
  "myh.se", "yh-antagning.se", "folkbildningsradet.se", "av.se",
  "forsakringskassan.se", "bolagsverket.se", "lansstyrelsen.se",
  "transportstyrelsen.se", "naturvardsverket.se", "domstol.se",
  "europa.eu", "enic-naric.net"
];

// Pages that are primary official documents rather than informational pages.
const DOCUMENT_HOSTS = ["lagrummet.se", "svenskforfattningssamling.se", "eur-lex.europa.eu"];

const EDUCATIONAL_HOSTS = [
  "uu.se", "lu.se", "su.se", "gu.se", "kth.se", "chalmers.se", "liu.se",
  "umu.se", "oru.se", "hj.se", "lnu.se", "mdu.se", "his.se", "hkr.se",
  "ki.se", "slu.se", "miun.se", "ltu.se", "bth.se", "mau.se", "hb.se", "du.se"
];

const SECONDARY_HOSTS = [
  "wikipedia.org", "svt.se", "dn.se", "svd.se", "sr.se", "aftonbladet.se",
  "expressen.se", "medium.com", "linkedin.com", "reddit.com", "quora.com",
  "facebook.com", "x.com", "twitter.com", "blogspot.com", "wordpress.com"
];

function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}

function matches(host, list) {
  return list.some((d) => host === d || host.endsWith("." + d));
}

/** Publisher = the host of the fetched page. Never a name invented by the model. */
export function publisherOf(url) {
  return hostOf(url);
}

/**
 * sourceType from host/path rules only.
 * official_authority | official_document | educational | secondary | unknown
 */
export function classifySource(url) {
  const host = hostOf(url);
  if (!host) return { sourceType: "unknown", isPrimary: false };

  let path = "";
  try { path = new URL(url).pathname.toLowerCase(); } catch { path = ""; }
  const looksLikeDocument = /\.pdf$/.test(path);

  if (matches(host, DOCUMENT_HOSTS)) return { sourceType: "official_document", isPrimary: true };

  const isAuthorityHost =
    matches(host, AUTHORITY_HOSTS) ||
    host.endsWith(".gov") ||
    host.includes(".gov.") ||
    host.endsWith(".gob.es") ||
    /(^|\.)regeringen\./.test(host);

  if (isAuthorityHost) {
    return looksLikeDocument
      ? { sourceType: "official_document", isPrimary: true }
      : { sourceType: "official_authority", isPrimary: true };
  }

  if (matches(host, EDUCATIONAL_HOSTS) || host.endsWith(".edu") || host.endsWith(".ac.uk")) {
    return { sourceType: "educational", isPrimary: false };
  }

  if (matches(host, SECONDARY_HOSTS)) return { sourceType: "secondary", isPrimary: false };

  return { sourceType: "unknown", isPrimary: false };
}

/** Ordering for sourcePreference: "official" | "primary" | "any". */
export function preferenceRank(sourceType, preference) {
  const order = { official_authority: 0, official_document: 1, educational: 2, secondary: 3, unknown: 4 };
  if (preference === "primary") {
    const primaryFirst = { official_document: 0, official_authority: 1, educational: 2, secondary: 3, unknown: 4 };
    return primaryFirst[sourceType] ?? 5;
  }
  if (preference === "any") return 0;
  return order[sourceType] ?? 5;
}

/** With "official"/"primary", non-primary sources are only kept as a last resort. */
export function isAcceptable(sourceType, preference) {
  if (preference === "any") return true;
  return sourceType === "official_authority" || sourceType === "official_document";
}