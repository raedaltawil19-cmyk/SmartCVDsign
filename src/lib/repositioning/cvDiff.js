/**
 * cvDiff — deterministic CV change detection for professional evidence extraction.
 *
 * Pure helper: no React, no Base44, no agents, no database writes, no side effects.
 *
 * CV data shape (from cvModel.js emptyCV):
 *   namn          string      — full name
 *   titel         string      — professional title
 *   kontakt       object      — telefon, epost, adress, linkedin
 *   profil        string      — profile/about text
 *   erfarenhet    array       — [{roll, foretag, period, beskrivning}]
 *   utbildning    array       — [{examen, skola, period, beskrivning}]
 *   fardigheter   array       — [{namn, niva}]
 *   sprak         array       — [{sprak, niva}]
 *   references    array       — [{namn, relation, organisation, epost, telefon, anteckning}]
 *   referencesTitel  string
 *   referencesDold   boolean
 *
 * Presentation fields (templateId, layout, referencesTitel, referencesDold) are
 * explicitly excluded from professional content comparison.
 *
 * Change types:
 *   FACT_ADDITION    — new professional information appeared
 *   REMOVAL          — existing professional information was removed
 *   CONTENT_REWRITE  — wording changed but no clear new fact
 *   FORMATTING_ONLY  — only presentation changed, no professional content
 *   UNCHANGED        — no difference
 */

/** @typedef {"FACT_ADDITION"|"REMOVAL"|"CONTENT_REWRITE"|"FORMATTING_ONLY"|"UNCHANGED"} ChangeType */

/**
 * @typedef {Object} FieldChange
 * @property {ChangeType} changeType
 * @property {string}     category      — "erfarenhet" | "utbildning" | "fardigheter" | "sprak" | "titel" | "profil"
 * @property {string}     field         — specific field within the category
 * @property {*}          previous
 * @property {*}          current
 * @property {string}     [key]         — stable identity key for the item (if applicable)
 */

/**
 * @typedef {Object} CvDiffResult
 * @property {boolean}       hasChanges          — true if any non-FORMATTING_ONLY change exists
 * @property {boolean}       hasProfessionalChange — true if any FACT_ADDITION, REMOVAL, or CONTENT_REWRITE exists
 * @property {FieldChange[]} changes
 * @property {"resolved"|"unresolved"} status     — "unresolved" if lineage cannot be confirmed
 * @property {string}        [unresolvedReason]
 */

// ─── Normalisation helpers ────────────────────────────────────────────────────

/** Trim + lower-case for stable comparison */
const norm = (v) => String(v ?? "").trim().toLowerCase();

/** Identity key for an erfarenhet entry — normalised role + company */
const expKey = (e) => `${norm(e.roll)}|${norm(e.foretag)}`;

/** Identity key for an utbildning entry — normalised degree + school */
const eduKey = (u) => `${norm(u.examen)}|${norm(u.skola)}`;

/** Identity key for a fardigheter entry — normalised skill name */
const skillKey = (f) => norm(f.namn);

/** Identity key for a sprak entry — normalised language name */
const langKey = (s) => norm(s.sprak);

/**
 * Coarse text-change heuristic.
 * Returns true when the edit looks like a word-count expansion (likely a rewrite)
 * rather than a completely different value (likely a new fact).
 * We deliberately keep this simple — semantic interpretation belongs to the AI layer.
 */
function looksLikeRewrite(prev, curr) {
  const p = norm(prev);
  const c = norm(curr);
  if (!p || !c) return false;
  const pWords = new Set(p.split(/\s+/).filter(Boolean));
  const cWords = new Set(c.split(/\s+/).filter(Boolean));
  // intersection / smaller-set size
  let shared = 0;
  for (const w of pWords) if (cWords.has(w)) shared++;
  const overlap = shared / Math.min(pWords.size, cWords.size);
  return overlap >= 0.4; // ≥40% word overlap → treat as rewrite, not replacement
}

// ─── Array-section diffing ────────────────────────────────────────────────────

/**
 * Generic array section diff.
 * Uses the provided keyFn to match items across versions.
 * @param {object[]} prev
 * @param {object[]} curr
 * @param {function} keyFn       — returns a string identity key for an item
 * @param {string}   category    — category label for the change records
 * @param {function} fieldsFrom  — returns the subset of fields to compare (strips presentation)
 * @returns {FieldChange[]}
 */
