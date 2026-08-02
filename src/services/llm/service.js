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

    /** Generate a professional Swedish explanation for an employment gap (no invented facts). */
    async generateGapExplanation({ category, durationText, custom }) {
      const prompt =
        `Skriv en kort, professionell förklaring på svenska (1–2 meningar, första person) till ett karriäruppehåll.\n` +
        `Kategori: ${category}\n` +
        `Längd på uppehållet: ${durationText}\n` +
        (custom ? `Användarens egna anteckning att väva in naturligt: "${custom}"\n` : "") +
        `Regler: Formuleringen ska vara ärlig, naturlig och professionell. HITTA INGET på fakta — undvik specifika platser, årskurs eller program om de inte nämns i anteckningen. Om kategorin är Studier/Frilans/etc. får det beskrivas generellt. Returnera ENDAST meningen (ingen rubrik, inga citationstecken).`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      return typeof res === "string" ? res.trim() : String(res || "");
    },

    /** Interview Assistant — generate expected questions + suggested answers + questions to ask the employer. */
    async generateInterviewPrep({ cv, jobAd, difficulty, language }) {
      const langName = language === "en" ? "English" : "Swedish (svenska)";
      const diffMap = { easy: "Lätt / Easy — introduktionsnivå, avsedd för att värma upp.", medium: "Medium — standardnivå för en kvalificerad kandidat.", advanced: "Avancerad / Advanced — djupa, tekniska och strategiska frågor för seniora roller." };
      const schema = {
        type: "object",
        properties: {
          behavioral: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                suggestedAnswer: { type: "string" },
              },
            },
          },
          technical: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                suggestedAnswer: { type: "string" },
              },
            },
          },
          general: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                suggestedAnswer: { type: "string" },
              },
            },
          },
          questionsToAsk: {
            type: "array",
            items: { type: "string" },
          },
        },
      };
      const prompt =
        `Du är en erfaren rekryterare och intervjukoordinator. Förbered en intervjuträning baserad på kandidatens CV och en jobbannons.\n\n` +
        `Allt innehåll ska vara på ${langName}.\n` +
        `Svårighetsgrad: ${diffMap[difficulty] || diffMap.medium}\n\n` +
        `CV (JSON):\n${JSON.stringify(cv)}\n\n` +
        (jobAd ? `Jobbannons:\n${jobAd}\n\n` : "") +
        `Regler:\n` +
        `- Förslagna svar ska vara förstagperson, professionella och bygga plausibelt på kandidatens faktiska erfarenhet i CV:t. HITTA INGET på fakta som inte finns — referera hellre generellt eller använd typiska exempel.\n` +
        `- Generera 3–5 "behavioral"-frågor (övrigt om musik- och situationsbaserade frågor).\n` +
        `- Generera 3–5 tekniska frågor relaterade till de färdigheter och roller som framgår av CV:t (om CV:t är icke-tekniskt, gör dem branschspecifika/professionella).\n` +
        `- Generera 2–3 allmänna/öppningsfrågor ("Berätta om dig själv", motivation, etc.).\n` +
        `- Generera 4–6 väl genomtänkta frågor som kandidaten bör ställa till arbetsgivaren (questionsToAsk) — korta, professionella strängar.\n` +
        `Returnera giltig JSON enligt schemat. Alla textfält på ${langName}.`;
      return base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });
    },

    /** LinkedIn Import — extract a LinkedIn profile (text or uploaded file) into a Swedish CV with certifikat/projekt as separate arrays. */
    async importLinkedIn({ text, fileUrl }) {
      const cvObjSchema = {
        type: "object",
        properties: {
          ...CV_SCHEMA.properties,
          certifikat: {
            type: "array",
            items: {
              type: "object",
              properties: { namn: { type: "string" }, utvardare: { type: "string" }, datum: { type: "string" } },
            },
          },
          projekt: {
            type: "array",
            items: {
              type: "object",
              properties: { namn: { type: "string" }, beskrivning: { type: "string" }, period: { type: "string" } },
            },
          },
        },
      };
      const schema = { type: "object", properties: { cv: cvObjSchema } };
      const prompt =
        `Du är en CV-konverterare. Användaren vill importera sin LinkedIn-profil till ett svenskt CV.\n\n` +
        `Innehåll (text från profilsidan eller en LinkedIn-export/PDF):\n` +
        (fileUrl ? "(se filen)" : (text || "(tomt)")) + `\n\n` +
        `Kartlägg extraheringen:\n` +
        `- Name/Headline → namn och titel\n` +
        `- About/Summary → profil\n` +
        `- Experience → erfarenhet (roll, foretag, period "Månad År – Månad År" eller "År – Nu", beskrivning med hela ansvarsområden)\n` +
        `- Education → utbildning\n` +
        `- Skills → fardigheter (niva 0–100; 70 om osäkert)\n` +
        `- Languages → sprak (niva: "Modersmål" / "Flytande" / "Goda kunskaper" / "Grundläggande")\n` +
        `- Certifications & Licenses → certifikat (namn, utvardare, datum)\n` +
        `- Projects → projekt (namn, beskrivning, period)\n` +
        `- Kontakt: kontakt.linkedin om länk finns; epost/telefon/adress om de framgår.\n\n` +
        `Regler: Bevara ALL information och översätt till svenska. Skriv naturligt och professionellt — SAMMANFATTA INTE. HITTA INGET på fakta som inte finns; lämna fält tomt om data saknas. Returnera giltig JSON med ett "cv"-objekt enligt schemat.`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: schema,
        file_urls: fileUrl ? [fileUrl] : undefined,
      });
      return res?.cv || res || {};
    },

    /** Salary Advisor — estimate salary for the Swedish market based on role/region/experience/industry. */
    async estimateSalary({ jobTitle, region, experience, industry }) {
      const schema = {
        type: "object",
        properties: {
          averageMonthly: { type: "number", description: "Genomsnittlig månadslön (SEK) före skatt" },
          lowMonthly: { type: "number", description: "Lägsta typiska månadslön (SEK)" },
          highMonthly: { type: "number", description: "Högsta typiska månadslön (SEK)" },
          recommendedRange: {
            type: "object",
            properties: {
              low: { type: "number" },
              target: { type: "number" },
              high: { type: "number" },
            },
          },
          percentile25: { type: "number" },
          median: { type: "number" },
          percentile75: { type: "number" },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
          confidenceNote: { type: "string" },
          currency: { type: "string" },
          sourceContext: { type: "string", description: "Kort svensk kommentar om datamängdens grund" },
          negotiationTips: { type: "array", items: { type: "string" } },
        },
      };
      const expMap = { junior: "Junior (0–2 års erfarenhet)", mid: "Mid-level (3–6 års erfarenhet)", senior: "Senior (7+ års erfarenhet)" };
      const prompt =
        `Du är en svensk löneexpert med kännedom om den svenska arbetsmarknaden och kollektivavtal.\n` +
        `Uppskatta en realistisk månadslön (SEK, före skatt) för följande profil i Sverige:\n` +
        `- Titel: ${jobTitle}\n` +
        `- Region: ${region || "Sverige (genomsnitt)"}\n` +
        `- Erfarenhetsnivå: ${expMap[experience] || expMap.mid}\n` +
        `- Bransch: ${industry || "Inte angiven"}\n\n` +
        `Regler:\n` +
        `- Basera uppskattningen på svensk marknad 2024–2025. Om du inte har exakt data, ange en realistisk genomsnittsuppskattning och sätt confidence till "low" eller "medium".\n` +
        `- averageMonthly = realistiskt genomsnitt; lowMonthly/highMonthly = typiskt spann för nivån.\n` +
        `- recommendedRange = förhandlingsintervall (low/target/high) där target ofta är ca averageMonthly eller något högre, low = ett tryggt minimikrav, high = ett ambitiöst men rimligt mål für en erfaren kandidat.\n` +
        `- percentile25/median/percentile75 = månadslön vid 25:e/50:e/75:e percentilen för denna profil.\n` +
        `- confidence: "high" endast om du är säker på svenska löner för exakt denna roll/nivå; "medium" för bra generell uppskattning; "low" om data osäker.\n` +
        `- confidenceNote: kort svensk förklaring (max 2 meningar) om varför.\n` +
        `- sourceContext: kort svensk kommentar om vad uppskattningen baseras på (marknadstrender, bransch, region).\n` +
        `- negotiationTips: 3–5 korta svenska tips inför löneförhandlingen relevanta för denna profil.\n` +
        `- currency = "SEK".\n` +
        `Returnera giltig JSON enligt schemat. HITTA INTE på orimliga siffror — håll dig till svensk marknadsnivå.`;
      return base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema, add_context_from_internet: true, model: "gemini_3_flash" });
    },

    /** Company Tailoring — analyze a company's culture and rewrite the CV to fit it, logging every change. */
    async tailorCompany({ data, companyName, jobDescription }) {
      const cvObjSchema = { type: "object", properties: { ...CV_SCHEMA.properties } };
      const schema = {
        type: "object",
        properties: {
          culture: {
            type: "object",
            properties: {
              summary: { type: "string", description: "Kort svensk analys av företagets kultur och värderingar" },
              values: { type: "array", items: { type: "string" }, description: "Nyckelvärden/inslag i kulturen (svenska)" },
              tone: { type: "string", description: "Rekommenderad ton för CV:t till detta företag" },
              keywords: { type: "array", items: { type: "string" }, description: "Nyckelord som företaget värdesätter" },
            },
          },
          cv: cvObjSchema,
          changes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                section: { type: "string", enum: ["titel", "profil", "fardigheter", "erfarenhet", "utbildning", "sprak"] },
                field: { type: "string", description: "Vilket fält (t.ex. 'erfarenhet[0].beskrivning' eller 'profil')" },
                original: { type: "string" },
                modified: { type: "string" },
                reason: { type: "string", description: "Svensk förklaring av varför ändringen gjordes (kopplad till kultur/annons)" },
              },
            },
          },
        },
      };
      const prompt =
        `Du är en CV-konsult och företagsanalytiker. Skräddarsytt ett befintligt CV till ett specifikt företag.\n\n` +
        `Företag: ${companyName}\n` +
        (jobDescription ? `Jobbannons:\n${jobDescription}\n\n` : "\n") +
        `Befintligt CV (JSON, svenska):\n${JSON.stringify(data)}\n\n` +
        `Steg 1 — Analysera företagets kultur (använd webbsökning om företaget finns offentligt): sammanfatta kulturen och värderingarna, rekommendera en lämplig ton, och lista nyckelord företaget värdesätter. Allt på svenska.\n` +
        `Steg 2 — Skriv om CV:t så att det passar företaget, genom att justera:\n` +
        `- titel och profil (professional summary) så de speglar företagets värderingar och annonsens krav\n` +
        `- fardigheter (och deras niva) så relevanta kompetenser lyfts och nyckelord inkluderas\n` +
        `- erfarenhet.beskrivning (achievements) så de betonar resultat och formuleringar som resonerar med kulturen\n` +
        `- keywords integrerat naturligt i texterna\n` +
        `- ton enligt den rekommenderade tonen\n` +
        `Regler: Bevara ALL information — SAMMANFATTA INTE eller ta bort fakta. Hitta INTE på erfarenheter som inte finns. För erfarenheter utan koppling till företaget: behåll dem men justera formuleringarna mot företagets språk.\n` +
        `Steg 3 — För EVERY faktisk ändring du gör (text som skiljer sig från originalet), skapa en change-post: section, field (exakt vilket fält, t.ex. "profil" eller "erfarenhet[2].beskrivning"), original (ursprunglig text), modified (ny text), reason (svensk, kopplad till kultur/annons -- varför denna specifika ändring). Lämna OFÖRÄNDRADE fält helt utan change-post. Hoppa INTE över några ändringar.\n` +
        `Returnera giltig JSON enligt schemat med culture, cv (hela det skräddarsydda CV:t) och changes.`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: schema,
        add_context_from_internet: true,
        model: "gemini_3_flash",
      });
      return { culture: res?.culture, cv: res?.cv || {}, changes: res?.changes || [] };
    },

    /** Recommend real online courses to address a set of weak skills for a role. */
    async recommendCourses({ jobTitle, weakSkills }) {
      const schema = {
        type: "object",
        properties: {
          courses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                provider: { type: "string" },
                url: { type: "string" },
                level: { type: "string", enum: ["Nybörjare", "Medel", "Avancerad"] },
                reason: { type: "string" },
              },
            },
          },
        },
      };
      const prompt =
        `Rekommendera 3–6 konkreta, verifierbara onlinekurser som adresserar specifika svaga färdigheter för en "${jobTitle || "yrkesverksam"}" på den svenska arbetsmarknaden.\n` +
        `Svaga färdigheter att täcka: ${(weakSkills && weakSkills.length ? weakSkills.join(", ") : "allmän branschrelevant kompetens")}.\n\n` +
        `För varje kurs: title, provider (t.ex. Coursera, edX, Udemy, LinkedIn Learning, Pluralsight, Khan Academy), url (riktig kurslänk om känd), level, reason (svenska, 1 mening varför den hjälper för denna roll/färdighet).\n` +
        `Returnera giltig JSON enligt schemat. Hitta INTE på plattformar som inte finns — håll dig till välkända plattformar.`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: schema,
        add_context_from_internet: true,
        model: "gemini_3_flash",
      });
      return res?.courses || [];
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