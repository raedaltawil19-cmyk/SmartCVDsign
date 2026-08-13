/**
 * CV Understanding Engine — فهم الأمر (فهم فقط، بدون تنفيذ).
 * يعيد Intent + Target (قسم | عنصر | حقل) أو طلب توضيح عند الغموض.
 * لا يعدّل السيرة إطلاقًا.
 */
import { base44 } from "@/api/base44Client";
import { buildAgentContext } from "./contextBuilder";
import { resolveReference } from "./referenceResolver";
import { resolveTargetByText } from "./cvSearch";
import { getByRef } from "./cvIndex";

const UNDERSTAND_SCHEMA = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: ["locate", "read", "shorten", "expand", "rewrite", "improve_tone", "translate", "delete", "add", "move", "undo", "unknown"]
    },
    target: {
      type: "object",
      properties: {
        target_type: { type: "string", enum: ["section", "item", "field"], description: "vilken nivå användaren pekar på" },
        section: { type: "string", description: "sektionsnyckel ur strukturen, t.ex. kontakt" },
        item_ref: { type: "string", description: "stabilt id, t.ex. contact_main eller experience_8f31a" },
        field: { type: "string", description: "fältnamn eller roll, t.ex. telefon / phone / beskrivning" },
        field_ref: { type: "string", description: "stabilt fält-id, t.ex. contact_main.telefon" },
        search_text: { type: "string", description: "texten användaren pekade på, om inget id kunde bestämmas" },
        uses_reference: { type: "boolean", description: "true om användaren använde 'denna/هذه/اللي فوق' m.m." }
      }
    },
    modifiers: { type: "array", items: { type: "string" } },
    languages: { type: "array", items: { type: "string" } },
    confidence: { type: "number", description: "0-1" },
    needs_clarification: { type: "boolean" },
    clarification_question: { type: "string" },
    understanding: { type: "string", description: "kort sammanfattning på användarens språk av vad som efterfrågas" }
  },
  required: ["intent", "needs_clarification", "understanding"]
};

const PROMPT = `Du är förståelselagret i en CV-editor. Din ENDA uppgift är att TOLKA användarens kommando — du utför INGA ändringar.

Regler:
- CV:t ges som strukturerad data: sektion → element → fält, alla med stabila id:n. Använd endast dessa id:n.
- Varje sektion har "aliases" på svenska, engelska och arabiska, och varje fält har en semantisk "role" (phone, email, address, full_name, headline, description, job_title, company, date, degree, school, skill, language ...). Matcha användarens ord mot dessa aliases/roller — inte mot fasta ord.
- Målet kan ligga på tre nivåer. Sätt target_type korrekt:
  * "section"  → hela sektionen (t.ex. "احذف Kontakt") → section = sektionsnyckel.
  * "item"     → ett helt element (t.ex. en erfarenhet) → item_ref.
  * "field"    → ett enskilt fält (t.ex. telefonnummer) → field_ref (t.ex. "contact_main.telefon") eller item_ref + field.
- Ett fält kan vara TOMT och ändå vara målet ("ليش رقم التلفون ناقص؟" → field_ref contact_main.telefon, intent = read/locate). Kräv aldrig att fältet har ett värde.
- Kommandon kan blanda arabiska, svenska och engelska i samma mening.
- Referensord ("هذه", "اللي فوق", "denna", "nästa") syftar på lastTarget eller dess granne.
- Om målet är otydligt eller flera element matchar: needs_clarification = true och EN kort fråga på användarens språk. GISSA ALDRIG.
- Hitta aldrig på id:n.`;

const asTarget = (found, requestedField) => {
  if (!found) return null;
  if (found.type === "section") {
    return {
      type: "section",
      ref: found.section.section,
      section: found.section.section,
      sectionLabel: found.section.label,
      label: found.section.label,
      field: null,
      fields: found.section.items[0]?.fields.map((f) => ({ field: f.field, role: f.role, value: f.value })) || []
    };
  }
  const base = {
    ref: found.item.id,
    section: found.section.section,
    sectionLabel: found.section.label,
    label: found.item.label,
    fields: found.item.fields.map((f) => ({ field: f.field, role: f.role, value: f.value, empty: f.isEmpty }))
  };
  if (found.type === "field") {
    return {
      ...base,
      type: "field",
      fieldRef: found.field.id,
      field: found.field.field,
      role: found.field.role,
      value: found.field.value,
      isEmpty: found.field.isEmpty
    };
  }
  return { ...base, type: "item", field: requestedField || null };
};

