import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import MessageBubble from "@/components/agent/MessageBubble";
import { Send, Loader2, X, Sparkles } from "lucide-react";
import { executeAssistantAction, stripAction } from "@/lib/agent/smartAssistantAction";
import { buildCVIndex, summarizeIndex } from "@/lib/agent/cvIndex";
import { summaryText } from "@/lib/agent/changeSummary";
import ChangeSummaryNote from "@/components/agent/ChangeSummaryNote";
import { cvLanguageTag } from "@/lib/agent/cvLanguage";
import { INTERNAL_DELIVERY } from "@/lib/agent/reviewIntent";
import { useLanguage } from "@/lib/i18n";

const MARK = "<<<CV_CONTEXT";
const strip = (m) => ({ ...m, content: stripAction(String(m.content || "").split(MARK)[0]).trim() });

/**
 * Smart CV Assistant — واجهة محادثة للقراءة فقط (المرحلة 1).
 * ترسل السيرة الحالية (cvModel + template + layout) كسياق مع كل رسالة،
 * فتكون إجابات الوكيل مبنية على السيرة المعروضة فعلاً لا على شكلها البصري.
 */
export default function SmartCVAssistantPanel({ data, layout, templateId, cvId, pendingIntents, onLayoutChange, onDataChange, onClose }) {
  const { dir, lang, t } = useLanguage();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [notes, setNotes] = useState([]);
  const endRef = useRef(null);
  const ctxRef = useRef({ data, layout, templateId, cvId, onLayoutChange, onDataChange, uiLang: lang });
  ctxRef.current = { data, layout, templateId, cvId, onLayoutChange, onDataChange, uiLang: lang };
  const doneRef = useRef(new Set());
  const seenContentRef = useRef(new Map());

  useEffect(() => {
    (async () => {
      const conv = await base44.agents.createConversation({
        agent_name: "smart_cv_assistant",
        metadata: { name: "Smart CV Assistant", description: "Reads and edits the current CV" }
      });
      setConversation(conv);
    })();
  }, []);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (d) => {
      setMessages(d.messages || []);
      setSending(false);
    });
    return () => unsubscribe();
  }, [conversation?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, notes]);

  // تنفيذ إجراءات الـlayout التي يقترحها الوكيل — عبر cv_move_section فقط، ومرة واحدة لكل رسالة.
  // رسائل الوكيل تصل تدريجياً (streaming) وكتلة الإجراء تظهر في آخر النص، لذلك لا نعتبر الرسالة
  // "منتهية" عند غياب الإجراء؛ نعيد فحصها فقط عندما يتغيّر نصها فعلاً، ونوسمها نهائياً بعد تنفيذ إجراء.
  useEffect(() => {
    const { data: d, layout: l, templateId: t, onLayoutChange: applyLayout, onDataChange: applyData } = ctxRef.current;
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (m.role !== "assistant") continue;
      const key = m.id || `idx-${i}`;
      if (doneRef.current.has(key)) continue;
      const content = String(m.content || "");
      if (seenContentRef.current.get(key) === content) continue;
      seenContentRef.current.set(key, content);
      const res = executeAssistantAction({ content, templateId: t, layout: l, data: d });
      if (res.status === "none") continue;
      doneRef.current.add(key);
      if (res.status === "applied") {
        // الملخّص مبنيّ على نتيجة الأداة (res.results) لا على كلام الوكيل
        if (res.kind === "content" && applyData) applyData(res.newData, summaryText(res.results));
        else if (res.kind === "layout" && applyLayout) applyLayout(res.newLayout);
        setNotes((n) => [...n, { key, ok: true, text: res.message, results: res.results }]);
      } else {
        setNotes((n) => [...n, { key, ok: false, text: res.message, results: res.results }]);
      }
    }
  }, [messages]);

  // إرسال أي رسالة مصحوبةً بالحالة الحالية للسيرة — نقطة الإرسال الوحيدة للوحة
  // حمولات التنفيذ الداخلية التي أرسلها النظام — تُسجَّل لحظة الإرسال ليُستبعَد عرضها لاحقاً.
  // التصنيف بالمصدر: ما في هذه المجموعة هو ما أرسلناه نحن، ولا يُفحَص نصّ أي رسالة لتصنيفها.
  const internalDeliveredRef = useRef(new Set());

  const postRef = useRef(null);
  postRef.current = async (text, { internal = false } = {}) => {
    if (!conversation) return;
    const { data: d, layout: l, templateId: tid, cvId: id, uiLang } = ctxRef.current;
    setSending(true);
    const content = `${text}\n\n${MARK}\n${JSON.stringify({
      cvId: id,
      templateId: tid,
      layout: l,
      CV_DATA: d,
      CV_INDEX: summarizeIndex(buildCVIndex(d)),
      // لغتان منفصلتان: cvLanguage تحكم كل نصّ يدخل السيرة، uiLanguage تحكم لغة التواصل فقط
      cvLanguage: cvLanguageTag(d),
      uiLanguage: uiLang
    })}\nCV_CONTEXT>>>`;
    // الحمولة تُرسل كما هي بالكامل إلى الوكيل — الوسم للعرض فقط
    if (internal) internalDeliveredRef.current.add(content.trim());
    try {
      await base44.agents.addMessage(conversation, { role: "user", content });
    } finally {
      // sending تعني أن الطلب قيد الإرسال فقط، وليست حالة انتظار استجابة الوكيل.
      // لا نترك زر الإدخال عالقاً إذا تأخر بث استجابة الوكيل أو لم يصل حدث الاشتراك.
      setSending(false);
    }
  };

  // توصيات المراجعة التي وافق عليها المستخدم — تُسلَّم كـIntent منظّم، كل واحدة رسالة مستقلة ومرة واحدة.
  const sentIntentsRef = useRef(new Set());
  useEffect(() => {
    if (!conversation?.id || !Array.isArray(pendingIntents) || pendingIntents.length === 0) return;
    (async () => {
      for (const it of pendingIntents) {
        if (!it?.key || sentIntentsRef.current.has(it.key)) continue;
        sentIntentsRef.current.add(it.key);
        await postRef.current(it.message, { internal: it.kind === INTERNAL_DELIVERY });
      }
    })();
  }, [pendingIntents, conversation?.id]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !conversation || sending) return;
    setInput("");
    await postRef.current(text);
  };

  return (
    <div dir={dir} className="flex flex-col h-[460px] bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-200">
        <Sparkles className="w-4 h-4 text-[#000066]" />
        <span className="text-sm font-semibold text-slate-800">{t("assistant.title")}</span>
        <span className="text-[10px] text-slate-400">{t("assistant.subtitle")}</span>
        <button onClick={onClose} aria-label={t("assistant.close")} className="ms-auto text-slate-400 hover:text-slate-700 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-slate-400 text-center pt-8 leading-relaxed">
            {t("assistant.empty")}<br />{t("assistant.emptyExample")}
          </p>
        )}
        {messages
          .filter((m) => !(m.role === "user" && internalDeliveredRef.current.has(String(m.content || "").trim())))
          .map((m, i) => <MessageBubble key={i} message={strip(m)} />)}
        {notes.map((n) => <ChangeSummaryNote key={n.key} note={n} />)}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="shrink-0 flex items-center gap-2 p-3 bg-white border-t border-slate-200">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={conversation ? t("assistant.placeholder") : t("assistant.initializing")}
          disabled={!conversation}
          className="inp"
        />
        <button
          type="submit"
          disabled={!conversation || sending || !input.trim()}
          className="shrink-0 w-9 h-9 rounded-xl bg-[#000066] text-white grid place-items-center disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}