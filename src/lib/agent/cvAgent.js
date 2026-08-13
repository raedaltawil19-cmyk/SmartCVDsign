/**
 * AI CV Editor Agent.
 * يجلس فوق طبقة الفهم (cvIndex → cvSearch → referenceResolver →
 * contextBuilder → understandCommand) ولا يعيد بناء أي منطق بحث أو سياق.
 *
 * قاعدة أساسية: الـLLM لا يعدّل cvModel أبدًا. يختار أداة + وسائط فقط،
 * والأداة (tools/registry.js) هي التي تنفّذ التعديل، ثم يتحقق runner قبل الحفظ.
 */
import { base44 } from "@/api/base44Client";
import { understandCommand } from "./understandCommand";
import { runTool } from "./tools/runner";
import { TOOLS } from "./tools/registry";

const READ_ONLY_INTENTS = new Set(["locate", "read", "unknown"]);

const REPLY_PROMPT = `Du är en CV-assistent. Svara på användarens språk (arabiska, svenska eller engelska — matcha meddelandet, blandat språk är tillåtet).
Max 2–3 korta meningar. Ingen inre tankekedja, inga id:n, ingen JSON.
- intent = locate: säg var elementet finns (sektion + etikett).
- intent = read: återge det efterfrågade fältets innehåll.
Använd endast FACTS nedan. Hitta aldrig på innehåll.`;

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    tool: { type: "string", enum: [...Object.keys(TOOLS), "none"] },
    args: {
      type: "object",
      properties: {
        targetId: { type: "string", description: "stabilt id, exakt som givet" },
        field: { type: "string", description: "fältnamn i cvModel, t.ex. beskrivning" },
        value: { type: "string", description: "endast för edit_text: den nya fullständiga texten" },
        text: { type: "string", description: "endast för delete_text: exakt textbit som ska bort" },
        beforeId: { type: "string" },
        afterId: { type: "string" },
        position: { type: "string", enum: ["first", "last"] },
        section: { type: "string", enum: ["profil", "erfarenhet", "utbildning", "fardigheter", "sprak"] }
      }
    },
    needs_clarification: { type: "boolean" },
    clarification_question: { type: "string" },
    user_message: { type: "string", description: "kort bekräftelse på användarens språk om vad som görs" }
  },
  required: ["tool", "needs_clarification"]
};

const PLAN_PROMPT = `Du väljer EXAKT ETT verktyg som utför användarens ändring i ett CV. Du ändrar inget själv — verktyget gör jobbet.

Verktyg:
- edit_text(targetId, field, value): ersätt ett fälts text helt. Använd detta för omskrivning, förkortning, förlängning och tonändring — skriv då den färdiga nya texten i "value", på SAMMA språk som originaltexten.
- delete_text(targetId, field, text): ta bort en specifik textbit inuti ett fält (elementet behålls).
- delete_item(targetId): radera ett helt element.
- move_item(targetId, beforeId | afterId | position): flytta element inom sin sektion.
- delete_section(section): radera en hel sektion.

Regler:
- targetId/beforeId/afterId måste vara stabila id:n ur CV_STRUCTURE — hitta aldrig på id.
- Uppfinn ALDRIG nytt CV-innehåll. Vid omskrivning: utgå enbart från befintlig text.
- Om målet eller åtgärden är otydlig, eller flera element kan matcha: tool = "none", needs_clarification = true och ställ EN kort fråga.
- Radera aldrig mer än användaren bad om. "ta bort namnet ur beskrivningen" = delete_text, inte delete_item.`;

/**
 * @param {object} p
 * @param {object} p.data السيرة الحالية (cvModel)
 * @param {object} p.layout هيكل الأعمدة الحالي
 * @param {string} p.message رسالة المستخدم
 * @param {Array}  p.history [{role, content}]
 * @param {string|null} p.lastItemRef معرّف ثابت لآخر عنصر تم الحديث عنه
 * @param {boolean} p.allowEdits false = وضع القراءة فقط
 * @returns {{ reply, internal, lastItemRef, change: {data, layout, operation}|null }}
 */
export async function runCVAgent({ data, layout = null, message, history = [], lastItemRef = null, allowEdits = true } = {}) {
  const u = await understandCommand({ data, message, history, lastItemRef });

  const internal = {
    intent: u.intent,
    targetId: u.target?.ref || null,
    field: u.target?.field || null,
    modifiers: u.modifiers,
    confidence: u.confidence,
    reasoning_summary: u.understanding,
    resolution: u.resolution,
    tool: null,
    readOnly: !allowEdits
  };

  const wantsChange = !READ_ONLY_INTENTS.has(u.intent);
  const sectionOnly = u.intent === "delete" && !u.target;

  if (u.needsClarification || (!u.target && !sectionOnly)) {
    return {
      reply: u.clarificationQuestion || "لم أتعرّف على العنصر المقصود — أي قسم أو عنصر تقصد؟",
      internal,
      lastItemRef,
      change: null
    };
  }

  const facts = {
    intent: u.intent,
    modifiers: u.modifiers,
    requested_field: u.target?.field || null,
    section: u.target?.sectionLabel || null,
    item_label: u.target?.label || null,
    item_fields: u.target?.fields || null
  };

  // ── مسار التعديل: تخطيط أداة ثم تنفيذها عبر runner ──
  if (wantsChange && allowEdits) {
    const plan = await base44.integrations.Core.InvokeLLM({
      prompt: `${PLAN_PROMPT}

CV_STRUCTURE:
${JSON.stringify(u.context.structure)}

RESOLVED_TARGET:
${JSON.stringify(u.target)}

UNDERSTANDING:
${JSON.stringify({ intent: u.intent, modifiers: u.modifiers, field: u.target?.field })}

USER_MESSAGE:
${message}`,
      response_json_schema: PLAN_SCHEMA,
      model: "gpt_5_6_sol"
    });

    internal.tool = plan?.tool || "none";
    internal.args = plan?.args || {};

    if (plan?.needs_clarification || !plan?.tool || plan.tool === "none") {
      return {
        reply: plan?.clarification_question || "لم يتضح لي المطلوب بالضبط — هل توضّح أكثر؟",
        internal,
        lastItemRef: u.target?.ref || lastItemRef,
        change: null
      };
    }

    const args = { ...(plan.args || {}) };
    if (!args.targetId && u.target?.ref) args.targetId = u.target.ref;

    const res = runTool(plan.tool, args, { data, layout });
    internal.result = { ok: res.ok, code: res.code || null };

    if (!res.ok) {
      return { reply: res.message, internal, lastItemRef: u.target?.ref || lastItemRef, change: null };
    }
    return {
      reply: plan.user_message ? `${plan.user_message}` : res.message,
      internal,
      lastItemRef: u.target?.ref || lastItemRef,
      change: { data: res.state.data, layout: res.state.layout, operation: res.operation }
    };
  }

  // ── مسار القراءة ──
  const reply = await base44.integrations.Core.InvokeLLM({
    prompt: `${REPLY_PROMPT}

FACTS:
${JSON.stringify(facts)}

USER_MESSAGE:
${message}`,
    model: "gpt_5_6_sol"
  });

  return {
    reply: String(reply || "").trim(),
    internal,
    lastItemRef: u.target?.ref || lastItemRef,
    change: null
  };
}