export const emptyCV = {
  namn: "",
  titel: "",
  kontakt: { telefon: "", epost: "", adress: "", linkedin: "" },
  profil: "",
  erfarenhet: [{ roll: "", foretag: "", period: "", beskrivning: "" }],
  utbildning: [{ examen: "", skola: "", period: "", beskrivning: "" }],
  fardigheter: [{ namn: "", niva: 80 }],
  sprak: [{ sprak: "", niva: "" }]
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
    }
  }
};

export const CV_PROCESS_PROMPT = `Du är en erfaren CV-konsult verksam i Sverige. Läs den information eller det dokument användaren tillhandahåller och bygg ett professionellt, välstrukturerat CV på svenska.

Viktigt — bevara ALL information:
- SAMMANFATTA INTE och FÖRKORTA INTE. Ta inte bort detaljer, ansvarsområden, resultat eller uppgifter.
- Översätt och organisera om allt till svenska, men behåll innehållet fullständigt. Skriv ut varje erfarenhet, ansvarsområde och utbildning i sin helhet.
- Skriv med en naturlig, mänsklig röst — professionell men inte stel. Undvik AI-klyschor (t.ex. "passionerad", "mångsidig", "resultatorienterad") och fyllordsmeningar, men töm inte innehållet för att uppnå det.
- Fokusera på konkreta ansvarsområden och resultat. Använd aktiva verb.
- Hitta inte på information. Om något saknas, lämna fältet tomt.
- profil: en personlig presentation (behåll väsentlig information, men i presentationform — inte en lista).
- erfarenhet: nyast först. var beskrivning ska innehålla hela den ursprungliga beskrivningen av ansvarsområden och resultat. period på formen "Månad År – Månad År" eller "År – Nu".
- fardigheter: niva 0–100 (50 grund, 70 god, 85 mycket god, 95 expert). Ta med alla färdigheter som nämns.
- sprak.niva: "Modersmål", "Flytande", "Goda kunskaper" eller "Grundläggande".
- Behåll resultatet på svenska även om inmatningen är på ett annat språk.

Returnera endast giltig JSON enligt schemat.`;

export const TEMPLATES = [
  { id: "stockholm", namn: "Stockholm", tagline: "Skandinavisk, luftig och ATS-vänlig" },
  { id: "executive", namn: "Executive", tagline: "Exklusiv och hierarkisk" },
  { id: "techpro", namn: "Tech Pro", tagline: "Kompakt med kompetensstaplar" }
];

export const SECTIONS = [
  { key: "profil", label: "Profil" },
  { key: "erfarenhet", label: "Arbetslivserfarenhet" },
  { key: "utbildning", label: "Utbildning" },
  { key: "fardigheter", label: "Färdigheter" },
  { key: "sprak", label: "Språk" }
];

export const DEFAULT_LAYOUTS = {
  stockholm: { main: ["profil", "erfarenhet", "utbildning"], sidebar: ["fardigheter", "sprak"] },
  executive: { main: ["profil", "erfarenhet", "utbildning", "fardigheter", "sprak"], sidebar: [] },
  techpro: { main: ["profil", "erfarenhet", "utbildning"], sidebar: ["fardigheter", "sprak"] }
};

export function normalizeLayout(layout, templateId) {
  const def = DEFAULT_LAYOUTS[templateId] || DEFAULT_LAYOUTS.stockholm;
  const valid = new Set(SECTIONS.map(s => s.key));
  const clean = { main: (layout?.main || def.main).filter(k => valid.has(k)), sidebar: (layout?.sidebar || def.sidebar).filter(k => valid.has(k)) };
  const placed = new Set([...clean.main, ...clean.sidebar]);
  for (const k of def.main) if (!placed.has(k)) { clean.main.push(k); placed.add(k); }
  for (const k of def.sidebar) if (!placed.has(k)) { clean.sidebar.push(k); placed.add(k); }
  return clean;
}

export function mergeCV(res) {
  const r = res || {};
  return {
    namn: r.namn || "",
    titel: r.titel || "",
    kontakt: {
      telefon: r.kontakt?.telefon || "",
      epost: r.kontakt?.epost || "",
      adress: r.kontakt?.adress || "",
      linkedin: r.kontakt?.linkedin || ""
    },
    profil: r.profil || "",
    erfarenhet: (r.erfarenhet && r.erfarenhet.length) ? r.erfarenhet.map(e => ({ roll: e.roll || "", foretag: e.foretag || "", period: e.period || "", beskrivning: e.beskrivning || "" })) : emptyCV.erfarenhet,
    utbildning: (r.utbildning && r.utbildning.length) ? r.utbildning.map(u => ({ examen: u.examen || "", skola: u.skola || "", period: u.period || "", beskrivning: u.beskrivning || "" })) : emptyCV.utbildning,
    fardigheter: (r.fardigheter && r.fardigheter.length) ? r.fardigheter.map(f => ({ namn: f.namn || "", niva: typeof f.niva === "number" ? f.niva : 80 })) : emptyCV.fardigheter,
    sprak: (r.sprak && r.sprak.length) ? r.sprak.map(s => ({ sprak: s.sprak || "", niva: s.niva || "" })) : emptyCV.sprak
  };
}