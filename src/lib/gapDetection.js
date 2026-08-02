import { differenceInMonths } from "date-fns";

const MONTHS = {
  januari: 0, jan: 0, january: 0,
  februari: 1, feb: 1, february: 1,
  mars: 2, mar: 2, march: 2,
  april: 3, apr: 3,
  maj: 4, may: 4,
  juni: 5, jun: 5, june: 5,
  juli: 6, jul: 6, july: 6,
  augusti: 7, aug: 7, august: 7,
  september: 8, sep: 8,
  oktober: 9, okt: 9, oct: 9, october: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

const MONTH_SHORT_SV = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function parseToken(tok, isEnd) {
  if (!tok) return null;
  const t = tok.trim().toLowerCase();
  if (/^(nu|pågående|fortfarande|idag|present|current|ongoing|now)$/.test(t)) return new Date();

  let month = null;
  for (const key of Object.keys(MONTHS)) {
    if (t.includes(key)) { month = MONTHS[key]; break; }
  }
  // numeric month like "2020-03" or "03/2020"
  if (month == null) {
    const m2 = t.match(/(\d{1,2})[\/\-\.](\d{4})/);
    if (m2) month = parseInt(m2[1], 10) - 1;
    else {
      const m3 = t.match(/(\d{4})[\/\-\.](\d{1,2})/);
      if (m3) month = parseInt(m3[2], 10) - 1;
    }
  }
  const yearMatch = t.match(/\b(19|20)\d{2}\b/);
  if (!yearMatch) return null;
  const year = parseInt(yearMatch[0], 10);
  const m = month ?? (isEnd ? 11 : 0); // year-only: end→Dec, start→Jan (conservative)
  return new Date(year, m, 1);
}

export function parsePeriod(period) {
  if (!period || typeof period !== "string") return { start: null, end: null };
  const parts = period
    .split(/\u2013|\u2014|–|—|\s-\s|\s–\s|\still\s|\sto\s/i)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 1) {
    const p = parseToken(parts[0], false);
    return { start: p, end: p };
  }
  return { start: parseToken(parts[0], false), end: parseToken(parts[1], true) };
}

export function detectGaps(erfarenhet) {
  const list = [];
  (erfarenhet || []).forEach((e, i) => {
    const { start, end } = parsePeriod(e.period);
    if (start && end) list.push({ index: i, entry: e, start, end });
  });
  list.sort((a, b) => a.start - b.start);
  const gaps = [];
  for (let i = 0; i < list.length - 1; i++) {
    const cur = list[i];
    const nxt = list[i + 1];
    const months = differenceInMonths(nxt.start, cur.end);
    if (months >= 2) {
      gaps.push({
        after: cur.entry,
        afterIndex: cur.index,
        before: nxt.entry,
        beforeIndex: nxt.index,
        start: cur.end,
        end: nxt.start,
        months,
      });
    }
  }
  return gaps;
}

export function formatMonths(months) {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [];
  if (y >= 1) parts.push(`${y} ${y === 1 ? "سنة" : y === 2 ? "سنتان" : "سنوات"}`);
  if (m >= 1) parts.push(`${m} شهر`);
  return parts.join(" و") || "أقل من شهر";
}

export function formatGapDate(date) {
  if (!date) return "";
  return `${MONTH_SHORT_SV[date.getMonth()]} ${date.getFullYear()}`;
}