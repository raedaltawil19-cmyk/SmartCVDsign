import { base44 } from "@/api/base44Client";
import { CV_SCHEMA, CV_PROCESS_PROMPT, mergeCV } from "@/lib/cvModel";
import { LLM_INTERFACE, assertImplements } from "@/services/interfaces";

/**
 * LLMService — single point of access to the language model.
 * Owns every CV/LLM prompt so prompts live next to the surface that uses them,
 * and consumers stay declarative. Behind the interface you can swap to a
 * different model/provider without touching any page.
 */
export function createLLMService() {
  const service = {
    name: "llm",

    /** Generic structured completion — used by tools that keep their own prompt. */
    completeJson({ prompt, schema, fileUrls, model, addContext }) {
      return base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: schema ?? null,
        file_urls: fileUrls || undefined,
        model: model || undefined,
        add_context_from_internet: !!addContext,
      });
    },

    /** Read raw input / uploaded file and build a normalized Swedish CV. */
    async processCV({ text, fileUrl }) {
      const prompt =
        CV_PROCESS_PROMPT +
        "\n\nAnvändarens inmatning (kan vara på valfritt språk, arrangera och översätt till svenska):\n" +
        (text || "(se filen)");
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrl ? [fileUrl] : undefined,
        response_json_schema: CV_SCHEMA,
      });
      return mergeCV(res);
    },

    /** Apply a natural-language instruction to an existing CV, preserving all info. */
    async transformCV(data, instruction) {
      const prompt = `Du är en CV-redigerare. Här är det aktuella CV:t som JSON:\n${JSON.stringify(data)}\n\nInstruktion: ${instruction}\n\nTillämpa instruktionen. Bevara all annan information oförändrad om instruktionen inte uttryckligen säger annat. SAMMANFATTA INTE och FÖRKORTA INTE — behåll allt innehåll. Returnera hela det uppdaterade CV:t som giltig JSON enligt schemat.`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: CV_SCHEMA,
      });
      return mergeCV(res);
    },

    /** ATS analysis — returns score, per-category breakdown, strengths, weaknesses, fixable suggestions. */
    async atsAnalyze(data) {
      const schema = {
        type: "object",
        properties: {
          overallScore: { type: "number" },
          categories: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: { type: "string", enum: ["headings", "keywords", "formatting", "readability", "contact", "skills", "experience", "education", "length", "fileCompatibility"] },
                score: { type: "number" },
                note: { type: "string" },
              },
            },
          },
          strengths: { type: "array", items: { type: "string" } },
          weaknesses: { type: "array", items: { type: "string" } },
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                title: { type: "string" },
                message: { type: "string" },
                fixInstruction: { type: "string" },
              },
            },
          },
        },
      };
      const prompt =
        'Du är en expert på ATS (Applicant Tracking System). Analysera följande CV (JSON) på svenska och bedöm hur väl det presterar när en maskin tolkar det.\n\nCV:\n' +
        JSON.stringify(data) +
        '\n\nBedöm tio kategorier (0-100, högre = bättre) med en kort svensk motivering:\n' +
        '- headings: tydliga, standardiserade avsnittsrubriker\n' +
        '- keywords: branschspecifika nyckelord\n' +
        '- formatting: enhetlig struktur, inga tabeller/kolumnlayouter som bryter parsing\n' +
        '- readability: konkreta, tydliga meningar\n' +
        '- contact: fullständiga kontaktuppgifter (namn, telefon, e-post, ort)\n' +
        '- skills: explicit listade kompetenser\n' +
        '- experience: konkreta och gärna mätbara resultat\n' +
        '- education: tydlig utbildning\n' +
        '- length: lämplig längd (1–2 sidor)\n' +
        '- fileCompatibility: textbaserat och parser-vänligt\n\n' +
        'Beräkna overallScore (0-100) som ett vägt genomsnitt.\n' +
        'Lista strengths (3–6 punkter) och weaknesses (3–6 punkter) på svenska.\n' +
        'Ge sedan suggestions: en lista med konkreta, åtgärdbara förbättringar. Varje förslag ska ha category (en av nycklarna ovan), en kort title, en förklarande message, och en fixInstruction — en svensk imperativ instruktion som en CV-redigerare kan tillämpa direkt (t.ex. "Lägg till en tydlig yrkestitel i sammanfattningen"). SAMMANFATTA INGET och FÖRKORTA INGET i något fixförslag.\n' +
        'Returnera JSON enligt schemat.';
      return base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });
    },

    /** Achievement Optimizer — analyze each work experience, detect weak bullet points, propose improved + rewritten variants. */
    async optimizeAchievements(data) {
      const schema = {
        type: "object",
        properties: {
          experiences: {
            type: "array",
            items: {
              type: "object",
              properties: {
                index: { type: "number" },
                roll: { type: "string" },
                bullets: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      weak: { type: "boolean" },
                      issue: { type: "string" },
                      improved: { type: "string" },
                      rewritten: { type: "string" },
                      placeholder: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      };
      const prompt =
        'Du är en expert på att stärka CV-prestationer. Analysera varje arbetslivserfarenhet i CV:t (JSON på svenska) och dela upp beskrivningen i enskilda punktmeningar ("bullets").\n\nCV:\n' +
        JSON.stringify(data) +
        '\n\nFör varje bullet per erfarenhet bedöm om den är svag (vag, passiv, klysché, saknar mätbarhet).\n' +
        'För svaga bullets, ge:\n' +
        '  - issue: kort svensk förklaring av varför den är svag\n' +
        '  - improved: en starkare version som betonar resultat och mätbarhet — FÖRFINTA INTE fakta eller siffror som inte finns. Saknas siffror, använd realistiska platshållare tydligt markerade, t.ex. "ökade kundnöjdheten med [X] %" eller "[antal] nya kunder".\n' +
        '  - rewritten: en alternativ, mer aktiv och konkret omskrivning (även den utan påhittade fakta)\n' +
        '  - placeholder: en kort rekommendation om vilken typ av mätbarhet användaren kan lägga till (t.ex. "Lägg till antal eller procentsats för kundnöjdhet")\n' +
        'För icke-svaga bullets: weak=false, issue/improved/rewritten/placeholder kan vara tomma strängar, och text är originalet oförändrat.\n' +
        'Viktigast: HITTA PÅ INGA fakta eller siffror som inte uttryckligen finns i originalet. Behåll all existerande information.\n' +
        'Returnera JSON enligt schemat, med experiences i samma ordning och index som i CV:t.';
      return base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });
    },

    /** Refine existing CV text in place (no summarizing). */
    async regenerateCV(data) {
      const prompt =
        "Förbättra och förfina följande befintliga CV-innehåll på svenska. Gör det mer naturligt och konkret, ta bort eventuella klyschor — men SAMMANFATTA INTE och FÖRKORTA INTE: bevara ALL information, alla ansvarsområden och resultat i sin helhet.\n\n" +
        JSON.stringify(data);
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: CV_SCHEMA,
      });
      return mergeCV(res);
    },
  };

  assertImplements(service, LLM_INTERFACE);
  return service;
}