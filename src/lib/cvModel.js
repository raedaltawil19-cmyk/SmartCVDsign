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

Regler:
- Skriv med en naturlig, mänsklig röst — professionell men inte stel. Undvik AI-klyschor (t.ex. "passionerad", "mångsidig", "resultatorienterad"), adjektivsvalsar och fyllordsmeningar.
- Fokusera på konkreta ansvarsområden och resultat. Använd aktiva verb.
- Hitta inte på information. Om något saknas, lämna fältet tomt.
- profil: 2–3 meningar personlig presentation.
- erfarenhet: nyast först. period på formen "Månad År – Månad År" eller "År – Nu".
- fardigheter: niva 0–100 (50 grund, 70 god, 85 mycket god, 95 expert).
- sprak.niva: "Modersmål", "Flytande", "Goda kunskaper" eller "Grundläggande".
- Behåll resultatet på svenska även om inmatningen är på ett annat språk.

Returnera endast giltig JSON enligt schemat.`;

export const TEMPLATES = [
  { id: "stockholm", namn: "Stockholm", tagline: "Skandinavisk, luftig och ATS-vänlig" },
  { id: "executive", namn: "Executive", tagline: "Exklusiv och hierarkisk" },
  { id: "techpro", namn: "Tech Pro", tagline: "Kompakt med kompetensstaplar" }
];

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