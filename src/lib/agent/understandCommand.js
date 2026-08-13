/**
 * CV Understanding Engine — فهم الأمر (المرحلة الأولى: فهم فقط، بدون تنفيذ).
 * يعيد Intent + Target + Context المقصودين، أو طلب توضيح عند الغموض.
 * لا يعدّل السيرة إطلاقًا.
 */
import { base44 } from "@/api/base44Client";
import { buildAgentContext } from "./contextBuilder";
import { resolveReference } from "./referenceResolver";
import { resolveItemByText } from "./cvSearch";
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
        section: { type: "string" },
        item_ref: { type: "string", description: "t.ex. erfarenhet[1]" },
        field: { type: "string", description: "roll | foretag | period | beskrivning | namn | niva | sprak | examen | skola | profil" },
        search_text: { type: "string", description: "texten användaren pekade på, om ingen ref kunde bestämmas" },
        uses_reference: { type: "boolean", description: "true om användaren använde 'denna/هذه/اللي فوق' m.m." }
      }
    },
    modifiers: { type: "array", items: { type: "string" }, description: "t.ex. mer professionellt, kortare" },
    languages: { type: "array", items: { type: "string" } },
    needs_clarification: { type: "boolean" },
    clarification_question: { type: "string" },
    understanding: { type: "string", description: "kort sammanfattning på användarens språk av vad som efterfrågas" }
  },
  required: ["intent", "needs_clarification", "understanding"]
};

const PROMPT = `Du är förståelselagret i en CV-editor. Din ENDA uppgift är att TOLKA användarens kommando — du utför INGA ändringar.

Regler:
- CV:t ges som strukturerad data (sektioner och element med id). Använd endast dessa id:n.
- Sektioner: profil, erfarenhet, utbildning, fardigheter, sprak.
- Fälten har semantisk roll: job_title (roll), company (foretag), date (period), description (beskrivning), degree (examen), school (skola), skill (namn), language (sprak).
- Kommandon kan blanda arabiska, svenska och engelska i samma mening. Tolka blandat språk korrekt.
- Referensord ("هذه", "اللي فوق", "اللي بعدها", "احذفها", "denna", "nästa") syftar på lastTarget eller dess granne.
- Om målet är otydligt eller flera element matchar: sätt needs_clarification = true och ställ EN kort fråga på användarens språk. GISSA ALDRIG.
- item_ref måste vara exakt ett id ur strukturen (t.ex. "erfarenhet[2]").`;

/**
 * @returns {{
 *  intent: string, target: object|null, modifiers: string[], languages: string[],
 *  needsClarification: boolean, clarificationQuestion: string|null,
 *  understanding: string, resolution: object, context: object
 * }}
 */
export async function understandCommand({ data, message, history = [], lastItemRef = null } = {}) {
  const { index, context } = buildAgentContext({ data, message, history, lastItemRef });

  // 1) حلّ حتمي للإشارات السياقية قبل الاستدعاء
  const reference = resolveReference(message, { index, lastItemRef });

  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `${PROMPT}

CV_STRUCTURE:
${JSON.stringify(context.structure)}

RELEVANT_TEXTS:
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
    model: "gemini_3_flash"
  });

  // 2) تثبيت الهدف: ref من الـ LLM → الإشارة الحتمية → البحث النصي
  const target = res?.target || {};
  let resolvedRef = target.item_ref && getByRef(index, target.item_ref) ? target.item_ref : null;
  let resolution = { status: resolvedRef ? "resolved" : "unresolved", via: resolvedRef ? "llm_ref" : null };

  if (!resolvedRef && reference.status === "resolved") {
    resolvedRef = reference.ref;
    resolution = { status: "resolved", via: reference.reason };
  }
  if (!resolvedRef && target.search_text) {
    const hit = resolveItemByText(index, target.search_text);
    if (hit.status === "resolved") {
      resolvedRef = hit.match.itemRef;
      resolution = { status: "resolved", via: "text_search", match: hit.match };
    } else {
      resolution = { status: hit.status, via: "text_search", candidates: hit.candidates || [] };
    }
  }
  if (!resolvedRef && reference.status === "needs_clarification") {
    resolution = { status: "needs_clarification", via: reference.reason };
  }

  const found = resolvedRef ? getByRef(index, resolvedRef) : null;
  const needsClarification =
    !!res?.needs_clarification || resolution.status === "ambiguous" || resolution.status === "needs_clarification";

  return {
    intent: res?.intent || "unknown",
    target: found
      ? {
          ref: found.item.id,
          section: found.section.section,
          sectionLabel: found.section.label,
          label: found.item.label,
          field: target.field || null,
          fields: found.item.fields.map((f) => ({ field: f.field, role: f.role, value: f.value }))
        }
      : null,
    modifiers: res?.modifiers || [],
    languages: res?.languages || [],
    needsClarification,
    clarificationQuestion: needsClarification
      ? res?.clarification_question || "أي عنصر تقصد بالتحديد؟"
      : null,
    understanding: res?.understanding || "",
    resolution,
    context: context
  };
}