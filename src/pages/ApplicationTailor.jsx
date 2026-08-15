import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n";
import { ArrowRight, Send, Loader2, MessageSquarePlus, Target, FileText } from "lucide-react";
import MessageBubble from "@/components/agent/MessageBubble";
import { useServices } from "@/hooks/useServices";
import { resolveBaseCV, adFromUserText } from "@/lib/tailoringSession";
import { createTailoredCV, buildTailoredPayload } from "@/lib/cvProfiles";
import { findExistingTailored } from "@/lib/tailoredLookup";
import TailoringStartCard from "@/components/workflow/TailoringStartCard";
import JobSearchOption from "@/components/workflow/JobSearchOption";
import CVReviewCard from "@/components/review/CVReviewCard";
import TailorReviewNotice from "@/components/review/TailorReviewNotice";
import useTailorRecommendations from "@/lib/agent/useTailorRecommendations";
import { buildSelectedIntents, formatIntentMessage, intentDeliveryKey, describeRejection } from "@/lib/agent/reviewIntent";
import { buildCVIndex, summarizeIndex } from "@/lib/agent/cvIndex";
import { cvContextBlock, activeTailorCv } from "@/lib/agent/tailorContext";
import { stripCVReview } from "@/lib/agent/cvReviewParser";

const AGENT_NAME = "application_tailor";

/** أمثلة مسار التخصيص فقط — لا مثال يدفع الوكيل إلى البحث التلقائي */
const EXAMPLES = [
  "سألصق نصّ إعلان الوظيفة الآن، طابق سيرتي معه",
  "لدي رابط إعلان وظيفة، حلّل متطلباته وطابقها بسيرتي",
  "صغ لي رسالة تغطية لهذا الإعلان",
  "حلل فجواتي المهارية مقابل متطلبات هذا الإعلان",
];

