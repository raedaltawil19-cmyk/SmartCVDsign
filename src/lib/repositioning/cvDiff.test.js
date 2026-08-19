/**
 * اختبارات cvDiff و professionalEvidence — بيانات وهمية فقط، بلا شبكة وبلا قاعدة بيانات.
 * نقية: لا React، لا Base44، لا وكلاء.
 *
 * تُشغَّل من Console المتصفح أو Node:
 *   (await import('/src/lib/repositioning/cvDiff.test.js')).runCvDiffTests().then(console.log)
 */
import { diffCvData, diffMasterToMaster, diffTailoredToSourceMaster, cvContentFingerprint } from "./cvDiff";
import { extractEvidence, deduplicateEvidence, mergeEvidence } from "./professionalEvidence";

// ─── Shared CV data fixtures ──────────────────────────────────────────────────

const BASE_DATA = {
  namn: "Ahmed Al-Hassan",
  titel: "Frontend-utvecklare",
  kontakt: { telefon: "070-123456", epost: "ahmed@example.com", adress: "Stockholm", linkedin: "" },
  profil: "Erfaren frontendutvecklare med React och TypeScript.",
  erfarenhet: [
    { roll: "Frontend-utvecklare", foretag: "TechCorp", period: "2022–Nu", beskrivning: "Byggde webbgränssnitt med React." },
    { roll: "Webbutvecklare", foretag: "OldShop", period: "2020–2022", beskrivning: "Underhöll e-handelssajt." },
  ],
  utbildning: [
    { examen: "Systemvetenskap", skola: "KTH", period: "2016–2020", beskrivning: "" },
  ],
  fardigheter: [
    { namn: "React", niva: 85 },
    { namn: "TypeScript", niva: 75 },
    { namn: "CSS", niva: 70 },
  ],
  sprak: [
    { sprak: "Svenska", niva: "Modersmål" },
    { sprak: "Engelska", niva: "Flytande" },
  ],
  references: [],
  referencesTitel: "",
  referencesDold: false,
};

const deepCopy = (v) => JSON.parse(JSON.stringify(v));

