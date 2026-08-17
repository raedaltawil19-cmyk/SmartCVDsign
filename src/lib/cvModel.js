export const emptyCV = {
  namn: "",
  titel: "",
  kontakt: { telefon: "", epost: "", adress: "", linkedin: "" },
  profil: "",
  erfarenhet: [{ roll: "", foretag: "", period: "", beskrivning: "" }],
  utbildning: [{ examen: "", skola: "", period: "", beskrivning: "" }],
  fardigheter: [{ namn: "", niva: 80 }],
  sprak: [{ sprak: "", niva: "" }],
  references: []
};

export const CV_SCHEMA = {
  type: "object",
  properties: {
    namn: { type: "string" },
    titel: { type: "string" },
    kontakt: {
      type: "object",
      properties: {
        telefon: { type: "string" },
        epost: { type: "string" },
        adress: { type: "string" },
        linkedin: { type: "string" }
      }
    },
    profil: { type: "string" },
    erfarenhet: {
      type: "array",
      items: {
        type: "object",
        properties: {
          roll: { type: "string" },
          foretag: { type: "string" },
          period: { type: "string" },
          beskrivning: { type: "string" }
        }
      }
    },
    utbildning: {
      type: "array",
      items: {
        type: "object",
        properties: {
          examen: { type: "string" },
          skola: { type: "string" },
          period: { type: "string" },
          beskrivning: { type: "string" }
        }
      }
    },
    fardigheter: {
      type: "array",
      items: {
        type: "object",
        properties: { namn: { type: "string" }, niva: { type: "number" } }
      }
    },
    sprak: {
      type: "array",
      items: {
        type: "object",
        properties: { sprak: { type: "string" }, niva: { type: "string" } }
      }
    },
    references: {
      type: "array",
      items: {
        type: "object",
        properties: {
          namn: { type: "string" },
          relation: { type: "string" },
          kontakt: { type: "string" }
        }
      }
    }
  }
};

export const CV_PROCESS_PROMPT = `Du är en erfaren CV-konsult verksam i Sverige. Läs den information eller det dokument användaren tillhandahåller och bygg ett professionellt, välstrukturerat CV på svenska.

Viktigt — bevara ALL information:
- SAMMANFATTA INTE och FÖRKORTA INTE. Ta inte bort detaljer, ansvarsområden, resultat eller uppgifter.
- Organisera om allt till CV:ts språk (se språkregeln nedan), men behåll innehållet fullständigt. Skriv ut varje erfarenhet, ansvarsområde och utbildning i sin helhet.
- Skriv med en naturlig, mänsklig röst — professionell men inte stel. Undvik AI-klyschor (t.ex. "passionerad", "mångsidig", "resultatorienterad") och fyllordsmeningar, men töm inte innehållet för att uppnå det.
- Fokusera på konkreta ansvarsområden och resultat. Använd aktiva verb.
- Hitta inte på information. Om något saknas, lämna fältet tomt.
- profil: en personlig presentation (behåll väsentlig information, men i presentationform — inte en lista).
- erfarenhet: nyast först. var beskrivning ska innehålla hela den ursprungliga beskrivningen av ansvarsområden och resultat. period på formen "Månad År – Månad År" eller "År – Nu".
- fardigheter: niva 0–100 (50 grund, 70 god, 85 mycket god, 95 expert). Ta med alla färdigheter som nämns.
- sprak.niva: "Modersmål", "Flytande", "Goda kunskaper" eller "Grundläggande".
- Språk: Identifiera inmatningens dominerande språk och skapa CV:t på samma språk. Om inmatningen är tom eller språket inte går att avgöra, använd svenska.

Returnera endast giltig JSON enligt schemat.`;

export const TEMPLATES = [
  { id: "stockholm", namn: "Stockholm", tagline: "Skandinavisk, luftig och ATS-vänlig" },
  { id: "executive", namn: "Executive", tagline: "Exklusiv och hierarkisk" },
  { id: "techpro", namn: "Tech Pro", tagline: "Kompakt med kompetensstaplar" },
  { id: "creative", namn: "Creative Edge", tagline: "Färgstark och modern" },
  { id: "nordic", namn: "Nordic Minimal", tagline: "Minimal, luftig och elegant" }
];