function diffArray(prev, curr, keyFn, category, fieldsFrom) {
  const changes = [];
  const prevNorm = (Array.isArray(prev) ? prev : []).map((item) => ({ item, key: keyFn(item) }));
  const currNorm = (Array.isArray(curr) ? curr : []).map((item) => ({ item, key: keyFn(item) }));

  const prevMap = new Map(prevNorm.map(({ item, key }) => [key, item]));
  const currMap = new Map(currNorm.map(({ item, key }) => [key, item]));

  // Detect additions
  for (const { item, key } of currNorm) {
    if (!prevMap.has(key)) {
      changes.push({
        changeType: "FACT_ADDITION",
        category,
        field: category,
        previous: null,
        current: fieldsFrom(item),
        key,
      });
    }
  }

  // Detect removals and modifications
  for (const { item: prevItem, key } of prevNorm) {
    if (!currMap.has(key)) {
      changes.push({
        changeType: "REMOVAL",
        category,
        field: category,
        previous: fieldsFrom(prevItem),
        current: null,
        key,
      });
    } else {
      const currItem = currMap.get(key);
      const prevFields = fieldsFrom(prevItem);
      const currFields = fieldsFrom(currItem);
      const prevStr = stableStringify(prevFields);
      const currStr = stableStringify(currFields);
      if (prevStr !== currStr) {
        // Determine if this is a rewrite or effectively a new entry
        const prevText = Object.values(prevFields).join(" ");
        const currText = Object.values(currFields).join(" ");
        const changeType = looksLikeRewrite(prevText, currText) ? "CONTENT_REWRITE" : "FACT_ADDITION";
        changes.push({
          changeType,
          category,
          field: category,
          previous: prevFields,
          current: currFields,
          key,
        });
      }
    }
  }

  return changes;
}

// ─── Scalar field diffing ─────────────────────────────────────────────────────

function diffScalar(prev, curr, category, field) {
  const p = String(prev ?? "").trim();
  const c = String(curr ?? "").trim();
  if (p === c) return null;
  if (!p && c) return { changeType: "FACT_ADDITION", category, field, previous: p, current: c };
  if (p && !c) return { changeType: "REMOVAL", category, field, previous: p, current: c };
  const changeType = looksLikeRewrite(p, c) ? "CONTENT_REWRITE" : "FACT_ADDITION";
  return { changeType, category, field, previous: p, current: c };
}

// ─── Presentation-only change detection ──────────────────────────────────────

/**
 * Returns true when the ONLY differences between two CV records are presentation
 * fields (templateId, layout, referencesTitel, referencesDold).
 * The actual content diff will already ignore these fields, so this is informational.
 */
function isFormattingOnlyChange(prevRecord, currRecord) {
  // Strip presentation fields and compare remainder
  const stripPresentation = (r) => {
    const { templateId: _t, layout: _l, referencesTitel: _rt, referencesDold: _rd, ...rest } = (r || {});
    return rest;
  };
  return stableStringify(stripPresentation(prevRecord)) === stableStringify(stripPresentation(currRecord));
}

// ─── Stable stringify ─────────────────────────────────────────────────────────

