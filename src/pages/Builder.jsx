import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { emptyCV, mergeCV, DEFAULT_LAYOUTS, emptyReference, normalizeLayout } from "@/lib/cvModel";
import { useToast } from "@/components/ui/use-toast";
import { useServices } from "@/hooks/useServices";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/AuthContext";
import CVPages from "@/components/CVPages";
import CVSideToolbar from "@/components/tools/CVSideToolbar";
import LayoutEditor from "@/components/tools/LayoutEditor";
import { ArrowRight, Download, Loader2, LayoutGrid, Save, Target, LayoutTemplate, Check, Sparkles } from "lucide-react";
import CVSaveDialog from "@/components/tools/CVSaveDialog";
import { EditProvider } from "@/components/templates/EditContext";
import ActionLogPanel from "@/components/ActionLogPanel";
import SmartCVAssistantPanel from "@/components/agent/SmartCVAssistantPanel";
import useTemplateDecision from "@/lib/agent/useTemplateDecision";
import useCVReview from "@/lib/agent/useCVReview";
import CVReviewCard from "@/components/review/CVReviewCard";
import TemplateReviewCard from "@/components/template/TemplateReviewCard";
import WorkflowChoiceCard from "@/components/workflow/WorkflowChoiceCard";
import { WORKFLOW_GENERAL, WORKFLOW_TAILOR, isWorkflowChoiceReady, resolveWorkflowActions } from "@/lib/workflowRoutes";
import { logAction } from "@/lib/actionLog";
import { buildReviewIntent, buildSelectedIntents, formatIntentMessage, formatConfirmedIntentMessage, describeRejection, intentDeliveryKey, INTERNAL_DELIVERY } from "@/lib/agent/reviewIntent";
import { needsEvidence, buildEvidenceRequest, verifyEvidenceStillValid, describeEvidenceError } from "@/lib/agent/reviewEvidence";
import EvidenceDialog from "@/components/review/EvidenceDialog";
import { researchFor } from "@/lib/agent/reviewResearch";
import { buildCVIndex, summarizeIndex } from "@/lib/agent/cvIndex";
import { cvLanguageTag } from "@/lib/agent/cvLanguage";
import { resolveSaveTarget } from "@/lib/cvSaveTarget";
import { resolveBaseCV, adFromUserText } from "@/lib/tailoringSession";
import { createTailoredCV } from "@/lib/cvProfiles";
import CVRelationBar from "@/components/cv/CVRelationBar";
import JobTailorDialog from "@/components/tailor/JobTailorDialog";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import SuitableJobsPanel from "@/components/jobs/SuitableJobsPanel";
import TemplatePickerModal from "@/components/tools/TemplatePickerModal";
import CVPreview from "@/components/CVPreview";
import { Copy, Eye, Share2, X } from "lucide-react";

const A4_W = 794;
const A4_H = 1123;