export const SECTIONS = [
  { key: "profil", label: "Profil" },
  { key: "erfarenhet", label: "Arbetslivserfarenhet" },
  { key: "utbildning", label: "Utbildning" },
  { key: "fardigheter", label: "Färdigheter" },
  { key: "sprak", label: "Språk" },
  { key: "references", label: "Referenser" }
];

export const DEFAULT_LAYOUTS = {
  stockholm: { main: ["profil", "erfarenhet", "utbildning", "references"], sidebar: ["fardigheter", "sprak"] },
  executive: { main: ["profil", "erfarenhet", "utbildning", "references", "fardigheter", "sprak"], sidebar: [] },
  techpro: { main: ["profil", "erfarenhet", "utbildning", "references"], sidebar: ["fardigheter", "sprak"] },
  creative: { main: ["profil", "erfarenhet", "utbildning", "references"], sidebar: ["fardigheter", "sprak"] },
  nordic: { main: ["profil", "erfarenhet", "utbildning", "references", "fardigheter", "sprak"], sidebar: [] }
};

export function normalizeLayout(layout, templateId) {
  const def = DEFAULT_LAYOUTS[templateId] || DEFAULT_LAYOUTS.stockholm;
  const valid = new Set(SECTIONS.map(s => s.key));
  const mainArr = (layout?.main || def.main).filter(k => valid.has(k));
  const mainSeen = new Set(mainArr);
  // منع التكرار: لا يظهر أي قسم في العمودين معاً
  const sideArr = (layout?.sidebar || def.sidebar).filter(k => valid.has(k) && !mainSeen.has(k));
  const clean = { main: mainArr, sidebar: sideArr };
  const placed = new Set([...clean.main, ...clean.sidebar]);
  for (const k of def.main) if (!placed.has(k)) { clean.main.push(k); placed.add(k); }
  for (const k of def.sidebar) if (!placed.has(k)) { clean.sidebar.push(k); placed.add(k); }
  return clean;
}

export function mergeCV(res, base) {
  const r = res || {};
  const b = base || {};
  const pick = (val, fallback) => (val !== undefined && val !== null && val !== "") ? val : (fallback || "");
  // kontakt: إذا الـ LLM أرجع كائن kontakt بمفاتيح، نثق بقيمه (حتى الفارغة = حذف مقصود).
  // فقط عند غياب kontakt تماماً نحافظ على القديم.
  const kontaktKeys = r.kontakt && typeof r.kontakt === "object" ? Object.keys(r.kontakt) : [];
  const useKontakt = kontaktKeys.length > 0;
  return {
    namn: pick(r.namn, b.namn),
    titel: pick(r.titel, b.titel),
    kontakt: useKontakt
      ? {
          telefon: r.kontakt.telefon || "",
          epost: r.kontakt.epost || "",
          adress: r.kontakt.adress || "",
          linkedin: r.kontakt.linkedin || ""
        }
      : { telefon: b.kontakt?.telefon || "", epost: b.kontakt?.epost || "", adress: b.kontakt?.adress || "", linkedin: b.kontakt?.linkedin || "" },
    profil: pick(r.profil, b.profil),
    erfarenhet: (r.erfarenhet && r.erfarenhet.length) ? r.erfarenhet.map(e => ({ roll: e.roll || "", foretag: e.foretag || "", period: e.period || "", beskrivning: e.beskrivning || "" })) : (b.erfarenhet || emptyCV.erfarenhet),
    utbildning: (r.utbildning && r.utbildning.length) ? r.utbildning.map(u => ({ examen: u.examen || "", skola: u.skola || "", period: u.period || "", beskrivning: u.beskrivning || "" })) : (b.utbildning || emptyCV.utbildning),
    fardigheter: (r.fardigheter && r.fardigheter.length) ? r.fardigheter.map(f => ({ namn: f.namn || "", niva: typeof f.niva === "number" ? f.niva : 80 })) : (b.fardigheter || emptyCV.fardigheter),
    sprak: (r.sprak && r.sprak.length) ? r.sprak.map(s => ({ sprak: s.sprak || "", niva: s.niva || "" })) : (b.sprak || emptyCV.sprak),
    references: Array.isArray(r.references) ? r.references.map(x => ({ namn: x.namn || "", relation: x.relation || "", kontakt: x.kontakt || "" })) : (b.references || emptyCV.references)
  };
}