function stableStringify(value) {
  if (value === null || value === undefined) return String(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * diffCvData — compare the professional content of two CV data objects.
 *
 * Input is `data` only (the content blob), NOT the full SavedCV record.
 * Presentation fields (templateId, layout, etc.) must be stripped before calling.
 *
 * @param {object|null} previousData  — emptyCV-shaped data object, or null for a brand-new CV
 * @param {object|null} currentData   — emptyCV-shaped data object
 * @returns {CvDiffResult}
 */
export function diffCvData(previousData, currentData) {
  const prev = previousData || {};
  const curr = currentData || {};

  const changes = [];

  // 1. Professional title
  const titleChange = diffScalar(prev.titel, curr.titel, "titel", "titel");
  if (titleChange) changes.push(titleChange);

  // 2. Profile / about
  const profilChange = diffScalar(prev.profil, curr.profil, "profil", "profil");
  if (profilChange) changes.push(profilChange);

  // 3. Experience — erfarenhet
  changes.push(...diffArray(
    prev.erfarenhet,
    curr.erfarenhet,
    expKey,
    "erfarenhet",
    (e) => ({ roll: e.roll || "", foretag: e.foretag || "", period: e.period || "", beskrivning: e.beskrivning || "" }),
  ));

  // 4. Education — utbildning
  changes.push(...diffArray(
    prev.utbildning,
    curr.utbildning,
    eduKey,
    "utbildning",
    (u) => ({ examen: u.examen || "", skola: u.skola || "", period: u.period || "", beskrivning: u.beskrivning || "" }),
  ));

  // 5. Skills — fardigheter
  changes.push(...diffArray(
    prev.fardigheter,
    curr.fardigheter,
    skillKey,
    "fardigheter",
    (f) => ({ namn: f.namn || "" }), // niva is not professional content — it is a presentation choice
  ));

  // 6. Languages — sprak
  changes.push(...diffArray(
    prev.sprak,
    curr.sprak,
    langKey,
    "sprak",
    (s) => ({ sprak: s.sprak || "", niva: s.niva || "" }),
  ));

  const hasProfessionalChange = changes.some(
    (c) => c.changeType === "FACT_ADDITION" || c.changeType === "REMOVAL" || c.changeType === "CONTENT_REWRITE",
  );
  const hasChanges = changes.length > 0;

  return {
    status: "resolved",
    hasChanges,
    hasProfessionalChange,
    changes,
  };
}

/**
 * diffMasterToMaster — compare two Master CV versions when lineage is known.
 *
 * Both records must be provided. If either is missing, returns unresolved.
 *
 * @param {object|null} previousRecord  — full SavedCV record (contains .data)
 * @param {object|null} currentRecord   — full SavedCV record (contains .data)
 * @returns {CvDiffResult}
 */
export function diffMasterToMaster(previousRecord, currentRecord) {
  if (!previousRecord || !currentRecord) {
    return {
      status: "unresolved",
      unresolvedReason: "MISSING_RECORD",
      hasChanges: false,
      hasProfessionalChange: false,
      changes: [],
    };
  }
  if (previousRecord.id === currentRecord.id) {
    return {
      status: "resolved",
      hasChanges: false,
      hasProfessionalChange: false,
      changes: [],
    };
  }
  return diffCvData(previousRecord.data || null, currentRecord.data || null);
}

/**
 * diffTailoredToSourceMaster — compare a Tailored CV to its source Master.
 *
 * Answers: "What content exists in the Tailored CV that was not in its source Master?"
 *
 * If sourceMasterCvId is missing, returns an explicit unresolved state.
 * The caller must resolve the source Master record and pass it in.
 *
 * @param {object}      tailoredRecord      — full SavedCV record with .data and .sourceMasterCvId
 * @param {object|null} sourceMasterRecord  — the resolved source Master record, or null if unresolvable
 * @returns {CvDiffResult}
 */
export function diffTailoredToSourceMaster(tailoredRecord, sourceMasterRecord) {
  if (!tailoredRecord) {
    return {
      status: "unresolved",
      unresolvedReason: "MISSING_TAILORED_RECORD",
      hasChanges: false,
      hasProfessionalChange: false,
      changes: [],
    };
  }

  const sourceCvId = tailoredRecord.sourceMasterCvId || tailoredRecord.parentCvId;
  if (!sourceCvId) {
    return {
      status: "unresolved",
      unresolvedReason: "MISSING_SOURCE_MASTER_CV_ID",
      hasChanges: false,
      hasProfessionalChange: false,
      changes: [],
    };
  }

  if (!sourceMasterRecord) {
    return {
      status: "unresolved",
      unresolvedReason: "SOURCE_MASTER_NOT_RESOLVED",
      hasChanges: false,
      hasProfessionalChange: false,
      changes: [],
    };
  }

  // Compare source Master (previous) → Tailored (current)
  // This surfaces what is DIFFERENT in the tailored version relative to its source.
  return diffCvData(sourceMasterRecord.data || null, tailoredRecord.data || null);
}

/**
 * cvContentFingerprint — a stable hash of the professional content fields only.
 * Excludes presentation fields (templateId, layout, referencesTitel, referencesDold).
 * Use this to detect whether a CV's professional content has changed between saves.
 * Does NOT replace or modify the existing repositioningFingerprint.
 *
 * @param {object|null} data  — emptyCV-shaped data object
 * @returns {string}
 */
export function cvContentFingerprint(data) {
  if (!data) return "empty";
  const content = {
    titel: data.titel || "",
    profil: data.profil || "",
    erfarenhet: (data.erfarenhet || []).map((e) => ({ roll: e.roll || "", foretag: e.foretag || "", period: e.period || "", beskrivning: e.beskrivning || "" })),
    utbildning: (data.utbildning || []).map((u) => ({ examen: u.examen || "", skola: u.skola || "", period: u.period || "", beskrivning: u.beskrivning || "" })),
    fardigheter: (data.fardigheter || []).map((f) => ({ namn: f.namn || "" })),
    sprak: (data.sprak || []).map((s) => ({ sprak: s.sprak || "", niva: s.niva || "" })),
  };
  return hash(stableStringify(content));
}

function hash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
