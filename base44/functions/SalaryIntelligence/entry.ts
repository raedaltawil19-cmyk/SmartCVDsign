import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

const SCB_TABLE = 'TAB5932';
const SCB_BASE = `https://statistikdatabasen.scb.se/api/v2/tables/${SCB_TABLE}/data`;

function yearsBetween(start, end) {
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  if (Number.isNaN(s.getTime())) return 0;
  return Math.max(0, (e.getTime() - s.getTime()) / (365.25 * 86400000));
}

function experienceYears(experience = []) {
  return experience.reduce((sum, item) => sum + yearsBetween(item?.start || item?.fran || item?.from || '', item?.end || item?.till || item?.to || null), 0);
}

async function classifyWithLLM(client, jobTitle, experience) {
  const prompt = `Classify a Swedish job title to the closest SSYK 2012 occupation and estimate relevant experience.
Target job: ${jobTitle}
Candidate experience JSON: ${JSON.stringify(experience)}
Return JSON only with: ssyk (4 digit string), occupationLabel, relevantExperienceYears (number), confidence (high|medium|low).
Rules: choose the closest occupation based on duties/title, not a random keyword. Count experience only where the role is materially related to the target occupation. Never invent dates.`;
  return client.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        ssyk: { type: 'string' },
        occupationLabel: { type: 'string' },
        relevantExperienceYears: { type: 'number' },
        confidence: { type: 'string' }
      },
      required: ['ssyk', 'occupationLabel', 'relevantExperienceYears', 'confidence']
    }
  });
}

async function scbSalary(ssyk) {
  const params = new URLSearchParams();
  params.set('lang', 'sv');
  params.set('valueCodes[Sektor]', '0');
  params.set('valueCodes[Yrke2012]', ssyk);
  params.set('valueCodes[Kon]', '1');
  params.set('valueCodes[ContentsCode]', '000007CF,000007CG,000007CE,000007CH,000007CI');
  params.set('valueCodes[Tid]', '2025');
  params.set('outputFormat', 'csv');
  const res = await fetch(`${SCB_BASE}?${params.toString()}`, { headers: { Accept: 'text/csv' } });
  if (!res.ok) throw new Error(`SCB HTTP ${res.status}`);
  const csv = await res.text();
  const lines = csv.trim().split(/\r?\n/).slice(1);
  const values = lines.flatMap((line) => {
    const cols = line.split(',').slice(3).map((v) => Number(String(v).replace(/\"/g, '')));
    return cols.filter((v) => Number.isFinite(v));
  });
  if (values.length < 5) throw new Error('SCB salary data unavailable');
  return { p10: values[0], p25: values[1], median: values[2], p75: values[3], p90: values[4], year: 2025, source: 'SCB/Medlingsinstitutet' };
}

function personalBand(salary, years) {
  const y = Math.max(0, Number(years) || 0);
  if (y < 2) return { min: salary.p10, max: salary.p50 || salary.median, level: 'early' };
  if (y < 5) return { min: salary.p25, max: salary.p75, level: 'experienced' };
  if (y < 8) return { min: salary.median, max: salary.p75, level: 'senior' };
  return { min: salary.p75, max: salary.p90, level: 'high_experience' };
}

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const jobTitle = String(body?.jobTitle || '').trim();
    const experience = Array.isArray(body?.experience) ? body.experience : [];
    if (!jobTitle) return Response.json({ error: 'JOB_TITLE_REQUIRED' }, { status: 400 });

    const client = createClientFromRequest(req);
    const classification = await classifyWithLLM(client, jobTitle, experience);
    if (!/^\d{4}$/.test(String(classification?.ssyk || ''))) return Response.json({ error: 'SSYK_NOT_FOUND' }, { status: 422 });

    const totalYears = experienceYears(experience);
    const relevantYears = Math.max(0, Number(classification.relevantExperienceYears) || 0);
    let salary;
    try {
      salary = await scbSalary(classification.ssyk);
    } catch (_) {
      return Response.json({ error: 'SALARY_SOURCE_UNAVAILABLE', source: 'SCB', ssyk: classification.ssyk }, { status: 503 });
    }

    const band = personalBand(salary, relevantYears);
    return Response.json({
      jobTitle,
      occupation: classification.occupationLabel,
      ssyk: classification.ssyk,
      confidence: classification.confidence,
      experienceYears: Number(relevantYears.toFixed(1)),
      totalExperienceYears: Number(totalYears.toFixed(1)),
      salary: { min: Math.round(band.min), max: Math.round(band.max), currency: 'SEK', monthly: true, experienceLevel: band.level },
      market: salary,
      sources: [{ name: 'SCB / Medlingsinstitutet', table: SCB_TABLE, year: salary.year }]
    });
  } catch (error) {
    return Response.json({ error: error?.message || 'SALARY_INTELLIGENCE_ERROR' }, { status: 500 });
  }
}