export default function ApplicationTailor() {
  const navigate = useNavigate();
  const { cvId } = useParams();
  const { dir, t } = useLanguage();
  const { cvRepository } = useServices();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [cvTitle, setCvTitle] = useState("");
  // سجل السيرة المحدّدة كما هو (قراءة فقط) — لبناء CV_CONTEXT مع كل رسالة
  const [selectedCv, setSelectedCv] = useState(null);
  const [cvLoading, setCvLoading] = useState(!!cvId);
  const contextSentRef = useRef(false);
  const scrollRef = useRef(null);
  // تأكيد بدء التخصيص — لا تُنشأ أي نسخة قبل قرار المستخدم هنا
  const [pendingStart, setPendingStart] = useState(null);
  const [starting, setStarting] = useState(false);
  // السيرة المستهدفة (النسخة المخصّصة) — تُقرأ فقط هنا؛ الكتابة عليها تتم في مساعد السيرة وحده
  const [targetCv, setTargetCv] = useState(null);
  const [sendError, setSendError] = useState("");
  const jobReview = useTailorRecommendations({ messages, targetCv });

  useEffect(() => {
    if (!cvId) { setCvLoading(false); return; }
    base44.entities.SavedCV.get(cvId).then((rec) => {
      setCvTitle(rec?.titel || "سيرة بدون عنوان");
      setSelectedCv(rec || null);
      setCvLoading(false);
    }).catch(() => {
      setCvTitle("تعذّر تحميل السيرة");
      setCvLoading(false);
    });
  }, [cvId]);

  const loadConversations = useCallback(async () => {
    try {
      const list = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      setConversations(list || []);
      if (list && list.length > 0 && !activeId) {
        setActiveId(list[0].id);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      contextSentRef.current = false;
      return;
    }
    setLoading(true);
    contextSentRef.current = true;
    base44.agents.getConversation(activeId).then((c) => {
      setMessages(c.messages || []);
      setLoading(false);
    }).catch(() => setLoading(false));

    const unsubscribe = base44.agents.subscribeToConversation(activeId, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsubscribe();
  }, [activeId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const newConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: cvTitle ? `تخصيص: ${cvTitle}` : "تخصيص سيرة لوظيفة", description: "تخصيص السيرة الذاتية لوظيفة محددة", cvId: cvId || null },
      });
      setConversations((c) => [conv, ...c]);
      setActiveId(conv.id);
      setMessages([]);
      contextSentRef.current = false;
    } catch (e) {
      // ignore
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    let conv = conversations.find((c) => c.id === activeId);
    if (!conv) {
      await newConversation();
      conv = { id: activeId };
    }
    setSending(true);
    setInput("");

    if (!contextSentRef.current) {
      // لا إنشاء صامت: نحدّد الأساس ونعرضه، والنسخة تُنشأ بعد تأكيد المستخدم فقط.
      const ad = adFromUserText(text);
      try {
        const list = await cvRepository.list("-updated_date");
        const resolved = resolveBaseCV({ list, preferredId: cvId, ad });
        const expected = resolved.base ? buildTailoredPayload({ base: resolved.base, ad })?.payload?.titel : "";
        const dup = resolved.base
          ? findExistingTailored({ list, baseId: resolved.base.id, expectedTitel: expected })
          : { existing: null, identity: "none" };
        setPendingStart({ text, ad, base: resolved.base, confidence: resolved.confidence, cautious: resolved.cautious, error: resolved.error, existing: dup.existing, identity: dup.identity });
      } catch (e) {
        setPendingStart({ text, ad, base: null, error: "NO_CONFIDENT_BASE", existing: null, identity: "none" });
      }
      setSending(false);
      return;
    }

    // السيرة المحدّدة تُرفَق مع **كل** رسالة، لا مع الأولى فقط — فلا يفقد الوكيل معرّفها
    // في محادثة قائمة أو عند لصق إعلان الوظيفة في رسالة لاحقة.
    const ctx = cvContextBlock(activeTailorCv(targetCv, selectedCv));
    try {
      await base44.agents.addMessage(conv, { role: "user", content: `${text}${ctx}` });
    } catch (e) {
      // ignore
    } finally {
      setSending(false);
    }
  };

  /** إرسال أول رسالة بعد تثبيت هدف التخصيص. لا كتابة على أي سيرة من هذه الصفحة. */
  const postFirst = async (text, note, record) => {
    let conv = conversations.find((c) => c.id === activeId);
    if (!conv) {
      await newConversation();
      conv = { id: activeId };
    }
    contextSentRef.current = true;
    // فهرس المعرّفات المستقرّة للسيرة المستهدفة — ليبني الوكيل توصياته على عناصر حقيقية لا على تخمين
    const ctx = cvContextBlock(activeTailorCv(record, selectedCv));
    try {
      await base44.agents.addMessage(conv, { role: "user", content: `السياق: ${note} اقرأ السيرة من SavedCV أولاً قبل مساعدتي.\n\nطلبي: ${text}${ctx}` });
    } catch (e) {
      // ignore
    }
  };

  const startTailoring = async (mode) => {
    if (!pendingStart || starting) return;
    setStarting(true);
    const { text, ad, base, existing, cautious } = pendingStart;
    try {
      if (mode === "existing" && existing) {
        setTargetCv(existing);
        await postFirst(text, `أعمل على النسخة المخصّصة الموجودة (معرف: ${existing.id}) المشتقّة من سيرتي الأساسية (معرف: ${base.id}). حلّلها وأعطني توصيات لهذه النسخة فقط.`, existing);
      } else if (mode === "new" && base) {
        const { created, error } = await createTailoredCV(cvRepository, { base, ad });
        if (error || !created) {
          await postFirst(text, "تعذّر تجهيز نسخة مخصّصة. لا تعدّل أي سيرة، وساعدني بالتحليل فقط.");
        } else {
          setTargetCv(created);
          let note = `أعمل على نسخة مخصّصة مستقلة (معرف: ${created.id}) مشتقّة من سيرتي الأساسية (معرف: ${base.id}). حلّل هذه النسخة المخصّصة فقط، ولا تحلّل ولا تقترح تعديلاً على النسخة الأساسية.`;
          if (cautious) note += " ملاحظة: اختيار السيرة الأساسية غير حاسم، فأكّد معي أنها الأساس الصحيح قبل أي تخصيص جوهري.";
          await postFirst(text, note, created);
        }
      } else {
        await postFirst(text, "لم تُحدَّد سيرة أساسية بعد، فلا تُنشئ ولا تعدّل أي سيرة. ساعدني بتحليل الإعلان فقط واسألني عن الأساس.");
      }
    } finally {
      setStarting(false);
      setPendingStart(null);
    }
  };

  /**
   * جسر Job Tailor → Smart CV Assistant.
   * لا كتابة هنا: يُبنى Intent منظّم لكل توصية مختارة فقط، ويُسلَّم إلى لوحة مساعد السيرة
   * داخل صفحة بناء النسخة المخصّصة، حيث يبقى executeAssistantAction نقطة التنفيذ الوحيدة.
   */
  const sendToAssistant = async (selectedIds) => {
    if (!targetCv) return;
    setSendError("");
    let fresh = targetCv;
    try {
      const rec = await cvRepository.get(targetCv.id);
      if (rec) fresh = rec;
    } catch (e) {
      // القراءة فشلت → نتحقّق مقابل اللقطة المعروفة، وأي هدف غير موجود يُرفض في reviewIntent
    }
    const { intents, rejected } = buildSelectedIntents({
      review: jobReview.review,
      selectedIds,
      cvId: fresh.id,
      templateId: fresh.templateId,
      indexSummary: summarizeIndex(buildCVIndex(fresh.data)),
      source: "application_tailor"
    });
    if (rejected.length) setSendError(describeRejection(rejected[0].error));
    if (intents.length === 0) return;
    const cycle = `tailor-${Date.now()}`;
    navigate(`/builder/${fresh.id}`, {
      state: {
        cvId: fresh.id,
        assistantIntents: intents.map((intent) => ({
          key: intentDeliveryKey(cycle, intent.recommendationId),
          message: formatIntentMessage(intent)
        }))
      }
    });
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (cvLoading) {
    return (
      <div dir={dir} className="h-screen bg-[#F5F5F5] flex items-center justify-center" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
        <Loader2 className="w-8 h-8 animate-spin text-[#000066]" />
      </div>
    );
  }

  if (!cvId) {
    return (
      <div dir={dir} className="h-screen bg-[#F5F5F5] flex flex-col items-center justify-center gap-4" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
        <div className="w-16 h-16 rounded-2xl bg-[#000066] flex items-center justify-center">
          <Target className="w-8 h-8 text-[#D9E830]" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">اختر سيرة ذاتية أولاً</h2>
        <p className="text-sm text-slate-500 text-center max-w-sm">للتخصيص لوظيفة محددة، افتح هذا المرشد من داخل البناء بعد حفظ سيرتك، أو من قائمة سيرك المحفوظة.</p>
        <button onClick={() => navigate("/")} className="px-5 py-2.5 rounded-full bg-[#000066] text-white text-sm font-medium hover:bg-[#00003d] transition-colors">
          العودة للرئيسية
        </button>
      </div>
    );
  }

  return (
    <div dir={dir} className="h-screen bg-[#F5F5F5] flex flex-col overflow-hidden" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <header className="shrink-0 border-b border-slate-200 bg-white">
        <div className="px-5 py-3 flex items-center justify-between gap-3">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowRight className="w-4 h-4" />
            <span>{t("builder.back")}</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#000066] flex items-center justify-center">
              <Target className="w-4 h-4 text-[#D9E830]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-900">مخصّص الطلبات</p>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 justify-center">
                <FileText className="w-3 h-3" />
                {cvTitle || "سيرة محفوظة"}
              </p>
            </div>
          </div>
          <button onClick={newConversation} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <MessageSquarePlus className="w-4 h-4" />
            <span className="hidden sm:inline">محادثة جديدة</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {conversations.length > 1 && (
          <aside className="hidden md:block w-64 shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full text-right px-4 py-3 text-sm border-b border-slate-100 transition-colors ${activeId === c.id ? "bg-[#000066]/5 text-[#000066] font-medium" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {c.metadata?.name || "تخصيص سيرة"}
              </button>
            ))}
          </aside>
        )}

        <main className="flex-1 flex flex-col min-h-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[#000066]" />
              </div>
            )}
            {!loading && messages.length === 0 && (
              <div className="max-w-md mx-auto text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-[#000066] flex items-center justify-center mx-auto mb-4">
                  <Target className="w-7 h-7 text-[#D9E830]" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 mb-2">تخصيص CV لوظيفة</h2>
                <p className="text-sm text-slate-500 mb-1">الصق نصّ إعلان الوظيفة أو أرسل رابطه، وسأطابق سيرتك المحددة مع متطلباته.</p>
                {cvTitle && <p className="text-xs text-[#000066] font-medium mb-6">السيرة الحالية: {cvTitle}</p>}
                {!cvTitle && <div className="mb-6" />}
                <div className="space-y-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => { setInput(ex); }}
                      className="w-full text-right text-sm px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#000066] hover:bg-[#000066]/5 transition-colors text-slate-700"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
                <JobSearchOption onPick={(q) => setInput(q)} />
              </div>
            )}
            {!loading && messages.map((m, i) => (
              <MessageBubble key={i} message={{ ...m, content: stripCVReview(m.content) }} />
            ))}
            {pendingStart && (
              <TailoringStartCard
                base={pendingStart.base}
                confidence={pendingStart.confidence}
                cautious={pendingStart.cautious}
                existing={pendingStart.existing}
                identity={pendingStart.identity}
                error={pendingStart.error}
                busy={starting}
                onStart={() => startTailoring("new")}
                onOpenExisting={() => startTailoring("existing")}
                onSkip={() => startTailoring("skip")}
                onCancel={() => { setInput(pendingStart.text); setPendingStart(null); }}
              />
            )}
            {!jobReview.ready && <TailorReviewNotice error={jobReview.error} />}
            {jobReview.ready && (
              <div className="max-w-3xl mx-auto space-y-2">
                <CVReviewCard
                  review={jobReview.review}
                  selectedIds={jobReview.selectedIds}
                  onToggle={jobReview.toggleRecommendation}
                  onSendToAssistant={sendToAssistant}
                  onClose={jobReview.dismiss}
                  heading="توصيات التخصيص لهذه الوظيفة"
                  subnote={`هذه التوصيات مخصّصة لهذه الوظيفة الحالية${targetCv?.titel ? ` وتنطبق على نسختك المخصّصة «${targetCv.titel}»` : ""} فقط، ولا تمسّ سيرتك الأساسية. التنفيذ يتم في مساعد السيرة، لا هنا.`}
                  hint="اختر ما تريد تخصيصه لهذه الوظيفة — لن يُطبَّق شيء الآن."
                  sendLabel="أرسل إلى مساعد السيرة للتنفيذ"
                  sendNote="سيفتح مساعد السيرة على نسختك المخصّصة الحالية، وهو الذي ينفّذ ما اخترته فقط."
                  emptyNote="اختر توصية واحدة أو أكثر لإرسالها إلى مساعد السيرة."
                />
                {sendError && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{sendError}</p>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white p-4">
            <div className="max-w-3xl mx-auto flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                rows={1}
                placeholder="الصق نصّ إعلان الوظيفة هنا، أو أرسل رابطه/رقمه…"
                className="flex-1 resize-none border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#000066] focus:ring-2 focus:ring-[#000066]/10 transition-all max-h-32"
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                className="w-11 h-11 shrink-0 rounded-xl bg-[#000066] text-white flex items-center justify-center hover:bg-[#00003d] transition-colors disabled:opacity-40"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}