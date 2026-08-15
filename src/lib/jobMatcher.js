/**
 * Fast Matching — تسجيل محلي (بلا نموذج لغوي) بين سيرة ذاتية وإعلان وظيفة سويدي.
 *
 * تصحيح جوهري عن النسخة السابقة القائمة على "نسبة التغطية" (hits / كل كلمات السيرة):
 *   1) التغطية كانت **تعاقب الغنى** — السيرة الأغنى يكبر مقامها فتخسر أمام سيرة فقيرة.
 *      البديل: احتساب **الإصابات الموزونة** ثم تطبيع تشبّعي، فلا يُكافأ الفقر ولا يُعاقب الغنى.
 *   2) المطابقة الحرفية كانت عمياء عن التصريف السويدي
 *      (arbetskonsulent ≠ arbetsmarknadskonsulent، konsulenter ≠ konsulent).
 *      البديل: مطابقة على **جذوع** الكلمات مع قصّ اللواحق الشائعة.
 *
 * منطق نقيّ: لا استدعاء شبكة، لا SDK، لا نموذج لغوي، لا قراءة قاعدة بيانات.
 */

const STOP = new Set([
  "och", "eller", "med", "att", "en", "ett", "som", "av", "till", "for", "för",
  "har", "är", "ar", "var", "vi", "du", "god", "bra", "sa", "så", "i", "pa", "på",
  "den", "det", "vid", "kan", "ska", "samt", "oss", "dig", "din", "ditt", "hos",
]);

/** أقسام السيرة وأوزانها في التسجيل — قائمة مغلقة */
export const FIELD_WEIGHTS = { titel: 3, fardigheter: 2, roller: 2, profil: 1, utbildning: 1 };
const TITLE_HIT_WEIGHT = 4; // إصابة في عنوان الإعلان أقوى إشارة منفردة
const SATURATION = 18; // ثابت التشبّع: نقطة الانعطاف في 1-e^(-raw/k)

export function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-zåäö0-9]+/i)
    .filter((t) => t && t.length > 2 && !STOP.has(t));
}

/** جذع heuristic للسويدية: قصّ اللواحق الشائعة ثم تقييد الطول لاحتواء الكلمات المركّبة */
export function stem(word) {
  return String(word || "")
    .replace(/(erna|arna|orna|ande|ning|erad|are|else|en|ar|er|or|et|t|s)$/, "")
    .slice(0, 7);
}

const uniq = (arr) => [...new Set(arr)];
const stems = (arr) => uniq(arr.map(stem).filter(Boolean));

/** يجمع جذوع السيرة موزّعةً على أقسامها — لا يخلطها في كيس واحد */
export function cvStemBag(cv) {
  return {
    titel: stems(tokenize(cv?.titel)),
    fardigheter: stems((cv?.fardigheter || []).flatMap((f) => tokenize(f?.namn))),
    roller: stems((cv?.erfarenhet || []).flatMap((e) => tokenize(e?.roll))),
    profil: stems(tokenize(cv?.profil)),
    utbildning: stems((cv?.utbildning || []).flatMap((u) => tokenize(u?.examen))),
  };
}

/**
 * الكلمات المفتاحية الخام (بلا تجذيع) — عقد قائم يعتمد عليه مستهلكون آخرون
 * (لوحة المسار ومستشار الدورات) للمقارنة الحرفية مع كلمات الإعلانات. لا تُجذَّع هنا.
 */
export function cvKeywords(cv) {
  const set = new Set();
  tokenize(cv?.titel).forEach((t) => set.add(t));
  (cv?.fardigheter || []).forEach((f) => {
    if (!f?.namn) return;
    tokenize(f.namn).forEach((t) => set.add(t));
    if (f.namn.length > 2) set.add(String(f.namn).toLowerCase());
  });
  (cv?.erfarenhet || []).forEach((e) => tokenize(e?.roll).forEach((t) => set.add(t)));
  (cv?.sprak || []).forEach((l) => { if (l?.sprak && l.sprak.length > 2) set.add(String(l.sprak).toLowerCase()); });
  return [...set];
}

/** الجذوع المسطّحة — للتسجيل الداخلي فقط */
export function cvStemKeywords(cv) {
  return uniq(Object.values(cvStemBag(cv)).flat());
}

function adStems(ad) {
  const body = [ad?.rubrik, ad?.beskrivning, (ad?.krav || []).map((k) => k?.namn).join(" ")]
    .filter(Boolean)
    .join(" ");
  return { all: new Set(stems(tokenize(body))), rubrik: new Set(stems(tokenize(ad?.rubrik))) };
}

/**
 * تفصيل المطابقة — للتشخيص وترتيب المرشّحين.
 * @returns {{score:number, raw:number, titleHits:number, per:object}}
 */
export function matchDetails(cv, ad) {
  const bag = cvStemBag(cv);
  const { all, rubrik } = adStems(ad);
  let raw = 0;
  const per = {};
  for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
    const list = bag[field];
    const hits = list.filter((t) => all.has(t)).length;
    per[field] = { hits, of: list.length };
    raw += weight * hits;
  }
  const titleHits = bag.titel.filter((t) => rubrik.has(t)).length;
  raw += titleHits * TITLE_HIT_WEIGHT;
  const score = raw === 0 ? 0 : Math.round(100 * (1 - Math.exp(-raw / SATURATION)));
  return { score, raw, titleHits, per };
}

/** درجة 0..100. عدد الإصابات هو المحرّك، فلا تخسر السيرة الغنية لغناها. */
export function localMatchScore(cv, ad) {
  return matchDetails(cv, ad).score;
}