export default function Builder() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cvId: paramCvId } = useParams();
  const { toast } = useToast();
  const { dir, t, lang } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { llm, cvRepository, auth, export: exportSvc } = useServices();
  const incoming = location.state;

  const [data, setData] = useState(emptyCV);
  const historyRef = useRef({ past: [], present: emptyCV, future: [] });
  const skipHistoryRef = useRef(false);
  const [histVersion, setHistVersion] = useState(0);
  const [templateId, setTemplateId] = useState(incoming?.templateId || "stockholm");
  const [layout, setLayout] = useState(() => DEFAULT_LAYOUTS[incoming?.templateId || "stockholm"] || DEFAULT_LAYOUTS.stockholm);
  const skipLayoutResetRef = useRef(false);
  const [showLayout, setShowLayout] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showShare, setShowShare] = useState(false);
  // توصيات واردة من مخصّص الطلبات (جسر Job Tailor → مساعد السيرة) — تُفتح اللوحة فوراً لتُسلَّم كـIntents
  // كل عنصر تسليم يُوسَم بمصدره: حمولة تنفيذ داخلية لا رسالة كتبها المستخدم
  const incomingIntents = (Array.isArray(incoming?.assistantIntents) ? incoming.assistantIntents : [])
    .map((it) => ({ ...it, kind: INTERNAL_DELIVERY, label: it.label || it.title || null }));
  const [showSmart, setShowSmart] = useState(incomingIntents.length > 0);
  const [assistantMounted, setAssistantMounted] = useState(incomingIntents.length > 0);
  const [assistantMinimized, setAssistantMinimized] = useState(false);
  const openAssistant = () => { setAssistantMounted(true); setShowSmart(true); setAssistantMinimized(false); };
  const [processing, setProcessing] = useState(!!(incoming?.text || incoming?.fileUrl));
  const [regenerating, setRegenerating] = useState(false);
  const mode = "preview";
  const panelRef = useRef(null);
  const wrapperRef = useRef(null);
  const [contentH, setContentH] = useState(A4_H);
  const [fitScale, setFitScale] = useState(0.6);
  const [userZoom, setUserZoom] = useState(1);
  const scale = userZoom ?? fitScale;
  const zoomIn = () => setUserZoom((s) => Math.min(3, Math.round(((s ?? fitScale) + 0.1) * 10) / 10));
  const zoomOut = () => setUserZoom((s) => Math.max(0.3, Math.round(((s ?? fitScale) - 0.1) * 10) / 10));
  const zoomReset = () => setUserZoom(1);
  const zoomFit = () => setUserZoom(null);
  const [currentCvId, setCurrentCvId] = useState(incoming?.cvId || paramCvId || null);
  // بيانات علاقة السيرة (نوعها وأصلها) — للعرض والتنقّل فقط، لا تُكتب من هنا
  const [cvMeta, setCvMeta] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [authChecking, setAuthChecking] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState("");
  const autoSaveTimerRef = useRef(null);
  const autoSaveReadyRef = useRef(false);
  const creatingRef = useRef(false);
  // مصدر اختيار القالب — يُحدَّد مرة واحدة في Home ويُكتب فقط عند أول حفظ فعلي لهذه السيرة.
  const templateOriginRef = useRef(
    incoming?.templateSource === "user"
      ? { templateSource: "user", templateReviewStatus: "pending" }
      : { templateSource: "auto", templateReviewStatus: "skipped" }
  );
  // حالة مراجعة القالب — تُقرأ من السجل عند التحميل، وتُقلب محلياً بعد قرار المستخدم فقط
  const [templateSource, setTemplateSource] = useState(templateOriginRef.current.templateSource);
  const [templateReviewStatus, setTemplateReviewStatus] = useState(templateOriginRef.current.templateReviewStatus);
  const reviewCycleClosedRef = useRef(false);

  const nextUrl = () => window.location.pathname + window.location.search;
  const guard = () => auth.requireAuth({ draft: { data, templateId, layout }, nextUrl: nextUrl() });

  useEffect(() => {
    if (skipLayoutResetRef.current) { skipLayoutResetRef.current = false; return; }
    setLayout(DEFAULT_LAYOUTS[templateId] || DEFAULT_LAYOUTS.stockholm);
  }, [templateId]);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const update = () => setFitScale(Math.max(0.3, Math.min(3, (el.clientWidth - 48) / A4_W)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [processing]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => setContentH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data, templateId, layout, processing]);

  const runProcess = useCallback(async (text, fileUrl) => {
    setProcessing(true);
    try {
      const merged = await llm.processCV({ text, fileUrl });
      setData(merged);
    } catch (e) {
      toast({ title: "Kunde inte läsa in informationen", description: "Försök igen eller redigera manuellt.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  }, [toast, llm]);

  useEffect(() => {
    if (incoming?.text || incoming?.fileUrl) {
      runProcess(incoming.text || "", incoming.fileUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = incoming?.cvId || paramCvId;
    if (!id || incoming?.text || incoming?.fileUrl) return;
    (async () => {
      setProcessing(true);
      try {
        const rec = await cvRepository.get(id);
        if (rec) {
          if (rec.data) setData(mergeCV(rec.data));
          if (rec.templateId) { skipLayoutResetRef.current = true; setTemplateId(rec.templateId); }
          // النسخ المحفوظة قبل إضافة قسم المراجع لا تحتوي references في الـlayout — التطبيع يُدرجه
          if (rec.layout) setLayout(normalizeLayout(rec.layout, rec.templateId || templateId));
          if (rec.templateSource) setTemplateSource(rec.templateSource);
          if (rec.templateReviewStatus) setTemplateReviewStatus(rec.templateReviewStatus);
          setCvMeta({ cvType: rec.cvType, parentCvId: rec.parentCvId, jobApplicationId: rec.jobApplicationId, titel: rec.titel });
          setCurrentCvId(rec.id);
        }
      } catch (e) {
        toast({ title: "تعذّر تحميل السيرة المحفوظة", variant: "destructive" });
      } finally {
        setProcessing(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (incoming?.text || incoming?.fileUrl || incoming?.cvId || paramCvId) return;
    const p = auth.restoreDraft();
    if (!p) return;
    try {
      if (p.data) setData(mergeCV(p.data));
      if (p.templateId) { skipLayoutResetRef.current = true; setTemplateId(p.templateId); }
      if (p.layout) setLayout(normalizeLayout(p.layout, p.templateId || templateId));
      toast({ title: "أكمل ما بدأته", description: "تمت استعادة مسودة سيرتك بعد تسجيل الدخول." });
    } catch (e) {}
    auth.clearDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (k, v) => { setData((d) => ({ ...d, [k]: v })); logAction("manual_edit", { field: k }, `field:${k}`); };
  const setContact = (k, v) => { setData((d) => ({ ...d, kontakt: { ...d.kontakt, [k]: v } })); logAction("manual_edit", { field: `kontakt.${k}` }, `contact:${k}`); };
  const setExp = (i, k, v) => { setData((d) => { const a = [...d.erfarenhet]; a[i] = { ...a[i], [k]: v }; return { ...d, erfarenhet: a }; }); logAction("manual_edit", { field: `erfarenhet[${i}].${k}` }, `exp:${i}:${k}`); };
  const setEdu = (i, k, v) => { setData((d) => { const a = [...d.utbildning]; a[i] = { ...a[i], [k]: v }; return { ...d, utbildning: a }; }); logAction("manual_edit", { field: `utbildning[${i}].${k}` }, `edu:${i}:${k}`); };
  const setSkill = (i, k, v) => { setData((d) => { const a = [...d.fardigheter]; a[i] = { ...a[i], [k]: k === "niva" ? (v === null || v === "" ? null : Number(v)) : v }; return { ...d, fardigheter: a }; }); logAction("manual_edit", { field: `fardigheter[${i}].${k}` }, `skill:${i}:${k}`); };
  const setSprak = (i, k, v) => { setData((d) => { const a = [...d.sprak]; a[i] = { ...a[i], [k]: v }; return { ...d, sprak: a }; }); logAction("manual_edit", { field: `sprak[${i}].${k}` }, `sprak:${i}:${k}`); };
  const addExp = () => { setData((d) => ({ ...d, erfarenhet: [...d.erfarenhet, { roll: "", foretag: "", period: "", beskrivning: "" }] })); logAction("manual_edit", { field: "إضافة خبرة" }); };
  const removeExp = (i) => { setData((d) => ({ ...d, erfarenhet: d.erfarenhet.filter((_, x) => x !== i) })); logAction("manual_edit", { field: `حذف خبرة #${i + 1}` }); };
  const addEdu = () => { setData((d) => ({ ...d, utbildning: [...d.utbildning, { examen: "", skola: "", period: "", beskrivning: "" }] })); logAction("manual_edit", { field: "إضافة تعليم" }); };
  const removeEdu = (i) => { setData((d) => ({ ...d, utbildning: d.utbildning.filter((_, x) => x !== i) })); logAction("manual_edit", { field: `حذف تعليم #${i + 1}` }); };
  const addSkill = () => { setData((d) => ({ ...d, fardigheter: [...d.fardigheter, { namn: "", niva: null }] })); logAction("manual_edit", { field: "إضافة مهارة" }); };
  const removeSkill = (i) => { setData((d) => ({ ...d, fardigheter: d.fardigheter.filter((_, x) => x !== i) })); logAction("manual_edit", { field: `حذف مهارة #${i + 1}` }); };
  const addSprak = () => { setData((d) => ({ ...d, sprak: [...d.sprak, { sprak: "", niva: "" }] })); logAction("manual_edit", { field: "إضافة لغة" }); };
  const removeSprak = (i) => { setData((d) => ({ ...d, sprak: d.sprak.filter((_, x) => x !== i) })); logAction("manual_edit", { field: `حذف لغة #${i + 1}` }); };
  const setRef = (i, k, v) => { setData((d) => { const a = [...(d.references || [])]; a[i] = { ...a[i], [k]: v }; return { ...d, references: a }; }); logAction("manual_edit", { field: `references[${i}].${k}` }, `ref:${i}:${k}`); };
  const addRef = () => { setData((d) => ({ ...d, references: [...(d.references || []), { ...emptyReference }] })); logAction("manual_edit", { field: "إضافة مرجع" }); };
  const removeRef = (i) => { setData((d) => ({ ...d, references: (d.references || []).filter((_, x) => x !== i) })); logAction("manual_edit", { field: `حذف مرجع #${i + 1}` }); };

  const actions = { setField, setContact, setExp, setEdu, setSkill, setSprak, addExp, removeExp, addEdu, removeEdu, addSkill, removeSkill, addSprak, removeSprak, setRef, addRef, removeRef };

  useEffect(() => {
    if (skipHistoryRef.current) { skipHistoryRef.current = false; return; }
    if (data === historyRef.current.present) return;
    historyRef.current = { past: [...historyRef.current.past, historyRef.current.present].slice(-50), present: data, future: [] };
    setHistVersion(v => v + 1);
  }, [data]);

  // الحفظ التلقائي بعد كل تعديل (مع تأخير بسيط)
  useEffect(() => {
    if (processing) return;
    if (!autoSaveReadyRef.current) {
      autoSaveReadyRef.current = true;
      // لا نتخطى الحفظ إذا كانت السيرة تحتوي بيانات فعلية (مثل نتيجة قراءة PDF)
      const hasContent = !!(data.namn || data.titel || data.profil || data.erfarenhet?.length || data.utbildning?.length);
      if (!hasContent) return;
    }
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSaveStatus("saving");
    autoSaveTimerRef.current = setTimeout(async () => {
      const draft = { data, templateId, layout };
      if (isAuthenticated) {
        try {
          const titel = data.titel || "Min CV";
          const target = resolveSaveTarget(currentCvId);
          if (target.mode === "update") {
            await cvRepository.update(target.id, { titel, ...draft });
          } else if (!creatingRef.current) {
            creatingRef.current = true;
            try {
              // سيرة جديدة = سجل جديد مستقل. لا قراءة لقائمة السجلات، ولا تبنّي لأحدثها،
              // ولا حذف لأي سجل آخر — تعدّد الـMasters والنسخ المخصّصة مصون.
              const rec = await cvRepository.create({ titel, ...draft, ...templateOriginRef.current });
              setCurrentCvId(rec.id);
              navigate(`/builder/${rec.id}`, { replace: true });
            } finally {
              creatingRef.current = false;
            }
          }
          setAutoSaveStatus("saved");
        } catch (e) {
          creatingRef.current = false;
          setAutoSaveStatus("");
        }
      } else {
        auth.persistDraft(draft);
        setAutoSaveStatus("saved");
      }
    }, 250);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, templateId, layout, processing, isAuthenticated, currentCvId]);

  useEffect(() => {
    if (autoSaveStatus !== "saved") return;
    const t = setTimeout(() => setAutoSaveStatus(""), 2000);
    return () => clearTimeout(t);
  }, [autoSaveStatus]);

  const undo = useCallback(() => {
    const { past, present, future } = historyRef.current;
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    historyRef.current = { past: past.slice(0, -1), present: prev, future: [present, ...future] };
    skipHistoryRef.current = true;
    setData(prev);
    setHistVersion(v => v + 1);
  }, []);

  const redo = useCallback(() => {
    const { past, present, future } = historyRef.current;
    if (future.length === 0) return;
    const next = future[0];
    historyRef.current = { past: [...past, present], present: next, future: future.slice(1) };
    skipHistoryRef.current = true;
    setData(next);
    setHistVersion(v => v + 1);
  }, []);

  const undoRef = useRef(undo); undoRef.current = undo;
  const redoRef = useRef(redo); redoRef.current = redo;
  // eslint-disable-next-line no-unused-expressions
  void histVersion;
  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;

  const createShareUrl = async () => {
    if (!currentCvId) { toast({ title: "احفظ السيرة أولاً", variant: "destructive" }); return null; }
    try {
      const token = `${crypto.randomUUID().replaceAll("-", "")}__${Date.now().toString(36)}`;
      await base44.entities.SharedCV.create({ token, sourceCvId: currentCvId, titel: data.titel || "CV", data, templateId, layout });
      return `${window.location.origin}/share/${token}`;
    } catch {
      toast({ title: "تعذّر إنشاء رابط المشاركة", variant: "destructive" });
      return null;
    }
  };
  const copyCVLink = async () => {
    const url = await createShareUrl();
    if (!url) return;
    try { await navigator.clipboard.writeText(url); toast({ title: "تم إنشاء ونسخ رابط السيرة" }); }
    catch { toast({ title: "تم إنشاء الرابط، لكن تعذّر نسخه تلقائياً" }); }
  };
  const emailCV = async () => {
    const url = await createShareUrl();
    if (!url) return;
    const subject = encodeURIComponent(data.titel || "CV");
    const body = encodeURIComponent(`السيرة الذاتية: ${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };
  const shareApplication = async () => {
    const url = await createShareUrl();
    if (!url) return;
    try {
      if (navigator.share) await navigator.share({ title: data.titel || "Smart CV", text: "CV / Application", url });
      else await navigator.clipboard.writeText(url);
      toast({ title: "تمت مشاركة رابط السيرة" });
    } catch (_) {}
  };

  const exportPDF = () => {
    // Keep the native print call synchronous with the user's click.
    // Safari can block window.print() when it is invoked after an async auth check.
    if (!isAuthenticated) {
      guard();
      return;
    }
    exportSvc.printIsolated();
  };

  // Print gate: block native print / Ctrl+P when not authenticated.
  const authedRef = useRef(isAuthenticated);
  authedRef.current = isAuthenticated;
  const tRef = useRef(t);
  tRef.current = t;
  const exportRef = useRef(exportPDF);
  exportRef.current = exportPDF;

  useEffect(() => {
    const onBeforePrint = () => {
      if (!authedRef.current) {
        document.body.classList.add("print-locked");
        toast({ title: tRef.current("builder.printLocked"), variant: "destructive" });
      }
    };
    const onAfterPrint = () => document.body.classList.remove("print-locked");
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        exportRef.current();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undoRef.current();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        redoRef.current();
      }
    };
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const merged = await llm.regenerateCV(data);
      setData(merged);
      toast({ title: "Förbättrat", description: "Texten har förfinats." });
    } catch (e) {
      toast({ title: "Kunde inte förbättra", variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

  const saveCV = async (name) => {
    const titel = (name && name.trim()) || data.titel || "Min CV";
    setSaving(true);
    try {
      const ok = await auth.requireAuth({ draft: { data, templateId, layout }, nextUrl: nextUrl() });
      if (!ok) return;
      const payload = { titel, data, templateId, layout };
      if (currentCvId) {
        await cvRepository.update(currentCvId, payload);
        toast({ title: "تم الحفظ", description: titel });
        setSaveOpen(false);
      } else {
        const rec = await cvRepository.create({ ...payload, ...templateOriginRef.current });
        setCurrentCvId(rec.id);
        navigate(`/builder/${rec.id}`, { replace: true });
        toast({ title: "تم حفظ السيرة", description: titel });
        setSaveOpen(false);
      }
    } catch (e) {
      toast({ title: "تعذّر الحفظ", description: "سجّل الدخول أولاً لحفظ سيرتك.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── مراجعة القالب: تشغيل داخلي للمستشار (قراءة فقط) ثم قرار المستخدم ──
  const review = useTemplateDecision({ cvId: currentCvId, templateId, templateSource, data });
  const [reviewDismissed, setReviewDismissed] = useState(false);
  const runReviewRef = useRef(review.run);
  runReviewRef.current = review.run;

  useEffect(() => {
    if (processing) return;
    if (!currentCvId) return;
    if (templateSource !== "user" || templateReviewStatus !== "pending") return;
    if (reviewCycleClosedRef.current) return;
    runReviewRef.current(); // idempotent داخل الـHook — تشغيل واحد لكل دورة مراجعة
  }, [processing, currentCvId, templateSource, templateReviewStatus]);

  const closeReview = async () => {
    reviewCycleClosedRef.current = true;
    setReviewDismissed(true);
    setTemplateReviewStatus("reviewed");
    try {
      // تحديث حقل واحد فقط — لا يمسّ data/templateId/layout
      if (currentCvId) await cvRepository.update(currentCvId, { templateReviewStatus: "reviewed" });
    } catch (e) {}
  };

  // ── مراجعة السيرة (cv_review_coach): عرض واختيار فقط — لا تعديل ولا حفظ ولا CV_ACTION ──
  const cvReview = useCVReview({ cvId: currentCvId, templateId, layout, data, templateReviewStatus });
  const startReviewRef = useRef(cvReview.run);
  startReviewRef.current = cvReview.run;
  // لا توجد مراجعة تلقائية قبل اختيار مسار العمل.
  // CV Review Coach يبدأ فقط عندما يختار المستخدم "تحسين عام" من WorkflowChoiceCard.
  // مقبس التشغيل اليدوي — لا تشغيل تلقائي عند تغيّر data/layout/templateId أو إعادة الرسم
  useEffect(() => {
    window.__cvcraftStartReview = (userRequest) => {
      if (processing) return { error: "CV_NOT_READY" };
      return startReviewRef.current(userRequest);
    };
    return () => { delete window.__cvcraftStartReview; };
  }, [processing]);

  // ── M6: توصيات المراجعة المختارة → Intent منظّم → Smart CV Assistant (نقطة التنفيذ الوحيدة) ──
  const [pendingIntents, setPendingIntents] = useState(incomingIntents);
  const sendCycleRef = useRef(0); // كل ضغطة إرسال = دورة جديدة، فلا يُقيَّد التكرار بهوية التوصية للأبد

  // طابور تأكيد المعلومات — لا يفتح مساعد السيرة ولا يمسّ السيرة؛ مجرّد أسئلة معروضة للمستخدم
  const [evidenceQueue, setEvidenceQueue] = useState([]);

  /** نقطة التسليم الوحيدة إلى مساعد السيرة — بعد التأكيد فقط */
  const deliverToAssistant = (items) => {
    if (items.length === 0) return;
    openAssistant();
    const cycle = ++sendCycleRef.current;
    setPendingIntents((prev) => [
      ...prev,
      ...items.map(({ intent, evidence }) => ({
        key: intentDeliveryKey(cycle, intent.recommendationId),
        // النوع يُحدَّد بالمصدر هنا (منشئ الحمولة)، فلا يُفحَص نصّ الرسالة لاحقاً لتصنيفها
        kind: INTERNAL_DELIVERY,
        label: intent.title || intent.recommendationId,
        message: evidence ? formatConfirmedIntentMessage(intent, evidence) : formatIntentMessage(intent)
      }))
    ]);
    logAction("ai_command", { command: `إرسال ${items.length} توصية مراجعة إلى مساعد السيرة` });
  };

  const sendReviewToAssistant = (selectedIds) => {
    const { intents, rejected } = buildSelectedIntents({
      review: cvReview.review,
      selectedIds,
      cvId: currentCvId,
      templateId,
      indexSummary: summarizeIndex(buildCVIndex(data)), // الحالة الحالية لا لقطة المراجعة
      cvLanguage: cvLanguageTag(data), // لغة السيرة: من محتوى السيرة
      uiLanguage: lang // لغة الواجهة: من مبدّل اللغة — منفصلة تماماً
    });
    if (rejected.length) {
      toast({ title: "لم تُرسَل بعض التوصيات", description: describeRejection(rejected[0].error), variant: "destructive" });
    }
    if (intents.length === 0) return;

    // ما يحتاج معلومات من المستخدم يمرّ بطبقة التأكيد أولاً؛ الباقي يُسلَّم كما في السابق
    const direct = [];
    const queue = [];
    for (const intent of intents) {
      if (!needsEvidence(intent)) { direct.push({ intent }); continue; }
      const res = buildEvidenceRequest({ intent, data });
      if (!res.ok) {
        toast({ title: "لم تُرسَل توصية", description: describeEvidenceError(res.error), variant: "destructive" });
        continue;
      }
      // البحث المجهَّز مسبقاً يُلحق بحمولة العرض فقط — لا يدخل الـIntent ولا العقد ولا التنفيذ
      queue.push({ intent, request: { ...res.request, research: researchFor(cvReview.researchByRecommendation, intent.recommendationId) } });
    }
    if (queue.length) setEvidenceQueue((q) => [...q, ...queue]);
    deliverToAssistant(direct);
  };

  const popEvidence = () => setEvidenceQueue((q) => q.slice(1));

  // ── تخصيص لوظيفة داخل نافذة واحدة: تحليل الإعلان ثم إرسال المحدد إلى مساعد السيرة ──
  const [tailorOpen, setTailorOpen] = useState(false);

  /** التوصيات المختارة → Intents → مساعد السيرة. لا كتابة على السيرة من هنا. */
  const sendTailorToAssistant = (selectedIds, review) => {
    const { intents, rejected } = buildSelectedIntents({
      review,
      selectedIds,
      cvId: currentCvId,
      templateId,
      indexSummary: summarizeIndex(buildCVIndex(data)),
      cvLanguage: cvLanguageTag(data),
      uiLanguage: lang,
      source: "application_tailor"
    });
    if (intents.length === 0) {
      return { ok: false, error: describeRejection(rejected[0]?.error), sentIds: [] };
    }
    deliverToAssistant(intents.map((intent) => ({ intent })));
    return {
      ok: true,
      error: rejected.length ? describeRejection(rejected[0].error) : "",
      sentIds: intents.map((intent) => intent.recommendationId)
    };
  };

  /**
   * الضغط على توصية: اختيار محلي كما كان + فتح نافذة التوصية القائمة إن كان لها بحث
   * خارجي مجهَّز مسبقاً. **لا يُستدعى ResearchPublicSource هنا إطلاقاً** — تُقرأ النتيجة
   * المخزّنة لحظة المراجعة فقط. التوصيات بلا بحث تبقى بسلوكها الحالي حرفياً.
   */
  const onRecommendationClick = (id) => {
    cvReview.toggleRecommendation(id);
    const research = researchFor(cvReview.researchByRecommendation, id);
    if (!research) return;
    if (evidenceQueue.some((e) => e.request.recommendationId === id)) return; // مفتوحة/مصطفّة أصلاً
    const rec = (cvReview.review?.recommendations || []).find((r) => r.id === id);
    if (!rec) return;
    const built = buildReviewIntent({
      rec,
      selectedIds: [id, ...(Array.isArray(rec.dependsOn) ? rec.dependsOn : [])],
      cvId: currentCvId,
      templateId,
      indexSummary: summarizeIndex(buildCVIndex(data)),
      cvLanguage: cvLanguageTag(data),
      uiLanguage: lang
    });
    if (!built.ok) {
      toast({ title: "تعذّر عرض تفاصيل التوصية", description: describeRejection(built.error), variant: "destructive" });
      return;
    }
    if (!needsEvidence(built.intent)) return; // لا بطاقة تأكيد لهذه التوصية ⇒ لا نافذة
    const res = buildEvidenceRequest({ intent: built.intent, data });
    if (!res.ok) {
      toast({ title: "تعذّر عرض تفاصيل التوصية", description: describeEvidenceError(res.error), variant: "destructive" });
      return;
    }
    setEvidenceQueue((q) => [...q, { intent: built.intent, request: { ...res.request, research } }]);
  };

  const confirmEvidence = (evidence) => {
    const head = evidenceQueue[0];
    popEvidence();
    if (!head) return;
    // إعادة تحقّق قبل التسليم: تغيّرت السيرة بعد المراجعة ⇒ الحزمة قديمة ولا يُرسَل شيء
    const check = verifyEvidenceStillValid({ intent: head.intent, data, request: head.request });
    if (!check.ok) {
      toast({ title: "لم تُرسَل التوصية", description: describeEvidenceError(check.error), variant: "destructive" });
      return;
    }
    deliverToAssistant([{ intent: head.intent, evidence }]);
  };

  // ── نقطة اختيار المسار: تحسين عام (Review Coach) أو تخصيص لوظيفة — مسار واحد فقط لكل قرار ──
  const [choiceOpen, setChoiceOpen] = useState(incomingIntents.length === 0);
  const choiceReady = isWorkflowChoiceReady({ cvId: currentCvId, templateId, templateReviewStatus, processing });

  const chooseWorkflow = (choice) => {
    const { runGeneralReview, startJobTailoring } = resolveWorkflowActions(choice);
    setChoiceOpen(false);
    if (runGeneralReview) {
      // مراجعة سابقة مكتملة ⇒ دورة جديدة. أما الدورة الجارية (تشغيل مسبق) فلا تُقطع أبداً.
      if (cvReview.review) cvReview.reset();
      startReviewRef.current();
      logAction("ai_command", { command: "تحسين السيرة بشكل عام" });
      return;
    }
    if (startJobTailoring) {
      // كلا مدخلي «تخصيص CV لوظيفة معينة» يجب أن يفتحا نفس الـPopup داخل Builder.
      // لا تنقّل إلى /tailor ولا تفتح صفحة محادثة منفصلة.
      setTailorOpen(true);
    }
  };

  const acceptSuggestedTemplate = async () => {
    // القالب فقط؛ الـeffect القائم يزامن layout والحفظ التلقائي يحفظ الاثنين
    setTemplateId(review.templateId);
    logAction("template_change", { template: review.templateId });
    await closeReview();
  };

  return (
    <div dir={dir} className="cv-builder-root h-screen bg-[#F5F5F5] text-slate-900 flex flex-col overflow-hidden" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <header className="no-print shrink-0 border-b border-slate-200 bg-white">
        <div className="px-5 py-3 pr-[104px] flex items-center justify-between gap-3 flex-wrap">
          <button onClick={() => navigate("/")} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowRight className="w-4 h-4" />
            <span>{t("builder.back")}</span>
          </button>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            {autoSaveStatus === "saving" && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                جارٍ الحفظ...
              </span>
            )}
            {autoSaveStatus === "saved" && (
              <span className="inline-flex items-center gap-1 text-[11px] text-green-600">
                <Check className="w-3 h-3" />
                تم الحفظ
              </span>
            )}
            {choiceReady && !choiceOpen && (
              <button onClick={() => setChoiceOpen(true)} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                <span>ماذا تريد أن تفعل؟</span>
              </button>
            )}
            <button onClick={() => (showSmart ? setShowSmart(false) : openAssistant())} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">مساعد السيرة</span>
            </button>
            <button onClick={() => setShowTemplates(true)} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
              <LayoutTemplate className="w-4 h-4" />
              <span className="hidden sm:inline">CV Templates</span>
            </button>
            <button onClick={() => setShowPreview(true)} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Preview</span>
            </button>
            <div className="relative">
              <button onClick={() => setShowShare((v) => !v)} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
              {showShare && <div className="absolute top-11 right-0 z-50 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 text-right">
                <button onClick={copyCVLink} className="w-full px-3 py-2.5 rounded-lg hover:bg-slate-50 text-sm inline-flex items-center gap-2"><Copy className="w-4 h-4" /> Copy CV Link</button>
                <button onClick={emailCV} className="w-full px-3 py-2.5 rounded-lg hover:bg-slate-50 text-sm text-right">Email CV</button>
                <button onClick={() => { setShowShare(false); exportPDF(); }} className="w-full px-3 py-2.5 rounded-lg hover:bg-slate-50 text-sm text-right">Print / PDF</button>
                <button onClick={shareApplication} className="w-full px-3 py-2.5 rounded-lg hover:bg-slate-50 text-sm text-right">Share Smart CV / Application</button>
              </div>}
            </div>
            <button onClick={() => setShowLayout(true)} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">{t("builder.layout")}</span>
            </button>
            <button onClick={() => setSaveOpen(true)} className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
              <Save className="w-4 h-4" />
              <span>{t("builder.save")}</span>
            </button>
            {currentCvId && (
              <button onClick={() => setTailorOpen(true)} className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-[#D9E830] text-black hover:bg-[#c5d420] transition-colors font-medium">
                <Target className="w-4 h-4" />
                <span className="hidden sm:inline">تخصيص CV لوظيفة معينة</span>
              </button>
            )}
            {currentCvId && (
              <button onClick={() => navigate(`/template-advisor/${currentCvId}`)} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                <LayoutTemplate className="w-4 h-4" />
                <span className="hidden sm:inline">استشارة قالب</span>
              </button>
            )}
            <button onClick={exportPDF} className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-[#000066] text-white hover:bg-[#00003d] transition-colors">
              {authChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{t("builder.pdf")}</span>
            </button>
          </div>
        </div>
      </header>

      {!processing && <CVRelationBar cvId={currentCvId} meta={cvMeta} />}

      {review.ready && !reviewDismissed && !processing && (
        <div className="no-print shrink-0 px-4 pt-3 bg-slate-200/60">
          <TemplateReviewCard
            visible
            decision={review.decision}
            currentTemplateId={templateId}
            suggestedTemplateId={review.templateId}
            reason={review.reason}
            data={data}
            currentLayout={layout}
            onAccept={acceptSuggestedTemplate}
            onReject={closeReview}
            onContinue={closeReview}
          />
        </div>
      )}

      {choiceReady && choiceOpen && !cvReview.ready && (
        <div className="no-print shrink-0 px-4 pt-3 bg-slate-200/60">
          <WorkflowChoiceCard
            onGeneral={() => chooseWorkflow(WORKFLOW_GENERAL)}
            onTailor={() => chooseWorkflow(WORKFLOW_TAILOR)}
            onClose={() => setChoiceOpen(false)}
          />
        </div>
      )}

      {cvReview.ready && !processing && (
        <div className="no-print shrink-0 px-4 pt-3 bg-slate-200/60">
          <CVReviewCard
            review={cvReview.review}
            selectedIds={cvReview.selectedIds}
            onToggle={onRecommendationClick}
            onSendToAssistant={sendReviewToAssistant}
            onClose={cvReview.dismiss}
          />
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {!processing && <div className="hidden xl:block shrink-0"><SuitableJobsPanel data={data} /></div>}
        {processing && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#000066]" />
            <p className="text-sm">{t("builder.processing")}</p>
          </div>
        )}
        {!processing && (
          <div ref={panelRef} className="cv-builder-panel flex-1 overflow-y-auto overflow-x-hidden p-6 bg-slate-200/60 flex">
            <div className="no-print fixed top-1/2 right-4 -translate-y-1/2 z-30">
              <CVSideToolbar
                onImprove={regenerate}
                regenerating={regenerating}
                processing={processing}
                data={data}
                onApply={(d) => setData(d)}
                templateId={templateId}
                onTemplateChange={(id) => { setTemplateId(id); logAction("template_change", { template: id }); }}
                scale={scale}
                isFit={userZoom === null}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                onZoomReset={zoomReset}
                onZoomFit={zoomFit}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={undo}
                onRedo={redo}
                onAgent={() => (showSmart ? setShowSmart(false) : openAssistant())}
                agentActive={showSmart}
                onLog={() => setShowLog((v) => !v)}
                logActive={showLog}
              />
            </div>
            <div style={{ width: A4_W * scale, height: contentH * scale }} className="cv-scale-parent m-auto">
              <div ref={wrapperRef} className="cv-scale-wrapper relative" style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: A4_W }}>
                <EditProvider value={{ activateEdit: () => {} }}>
                <CVPages templateId={templateId} data={data} editable={mode === "edit"} actions={actions} layout={layout} />
              </EditProvider>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="print-notice">{t("builder.printLocked")}</div>

      {showTemplates && (
        <TemplatePickerModal
          templateId={templateId}
          onChange={(id) => { setTemplateId(id); logAction("template_change", { template: id, source: "header" }); }}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {showPreview && (
        <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 no-print" onClick={() => setShowPreview(false)}>
          <div className="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden" dir={dir} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200"><div className="flex items-center gap-2"><Eye className="w-4 h-4 text-[#526B35]" /><span className="font-semibold text-sm">CV Preview</span></div><button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button></div>
            <div className="p-5 overflow-auto max-h-[calc(92vh-56px)] flex justify-center"><div className="bg-white shadow-lg" style={{ width: A4_W, minHeight: A4_H }}><CVPreview templateId={templateId} data={data} editable={false} actions={actions} layout={layout} /></div></div>
          </div>
        </div>
      )}

      {showLayout && (
        <LayoutEditor
          layout={layout}
          hasSidebar={templateId !== "executive" && templateId !== "nordic"}
          onChange={(l) => { setLayout(l); logAction("layout_change", { source: "manual", detail: "سحب وإفلات" }); }}
          onClose={() => setShowLayout(false)}
        />
      )}

      {saveOpen && (
        <CVSaveDialog
          defaultTitel={currentCvId ? "" : (data.titel || "")}
          saving={saving}
          onSave={saveCV}
          onClose={() => setSaveOpen(false)}
        />
      )}

      {assistantMounted && (
        <div className={`no-print fixed bottom-4 left-4 z-40 w-[calc(100vw-2rem)] sm:w-[380px] max-w-[380px] shadow-2xl rounded-2xl ${showSmart ? "" : "pointer-events-none opacity-0"}`} aria-hidden={!showSmart}>
          <SmartCVAssistantPanel
            data={data}
            layout={layout}
            templateId={templateId}
            cvId={currentCvId}
            pendingIntents={pendingIntents}
            minimized={assistantMinimized}
            onMinimize={() => { setAssistantMinimized(true); setShowSmart(true); }}
            onRestore={() => { setAssistantMinimized(false); setShowSmart(true); }}
            onLayoutChange={(l) => { setLayout(l); logAction("layout_change", { source: "assistant", detail: "cv_move_section" }); }}
            onDataChange={(d, summary) => { setData(d); logAction("ai_command", { command: summary || "تعديل محتوى عبر مساعد السيرة" }); }}
            onClose={() => { setShowSmart(false); setAssistantMinimized(false); }}
          />
        </div>
      )}

      {evidenceQueue.length > 0 && (
        <EvidenceDialog
          key={evidenceQueue[0].request.recommendationId}
          request={evidenceQueue[0].request}
          index={1}
          total={evidenceQueue.length}
          onConfirm={confirmEvidence}
          onSkip={popEvidence}
          onCancel={popEvidence}
        />
      )}

      {tailorOpen && currentCvId && (
        <JobTailorDialog
          cvId={currentCvId}
          templateId={templateId}
          data={data}
          cvTitle={data.titel || ""}
          onSend={sendTailorToAssistant}
          onClose={() => setTailorOpen(false)}
        />
      )}

      <ActionLogPanel open={showLog} onClose={() => setShowLog(false)} />

    </div>
  );
}