export async function understandCommand({ data, message, history = [], lastItemRef = null } = {}) {
  const { index, context } = buildAgentContext({ data, message, history, lastItemRef });

  // 1) حلّ حتمي للإشارات السياقية قبل الاستدعاء
  const reference = resolveReference(message, { index, lastItemRef });

  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `${PROMPT}

CV_STRUCTURE:
${JSON.stringify(context.structure)}

SINGLE_VALUE_SECTIONS (namn, kontakt, profil):
${JSON.stringify(context.singleSections)}

RELEVANT_MATCHES:
${JSON.stringify(context.relevant)}

LAST_TARGET:
${JSON.stringify(context.lastTarget)}

DETERMINISTIC_REFERENCE_RESOLUTION:
${JSON.stringify(reference)}

CONVERSATION:
${JSON.stringify(context.conversation)}

USER_MESSAGE:
${message}`,
    response_json_schema: UNDERSTAND_SCHEMA,
    model: "gpt_5_6_sol"
  });

  // 2) تثبيت الهدف: field_ref → item_ref(+field) → section(+field) → الإشارة الحتمية → البحث النصي
  const t = res?.target || {};
  let resolvedRef = null;
  let resolution = { status: "unresolved", via: null };

  const tryRef = (ref, via) => {
    if (resolvedRef || !ref) return;
    if (getByRef(index, ref)) {
      resolvedRef = ref;
      resolution = { status: "resolved", via };
    }
  };

  tryRef(t.field_ref, "llm_field_ref");
  if (!resolvedRef && t.item_ref && t.field) tryRef(`${t.item_ref}.${t.field}`, "llm_item_field");
  tryRef(t.item_ref, "llm_item_ref");
  if (!resolvedRef && t.section && t.field) tryRef(`${t.section}.${t.field}`, "llm_section_field");
  if (!resolvedRef && t.target_type === "section") tryRef(t.section, "llm_section");

  if (!resolvedRef && reference.status === "resolved") {
    resolvedRef = reference.ref;
    resolution = { status: "resolved", via: reference.reason };
  }
  if (!resolvedRef) {
    const query = t.search_text || message;
    const hit = resolveTargetByText(index, query);
    if (hit.status === "resolved") {
      resolvedRef = hit.match.ref;
      resolution = { status: "resolved", via: "text_search", match: hit.match };
    } else if (hit.status === "ambiguous") {
      resolution = { status: "ambiguous", via: "text_search", candidates: hit.candidates };
    }
  }
  tryRef(t.section, "llm_section_fallback");
  if (!resolvedRef && reference.status === "needs_clarification") {
    resolution = { status: "needs_clarification", via: reference.reason };
  }

  const found = resolvedRef ? getByRef(index, resolvedRef) : null;
  const needsClarification =
    !!res?.needs_clarification || resolution.status === "ambiguous" || resolution.status === "needs_clarification";

  return {
    intent: res?.intent || "unknown",
    target: asTarget(found, t.field),
    modifiers: res?.modifiers || [],
    languages: res?.languages || [],
    confidence: (() => {
      const base = typeof res?.confidence === "number" ? res.confidence : 0.5;
      if (resolution.status === "ambiguous" || resolution.status === "needs_clarification") return Math.min(base, 0.4);
      if (resolution.status === "resolved" && !String(resolution.via || "").startsWith("llm_")) return Math.max(base, 0.7);
      return base;
    })(),
    needsClarification,
    clarificationQuestion: needsClarification ? res?.clarification_question || "أي عنصر تقصد بالتحديد؟" : null,
    understanding: res?.understanding || "",
    resolution,
    context
  };
}