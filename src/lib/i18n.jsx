import { createContext, useContext, useEffect, useState } from "react";

/**
 * UI language system (i18n) for the interface.
 * The corner selector switches the interface language (ar / sv / en).
 * CV content language is decided separately by the generation step
 * (auto-detected from input, defaulting to Swedish).
 */
const STORAGE_KEY = "cvcraft_ui_lang";
const DIRS = { ar: "rtl", sv: "ltr", en: "ltr" };

const DICT = {
  "nav.applications": { ar: "متتبّع الطلبات", sv: "Ansökningar", en: "Applications" },
  "hero.title1": { ar: "سيرة ذاتية احترافية بالسويدية", sv: "Professionellt svenskt CV", en: "Professional Swedish CV" },
  "hero.title2": { ar: "في دقائق", sv: "på minuter", en: "in minutes" },
  "hero.subtitle": {
    ar: "اختر قالباً، أدخل بياناتك أو ارفع سيرتك القديمة، وسنقرأها ونُعبّئ القالب تحت العناوين المناسبة بأسلوب احترافي.",
    sv: "Välj en mall, fyll i dina uppgifter eller ladda upp ditt gamla CV — vi läser det och fyller mallen med rätt rubriker och en professionell ton.",
    en: "Pick a template, enter your details or upload your old CV — we read it and fill the template under the right headings in a professional tone.",
  },
  "home.step1": { ar: "١. اختر القالب", sv: "1. Välj mall", en: "1. Choose template" },
  "home.step2": { ar: "٢. أدخل بياناتك", sv: "2. Fyll i dina uppgifter", en: "2. Enter your details" },
  "home.textLabel": { ar: "اكتب نصاً حراً", sv: "Skriv fritext", en: "Write free text" },
  "home.textPlaceholder": {
    ar: "الصق بياناتك هنا — مهاراتك، خبراتك السابقة، تعليمك، اللغات... بأي ترتيب وبأي لغة، وسنرتّبها ونترجمها للسويدية.",
    sv: "Klistra in dina uppgifter här — färdigheter, tidigare erfarenhet, utbildning, språk... i valfri ordning och valfritt språk, så strukturerar vi dem.",
    en: "Paste your details here — skills, experience, education, languages... in any order and language, and we'll structure them.",
  },
  "home.fileLabel": { ar: "أو ارفع ملفاً قديماً", sv: "Eller ladda upp en gammal fil", en: "Or upload an old file" },
  "home.fileType": { ar: "PDF أو Word", sv: "PDF eller Word", en: "PDF or Word" },
  "home.fileHint": { ar: "اسحب أو اختر ملفاً", sv: "Dra eller välj en fil", en: "Drag or choose a file" },
  "home.fileChange": { ar: "اضغط لتغيير الملف", sv: "Klicka för att byta fil", en: "Click to change file" },
  "home.start": { ar: "أنشئ سيرتي الذاتية", sv: "Skapa mitt CV", en: "Create my CV" },
  "home.uploading": { ar: "جرّى الرفع...", sv: "Laddar upp...", en: "Uploading..." },

  "builder.back": { ar: "القوالب", sv: "Mallar", en: "Templates" },
  "builder.layout": { ar: "ترتيب", sv: "Layout", en: "Layout" },
  "builder.improve": { ar: "حسّن", sv: "Förbättra", en: "Improve" },
  "builder.tools": { ar: "أدوات", sv: "Verktyg", en: "Tools" },
  "builder.save": { ar: "حفظ", sv: "Spara", en: "Save" },
  "builder.preview": { ar: "معاينة", sv: "Förhandsgranska", en: "Preview" },
  "builder.pdf": { ar: "PDF", sv: "PDF", en: "PDF" },
  "builder.processing": { ar: "نقرأ بياناتك ونرتّبها بالسويدية...", sv: "Vi läser dina uppgifter och sorterar dem...", en: "Reading your details and arranging them..." },
  "builder.previewTitle": { ar: "معاينة السيرة الذاتية", sv: "Förhandsgranskning av CV", en: "CV Preview" },
  "builder.downloadPdf": { ar: "تنزيل PDF", sv: "Ladda ner PDF", en: "Download PDF" },
  "builder.close": { ar: "إغلاق", sv: "Stäng", en: "Close" },
  "builder.pageBoundary": { ar: "— حدود الصفحة —", sv: "— Sidgräns —", en: "— Page boundary —" },
  "builder.printLocked": { ar: "سجّل الدخول لطباعة أو تنزيل السيرة", sv: "Logga in för att skriva ut eller ladda ner CV", en: "Log in to print or download the CV" },
  "builder.aiEdit": { ar: "تعديل ذكي", sv: "AI-redigering", en: "AI edit" },
  "builder.manualEdit": { ar: "تعديل يدوي", sv: "Redigera manuellt", en: "Manual edit" },
  "builder.changeTemplate": { ar: "تغيير القالب", sv: "Byt mall", en: "Change template" },
  "builder.matchJob": { ar: "مطابقة إعلان وظيفي", sv: "Matcha annons", en: "Match job ad" },
  "builder.more": { ar: "المزيد", sv: "Fler verktyg", en: "More" },
  "builder.zoomIn": { ar: "تكبير", sv: "Zooma in", en: "Zoom in" },
  "builder.zoomOut": { ar: "تصغير", sv: "Zooma ut", en: "Zoom out" },
  "builder.fitWidth": { ar: "ملاءمة العرض", sv: "Anpassa bredd", en: "Fit width" },
  "builder.undo": { ar: "تراجع", sv: "Ångra", en: "Undo" },
  "builder.redo": { ar: "تقدّم", sv: "Gör om", en: "Redo" },

  "assistant.title": { ar: "مساعد السيرة", sv: "CV-assistent", en: "CV Assistant" },
  "assistant.subtitle": { ar: "قراءة + تعديل + ترتيب", sv: "Läs + redigera + ordna", en: "Read + edit + arrange" },
  "assistant.empty": { ar: "اسألني عن أي شيء في سيرتك.", sv: "Fråga mig om vad som helst i ditt CV.", en: "Ask me anything about your CV." },
  "assistant.emptyExample": { ar: "مثال: «شو آخر خبرة عندي؟»", sv: "Exempel: ”Vad är min senaste erfarenhet?”", en: "Example: “What is my latest experience?”" },
  "assistant.placeholder": { ar: "اكتب سؤالك…", sv: "Skriv din fråga…", en: "Type your question…" },
  "assistant.initializing": { ar: "جارٍ التهيئة…", sv: "Initierar…", en: "Initializing…" },
  "assistant.close": { ar: "إغلاق", sv: "Stäng", en: "Close" },

  "corner.login": { ar: "دخول", sv: "Logga in", en: "Log in" },
  "corner.register": { ar: "حساب جديد", sv: "Skapa konto", en: "Sign up" },
  "corner.logout": { ar: "خروج", sv: "Logga ut", en: "Log out" },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || "ar"; } catch { return "ar"; }
  });

  useEffect(() => {
    const dir = DIRS[lang] || "rtl";
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  }, [lang]);

  const t = (key) => DICT[key]?.[lang] || DICT[key]?.ar || key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, dir: DIRS[lang] || "rtl", t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};