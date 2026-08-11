// ============================================================
// مصفوفة الأوزان السويدية لاقتراح القوالب (بدون LLM)
// تعتمد على كلمات مفتاحية مأخوذة من إعلانات وظائف سويدية حقيقية
// وأنظمة ATS (Teamtailor, Workbuster, SAP SuccessFactors)
// ============================================================

// كل كلمة لها وزن: 3 = قوية (مسمى/أداة صريحة)، 2 = متوسطة، 1 = ضعيفة (سياق عام)
const KEYWORD_MATRIX = {
  techpro: {
    strong: [
      "utvecklare", "systemutvecklare", "programmerare", "java", "python", "react",
      "angular", "vue", "node", "typescript", "javascript", "c#", ".net", "go",
      "rust", "kotlin", "swift", "fullstack", "backend", "frontend", "devops",
      "ci/cd", "docker", "kubernetes", "aws", "azure", "gcp", "cloud", "api",
      "sql", "nosql", "microservices", "agile", "scrum", "kanban", "git",
      "testautomatisering", "tdd", "rest", "graphql", "linux", "ci", "cd",
      "infrastruktur", "systemarkitekt", "mjukvaruingenjör", "data engineer",
      "machine learning", "ai", "llm", "data scientist", "algoritm",
    ],
    medium: [
      "it", "system", "teknisk", "mjukvara", "kod", "databas", "programmering",
      "utveckling", "teknologi", "digitalisering", "automation", "integration",
      "plattform", "arkitektur", "säkerhet", "nätverk", "server", "deployment",
      "release", "bug", "feature", "sprint", "backlog", "tech", "data",
    ],
    weak: [
      "dator", "digital", "teknik", "data", "system", "app",
    ],
  },
  executive: {
    strong: [
      "vd", "chef", "ledarskap", "strategisk", "affärsutveckling", "teamledare",
      "personalansvar", "budgetansvar", "styrelse", "verkställande direktör",
      "regionchef", "avdelningschef", "operativ chef", "finanschef", "hr-chef",
      "it-chef", "marknadschef", "säljchef", "produktionschef", "enhetschef",
      "verksamhetschef", "förvaltningschef", "interimchef", "stabschef",
      "beslutsfattande", "resultatansvar", "p&l", "personalansvar",
    ],
    medium: [
      "ledare", "management", "strategi", "affär", "resultat", "coacha",
      "motivera", "planering", "förändringsledning", "organisationsutveckling",
      "målstyrning", "delegera", "rekrytering", "performance management",
      "budget", "forecast", "affärsplan", "styrdokument", "kpi", "okr",
    ],
    weak: [
      "ansvar", "mål", "projekt", "team", "medarbetare",
    ],
  },
  creative: {
    strong: [
      "ux", "ui", "ux-designer", "ui-designer", "grafisk formgivare", "designer",
      "content", "varumärke", "portfolio", "kreativ", "illustrator", "photoshop",
      "figma", "inddesign", "after effects", "premiere", "branding", "visuell",
      "art director", "creative director", "produktion", "storyboard",
      "animering", "3d", "motion graphics", "skiss", "prototyp", "wireframe",
      "användarupplevelse", "användargränssnitt", "designsystem",
    ],
    medium: [
      "sociala medier", "marknadsföring", "kommikation", "layout", "typografi",
      "färg", "estetik", "reklam", "kampanj", "innehåll", "copy", "copywriter",
      "brand", "identitet", "logo", "ikon", "mockup", "design thinking",
      "användartest", "användarforskning",
    ],
    weak: [
      "bild", "skapande", "idé", "kreativt", "form",
    ],
  },
  nordic: {
    strong: [
      "administratör", "handläggare", "kundservice", "kundtjänst", "logistik",
      "ekonomiassistent", "receptionist", "office manager", "administration",
      "ärendehandläggning", "förvaltningsrätt", "bokföring", "redovisning",
      "lönespecialist", "inköpare", "lagerarbetare", "vårdare", "undersköterska",
      "assistent", "sekreterare", "datainmatning", "registrering",
    ],
    medium: [
      "service", "support", "dokumentation", "bokning", "order", "fakturering",
      "löpande arbete", "rutiner", "kund", "kontor", "mail", "telefon",
      "kalender", "mötesbokning", "reskontra", "attest", "kvitto",
      "kundärende", "klagomål", "retur", "lager",
    ],
    weak: [
      "arbete", "tjänst", "medarbetare", "serviceinriktad",
    ],
  },
  stockholm: {
    strong: [
      "projektledare", "säljare", "marknadsförare", "konsult", "kommikatör",
      "analytiker", "kampanj", "account manager", "key account", "business manager",
      "projektledning", "affärsutvecklare", "marknadsansvarig",
      "kommunikationsansvarig", "säljansvarig", "produktägare", "product owner",
      "scrum master", "kravanalytiker", "kravspecifikation",
    ],
    medium: [
      "projekt", "sälj", "marknad", "kommunikation", "analys", "rapport",
      "presentation", "förhandling", "nätverkande", "kundansvarig", "affär",
      "budget", "målgrupp", "segmentering", "crm", "leads", "prospektering",
      "offert", "avtal", "upphandling", "leverans", "milstolpe",
    ],
    weak: [
      "kund", "möte", "mål", "plan", "roll",
    ],
  },
};

// ============================================================
// دالة المطابقة الموزونة
// تُرجع: { templateId, score, suggestions[] }
// suggestions: قائمة مرتبة بالقالب الأعلى نقاطاً
// ============================================================

function normalize(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .trim();
}

export function scoreTemplate(text, templateId) {
  const matrix = KEYWORD_MATRIX[templateId];
  if (!matrix) return 0;
  const normalized = normalize(text);
  if (!normalized) return 0;

  let score = 0;
  const matched = [];

  for (const kw of matrix.strong) {
    if (normalized.includes(normalize(kw))) {
      score += 3;
      matched.push(kw);
    }
  }
  for (const kw of matrix.medium) {
    if (normalized.includes(normalize(kw))) {
      score += 2;
      matched.push(kw);
    }
  }
  for (const kw of matrix.weak) {
    if (normalized.includes(normalize(kw))) {
      score += 1;
      matched.push(kw);
    }
  }

  return { score, matched };
}

export function suggestTemplates(text) {
  if (!text || text.trim().length < 10) return [];

  const results = [];
  for (const templateId of Object.keys(KEYWORD_MATRIX)) {
    const result = scoreTemplate(text, templateId);
    if (result.score > 0) {
      results.push({ templateId, score: result.score, matched: result.matched });
    }
  }

  // ترتيب تنازلي حسب النقاط
  results.sort((a, b) => b.score - a.score);

  // إرجاع أفضل نتيجة + أي قالب ضمن 30% من الأعلى (للتعادل)
  if (results.length === 0) return [];

  const topScore = results[0].score;
  const threshold = Math.max(2, topScore * 0.7); // ضمن 70% من الأعلى

  return results.filter((r) => r.score >= threshold);
}

export function getTopSuggestion(text) {
  const suggestions = suggestTemplates(text);
  if (suggestions.length === 0) return null;
  return suggestions[0];
}

export function getMatchedKeywords(text, templateId) {
  const result = scoreTemplate(text, templateId);
  return result.matched || [];
}