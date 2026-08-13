/**
 * AI CV Editor Agent — READ ONLY MODE.
 * يجلس فوق طبقة الفهم الموجودة (cvIndex → cvSearch → referenceResolver →
 * contextBuilder → understandCommand) ولا يعيد بناء أي منطق بحث أو سياق.
 *
 * قيد صريح: هذا الوكيل لا يملك أي أداة تعديل/حذف/نقل. لا يستدعي
 * cvRepository ولا يعيد أي بيانات سيرة معدّلة — يعيد نصًا فقط.
 */
import { base44 } from "@/api/base44Client";
import { understandCommand } from "./understandCommand";

const READ_ONLY_INTENTS = new Set(["locate", "read", "unknown"]);

const REPLY_PROMPT = `Du är en CV-assistent i LÄSLÄGE. Du kan läsa och förklara CV:t men du kan INTE ändra, ta bort eller flytta något — verktyg för det finns inte.

Svarsregler:
- Svara på användarens språk (arabiska, svenska eller engelska — matcha meddelandet; blandat språk är tillåtet).
- Max 2–3 korta meningar. Ingen inre tankekedja, inga id:n, ingen JSON, inga rubriker.
- intent = locate: säg var elementet finns (sektion + etikett).
- intent = read: återge det efterfrågade fältets innehåll.
- Ändringsintention (shorten/expand/rewrite/improve_tone/translate/delete/move/add): beskriv KORT vad du hade ändrat och nämn att du inte utför ändringar i detta läge.
- Använd endast FACTS nedan. Hitta aldrig på innehåll.`;

/**
 * @param {object} p
 * @param {object} p.data السيرة الحقيقية (cvModel) — تُمرَّر من التطبيق
 * @param {string} p.message رسالة المستخدم
 * @param {Array}  p.history [{role, content}]
 * @param {string|null} p.lastItemRef معرّف ثابت للعنصر الذي كان الحديث عنه
 * @returns {{ reply: string, internal: object, lastItemRef: string|null }}
 */
export async function runCVAgent({ data, message, history = [], lastItemRef = null } = {}) {
  const u = await understandCommand({ data, message, history, lastItemRef });

  const internal = {
    intent: u.intent,
    targetId: u.target?.ref || null,
    field: u.target?.field || null,
    modifiers: u.modifiers,
    confidence: u.confidence,
    reasoning_summary: u.understanding,
    resolution: u.resolution,
    readOnly: true,
    wouldMutate: !READ_ONLY_INTENTS.has(u.intent)
  };

  if (u.needsClarification || !u.target) {
    return {
      reply: u.clarificationQuestion || "لم أتعرّف على العنصر المقصود — أي قسم أو عنصر تقصد؟",
      internal,
      lastItemRef
    };
  }

  const facts = {
    intent: u.intent,
    modifiers: u.modifiers,
    requested_field: u.target.field,
    section: u.target.sectionLabel,
    item_label: u.target.label,
    item_fields: u.target.fields
  };

  const reply = await base44.integrations.Core.InvokeLLM({
    prompt: `${REPLY_PROMPT}

FACTS:
${JSON.stringify(facts)}

USER_MESSAGE:
${message}`,
    model: "gemini_3_flash"
  });

  return { reply: String(reply || "").trim(), internal, lastItemRef: u.target.ref };
}