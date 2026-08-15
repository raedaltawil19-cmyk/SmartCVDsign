// Security boundary: this tool researches PUBLIC INFORMATION only — never the
// candidate. Candidate-shaped payload keys and person-seeking queries are
// rejected before any network call happens.

const FORBIDDEN_KEYS = [
  "cv_data", "cvdata", "cvid", "cv", "savedcv", "saved_cv", "candidate",
  "candidatename", "candidate_name", "person", "personaldata", "personal_data",
  "profile", "data", "cvlanguage", "evidence", "evidencepack", "recommendation"
];

const PERSON_PATTERNS = [
  /\b[\w.+-]+@[\w-]+\.[\w.]+\b/,                 // e-mail
  /\b\d{6,8}[-+]?\d{4}\b/,                        // personnummer
  /\b(?:\+46|0)\s?7\d(?:[\s-]?\d){7}\b/,          // mobile number
  /\blinkedin\.com\/in\//i,
  /\bwho\s+is\b/i,
  /\b(my|mitt|min|mina)\s+(cv|resume|profile|profil|utbildning|erfarenhet|betyg)\b/i,
  /\b(this|the)\s+candidate\b/i,
  /\b(candidate|applicant|sökande|kandidat)('s)?\s+(name|cv|resume|profile|background|history|qualification)/i,
  /\b(background|reference)\s+check\b/i,
  /\bمرشح|سيرتي|سيرة\s+المرشح|رقم\s+هاتف|بريد\s+إلكتروني\b/,
  /\b(find|search|look\s+up|hitta|sök)\s+(information\s+)?(about|om)\s+(a\s+)?(person|persson|individual)\b/i
];

/**
 * @returns {{ok:true, query:string}|{ok:false, error:string}}
 */
export function guardQuery(body) {
  const keys = Object.keys(body || {}).map((k) => k.toLowerCase());
  const offending = keys.filter((k) => FORBIDDEN_KEYS.includes(k));
  if (offending.length) {
    return { ok: false, error: `CANDIDATE_DATA_NOT_ALLOWED(${offending.join(",")})` };
  }

  const query = String(body?.query ?? "").trim();
  if (!query) return { ok: false, error: "QUERY_REQUIRED" };
  if (query.length > 400) return { ok: false, error: "QUERY_TOO_LONG" };

  const context = String(body?.context ?? "").trim();
  if (context.length > 400) return { ok: false, error: "CONTEXT_TOO_LONG" };

  const haystack = `${query}\n${context}`;
  if (PERSON_PATTERNS.some((re) => re.test(haystack))) {
    return { ok: false, error: "PERSON_LOOKUP_NOT_ALLOWED" };
  }

  return { ok: true, query, context };
}