// Lightweight, local (no LLM) inference from a CV:
//  - classifyIndustry: maps the CV's title/skills/experience to a salary industry
//  - extractLocation: pulls the municipality/city out of the contact address
// Used to pre-fill tool forms (salary advisor, etc.) so the user only adjusts if needed.

const INDUSTRY_RULES = [
  { key: "IT/Tech", words: ["utvecklare", "developer", "programmer", "software", "systemutvecklare", "webbutvecklare", "frontend", "backend", "fullstack", "devops", "cloud", "aws", "azure", "python", "java", "javascript", "react", "node", ".net", "c#", "sql", "databas", "machine learning", "data scientist", "data engineer", "nätverk", "systemadministratör", "cyber", "it-support", "it-tekniker", "testledare", "automation", "data", "it "] },
  { key: "Finans", words: ["ekonom", "ekonomi", "finans", "redovisning", "bokföring", "controller", "revisor", "bank", "investment", "risk", "finansanalytiker", "skatte", "löneadministratör", "affärskontroller", "banktjänsteman"] },
  { key: "Hälso- och sjukvård", words: ["sjuksköterska", "läkare", "undersköterska", "vård", "sjukhus", "medicin", "omsorg", "hemtjänst", "fysioterapeut", "naprapat", "psykolog", "kurator", "medicinsk", "klinik", "laboratorie", "biomedicin", "apotek", "tandläkare", "tandhygienist", "sjukgymnast"] },
  { key: "Industri", words: ["industri", "produktion", "maskin", "montering", "processoperatör", "truckförare", "lagerarbetare", "logistik", "cnc", "svetsare", "industriarbetare", "packare", "produktionsledare", "lager"] },
  { key: "Bygg", words: ["bygg", "snickare", "målare", "elektriker", "vvs", "anläggning", "byggarbetare", "plåtslagare", "golvläggare", "betong", "takläggare", "carpenter"] },
  { key: "Handel", words: ["försäljning", "säljare", "butik", "handel", "kassa", "varuhus", "e-handel", "butikschef", "kundtjänst", "butiksbiträde", "sälj"] },
  { key: "Offentlig sektor", words: ["kommun", "förvaltning", "handläggare", "socialsekreterare", "polis", "räddning", "brandman", "myndighet", "administratör", "regeringskansli", "samhällsplanerare"] },
  { key: "Konsult", words: ["konsult", "rådgivare", "management", "affärsutvecklare", "managementkonsult"] },
  { key: "Marknadsföring", words: ["marknadsföring", "marketing", "kommunikatör", "content", "sociala medier", "brand", "copywriter", "kommunikation", "grafisk form", "webbdesign", "digital marknadsföring", "pr-"] },
  { key: "Utbildning", words: ["lärare", "utbildning", "skola", "undervisning", "rektor", "föreläsare", "utbildare", "studievägledare", "lektor", "adjunkt", "lärarassistent", "förskollärare", "barnskötare"] },
];

export const SALARY_INDUSTRIES = INDUSTRY_RULES.map((r) => r.key).concat(["Annat"]);

export function classifyIndustry(cv) {
  const parts = [
    cv?.titel || "",
    cv?.profession || "",
    ...(cv?.fardigheter || []).map((f) => f.namn || ""),
    ...(cv?.erfarenhet || []).map((e) => `${e.roll || ""} ${e.foretag || ""} ${e.beskrivning || ""}`),
    cv?.profil || "",
  ];
  const text = " " + parts.join(" ").toLowerCase() + " ";
  let best = "Annat";
  let bestScore = 0;
  for (const rule of INDUSTRY_RULES) {
    let score = 0;
    for (const w of rule.words) {
      if (text.includes(w)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = rule.key;
    }
  }
  return best;
}

export function extractLocation(cv) {
  const addr = (cv?.kontakt?.adress || "").trim();
  if (!addr) return "";
  const parts = addr
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    const city = p.replace(/^\d{3}\s?\d{2}\s*/, "").replace(/^\d{4,5}\s*/, "").trim();
    if (/[A-Za-zÅÄÖåäö]/.test(city)) return city;
  }
  return parts[parts.length - 1] || "";
}