export function runCvDiffTests() {
  const results = [];
  const add = (name, pass, note) => results.push({ name, pass: !!pass, note: typeof note === "string" ? note : JSON.stringify(note) });

  // ── TEST 1: Identical CVs → no changes ────────────────────────────────────
  {
    const diff = diffCvData(deepCopy(BASE_DATA), deepCopy(BASE_DATA));
    add("T1. Identical CVs → no changes", diff.changes.length === 0 && !diff.hasChanges && diff.status === "resolved", diff);
  }

  // ── TEST 2: New experience → FACT_ADDITION ────────────────────────────────
  {
    const curr = deepCopy(BASE_DATA);
    curr.erfarenhet.push({ roll: "Arkitekt", foretag: "NewCorp", period: "2024–Nu", beskrivning: "Systemarkitektur." });
    const diff = diffCvData(deepCopy(BASE_DATA), curr);
    const added = diff.changes.filter((c) => c.category === "erfarenhet" && c.changeType === "FACT_ADDITION");
    add("T2. New experience → FACT_ADDITION", added.length === 1 && added[0].current.roll === "Arkitekt", { added: added.map((c) => c.key) });
  }

  // ── TEST 3: Experience text rewritten → CONTENT_REWRITE, not new fact ─────
  {
    const prev = deepCopy(BASE_DATA);
    const curr = deepCopy(BASE_DATA);
    // Same role+company key, different wording with high overlap
    curr.erfarenhet[0].beskrivning = "Byggde och underhöll moderna webbgränssnitt med React och komponentbaserad arkitektur.";
    const diff = diffCvData(prev, curr);
    const rewrites = diff.changes.filter((c) => c.category === "erfarenhet" && c.changeType === "CONTENT_REWRITE");
    const additions = diff.changes.filter((c) => c.category === "erfarenhet" && c.changeType === "FACT_ADDITION" && c.key === "frontend-utvecklare|techcorp");
    add("T3. Experience text rewritten → CONTENT_REWRITE, not FACT_ADDITION", rewrites.length >= 1 && additions.length === 0, { rewrites: rewrites.map((c) => c.key), additions });
  }

  // ── TEST 4: New skill → FACT_ADDITION ────────────────────────────────────
  {
    const curr = deepCopy(BASE_DATA);
    curr.fardigheter.push({ namn: "GraphQL", niva: 60 });
    const diff = diffCvData(deepCopy(BASE_DATA), curr);
    const added = diff.changes.filter((c) => c.category === "fardigheter" && c.changeType === "FACT_ADDITION");
    add("T4. New skill → FACT_ADDITION", added.length === 1 && added[0].key === "graphql", { added: added.map((c) => c.key) });
  }

  // ── TEST 5: Removed skill → REMOVAL ──────────────────────────────────────
  {
    const curr = deepCopy(BASE_DATA);
    curr.fardigheter = curr.fardigheter.filter((f) => f.namn !== "CSS");
    const diff = diffCvData(deepCopy(BASE_DATA), curr);
    const removed = diff.changes.filter((c) => c.category === "fardigheter" && c.changeType === "REMOVAL");
    add("T5. Removed skill → REMOVAL", removed.length === 1 && removed[0].key === "css", { removed: removed.map((c) => c.key) });
  }

  // ── TEST 6: New education → FACT_ADDITION ────────────────────────────────
  {
    const curr = deepCopy(BASE_DATA);
    curr.utbildning.push({ examen: "MBA", skola: "Handelshögskolan", period: "2022–2024", beskrivning: "" });
    const diff = diffCvData(deepCopy(BASE_DATA), curr);
    const added = diff.changes.filter((c) => c.category === "utbildning" && c.changeType === "FACT_ADDITION");
    add("T6. New education → FACT_ADDITION", added.length === 1 && added[0].key.includes("mba"), { added: added.map((c) => c.key) });
  }

  // ── TEST 7: Template/layout change only → formatting only, no professional change ──
  {
    // Simulate: only presentation fields changed; data is identical
    const prevRecord = { id: "r1", templateId: "stockholm", layout: { main: ["profil"], sidebar: ["fardigheter"] }, data: deepCopy(BASE_DATA) };
    const currRecord = { id: "r1", templateId: "nordic", layout: { main: ["erfarenhet"], sidebar: [] }, data: deepCopy(BASE_DATA) };
    const diff = diffMasterToMaster(prevRecord, currRecord);
    add("T7. Template/layout change only → no professional change", !diff.hasProfessionalChange && diff.changes.length === 0, diff);
  }

  // ── TEST 8: Same info reordered → no new professional evidence ────────────
  {
    const prev = deepCopy(BASE_DATA);
    const curr = deepCopy(BASE_DATA);
    // Reorder skills (same items, different order)
    curr.fardigheter = [curr.fardigheter[2], curr.fardigheter[0], curr.fardigheter[1]];
    const diff = diffCvData(prev, curr);
    add("T8. Same skills reordered → no new professional evidence", !diff.hasProfessionalChange && diff.changes.length === 0, diff);
  }

  // ── TEST 9: Master → new Master diff ─────────────────────────────────────
  {
    const prevRecord = { id: "m1", data: deepCopy(BASE_DATA) };
    const currData = deepCopy(BASE_DATA);
    currData.erfarenhet.push({ roll: "Tech Lead", foretag: "TechCorp", period: "2024–Nu", beskrivning: "Ledde ett team." });
    const currRecord = { id: "m2", data: currData };
    const diff = diffMasterToMaster(prevRecord, currRecord);
    const added = diff.changes.filter((c) => c.changeType === "FACT_ADDITION" && c.category === "erfarenhet");
    add("T9. Master→Master: new experience detected", added.length === 1 && added[0].key.includes("tech lead"), { added: added.map((c) => c.key) });
  }

  // ── TEST 10: Tailored → source Master → only actual differences reported ──
  {
    const masterData = deepCopy(BASE_DATA);
    const tailoredData = deepCopy(BASE_DATA);
    // Tailored adds a new skill that was not in master
    tailoredData.fardigheter.push({ namn: "Docker", niva: 55 });
    const masterRecord = { id: "m1", data: masterData };
    const tailoredRecord = { id: "t1", sourceMasterCvId: "m1", data: tailoredData };
    const diff = diffTailoredToSourceMaster(tailoredRecord, masterRecord);
    const added = diff.changes.filter((c) => c.category === "fardigheter" && c.changeType === "FACT_ADDITION");
    add("T10. Tailored→Master: only actual differences reported", added.length === 1 && added[0].key === "docker", { added: added.map((c) => c.key) });
  }

  // ── TEST 11: Tailored with same facts but different wording → no automatic new fact ──
  {
    const masterData = deepCopy(BASE_DATA);
    const tailoredData = deepCopy(BASE_DATA);
    // Same erfarenhet entry, just rewritten with high word overlap
    tailoredData.erfarenhet[0].beskrivning = "Byggde och levererade moderna webbgränssnitt med React och komponentdriven arkitektur.";
    const masterRecord = { id: "m1", data: masterData };
    const tailoredRecord = { id: "t1", sourceMasterCvId: "m1", data: tailoredData };
    const diff = diffTailoredToSourceMaster(tailoredRecord, masterRecord);
    const factAdditions = diff.changes.filter((c) => c.changeType === "FACT_ADDITION" && c.key === "frontend-utvecklare|techcorp");
    add("T11. Tailored same-fact rewrite → CONTENT_REWRITE, not FACT_ADDITION", factAdditions.length === 0, { changes: diff.changes.map((c) => `${c.key}:${c.changeType}`) });
  }

  // ── TEST 12: Missing sourceMasterCvId → explicit unresolved state ─────────
  {
    const tailoredRecord = { id: "t1", data: deepCopy(BASE_DATA) }; // no sourceMasterCvId, no parentCvId
    const diff = diffTailoredToSourceMaster(tailoredRecord, null);
    add("T12. Missing sourceMasterCvId → unresolved, no guessed relationship", diff.status === "unresolved" && diff.unresolvedReason === "MISSING_SOURCE_MASTER_CV_ID", diff);
  }

  // ── TEST 12b: sourceMasterCvId present but record not resolved ────────────
  {
    const tailoredRecord = { id: "t2", sourceMasterCvId: "m1", data: deepCopy(BASE_DATA) };
    const diff = diffTailoredToSourceMaster(tailoredRecord, null); // record not found
    add("T12b. sourceMasterCvId present but unresolvable → unresolved", diff.status === "unresolved" && diff.unresolvedReason === "SOURCE_MASTER_NOT_RESOLVED", diff);
  }

  // ── TEST 13: Duplicate evidence → deterministic deduplication ────────────
  {
    const currData = deepCopy(BASE_DATA);
    currData.fardigheter.push({ namn: "Docker", niva: 55 });
    const diffResult = diffCvData(deepCopy(BASE_DATA), currData);
    const source = { cvId: "m1", sourceType: "master", data: currData };
    const items1 = extractEvidence(diffResult, source);
    const items2 = extractEvidence(diffResult, source); // same items, same source
    const merged = mergeEvidence(items1, items2);
    add("T13. Duplicate evidence → deduplication keeps only one copy", merged.length === items1.length, { original: items1.length, merged: merged.length });
  }

  // ── TEST 14: Two different users → cvDiff is pure; isolation is enforced at service layer ──
  {
    // cvDiff is a pure function with no user context. Security isolation is the
    // responsibility of the caller / Base44 entity access layer.
    // We verify here that the diff output does NOT contain any user-identifying information
    // that could leak between users.
    const diff = diffCvData(deepCopy(BASE_DATA), deepCopy(BASE_DATA));
    const diffStr = JSON.stringify(diff);
    const containsEmail = diffStr.includes("ahmed@example.com");
    const containsName = diffStr.includes("Ahmed");
    add("T14. Pure diff output contains no user-identifying contact info (PII isolation)", !containsEmail && !containsName, { containsEmail, containsName });
  }

  // ── TEST 15: Skill niva-only change → no professional change ─────────────
  // Skill proficiency level (niva) is a presentation choice, not a new professional fact.
  {
    const prev = deepCopy(BASE_DATA);
    const curr = deepCopy(BASE_DATA);
    curr.fardigheter[0].niva = 95; // React level changed 85→95
    const diff = diffCvData(prev, curr);
    add("T15. Skill niva-only change → no professional change (niva is excluded from content)", !diff.hasProfessionalChange, { changes: diff.changes.map((c) => `${c.key}:${c.changeType}`) });
  }

  // ── TEST 16: cvContentFingerprint stable for same data ───────────────────
  {
    const fp1 = cvContentFingerprint(deepCopy(BASE_DATA));
    const fp2 = cvContentFingerprint(deepCopy(BASE_DATA));
    add("T16. cvContentFingerprint is stable for identical data", fp1 === fp2, { fp1, fp2 });
  }

  // ── TEST 17: cvContentFingerprint changes when content changes ───────────
  {
    const curr = deepCopy(BASE_DATA);
    curr.erfarenhet.push({ roll: "NewRole", foretag: "NewCo", period: "2025–Nu", beskrivning: "" });
    const fp1 = cvContentFingerprint(deepCopy(BASE_DATA));
    const fp2 = cvContentFingerprint(curr);
    add("T17. cvContentFingerprint changes when content changes", fp1 !== fp2, { fp1, fp2 });
  }

  // ── TEST 18: diffMasterToMaster — same id → no changes ───────────────────
  {
    const record = { id: "m1", data: deepCopy(BASE_DATA) };
    const diff = diffMasterToMaster(record, record);
    add("T18. diffMasterToMaster same id → no changes", !diff.hasChanges, diff);
  }

  // ── TEST 19: diffMasterToMaster — missing records → unresolved ───────────
  {
    const diff = diffMasterToMaster(null, { id: "m2", data: deepCopy(BASE_DATA) });
    add("T19. diffMasterToMaster missing previousRecord → unresolved", diff.status === "unresolved" && diff.unresolvedReason === "MISSING_RECORD", diff);
  }

  // ── TEST 20: new_version save removes referencesDold flag but content same → no professional change ──
  {
    const prev = deepCopy(BASE_DATA);
    const curr = deepCopy(BASE_DATA);
    curr.referencesDold = true; // presentation flag changed
    // diffCvData operates on data, which includes referencesDold;
    // but referencesDold is not a content field tracked by the diff (no diffScalar for it).
    const diff = diffCvData(prev, curr);
    add("T20. referencesDold toggle → no professional change", !diff.hasProfessionalChange, { changes: diff.changes.map((c) => c.field) });
  }

  const passed = results.filter((r) => r.pass).length;
  return { passed, total: results.length, allPassed: passed === results.length, results };
}

export default runCvDiffTests;
