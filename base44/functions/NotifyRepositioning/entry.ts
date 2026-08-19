import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

// يُستدعى من الـworkflow عندما تصبح نتيجة إعادة التموضع جاهزة ومفيدة.
// يرسل بريداً واحداً فقط لصاحب النتيجة، ولا يمسّ السيرة ولا أي مسار آخر.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const analysisId = body && body.analysis_id ? String(body.analysis_id) : "";
    if (!analysisId) return Response.json({ error: "analysis_id is required" }, { status: 400 });

    const analysis = await base44.asServiceRole.entities.RepositioningAnalysis.get(analysisId);
    if (!analysis) return Response.json({ ok: false, reason: "not_found" });
    if (analysis.status !== "ready") return Response.json({ ok: false, reason: "not_ready" });
    if (analysis.notifiedAt) return Response.json({ ok: false, reason: "already_notified" });

    const owners = await base44.asServiceRole.entities.User.filter({ id: analysis.created_by_id });
    const owner = owners && owners.length ? owners[0] : null;
    if (!owner || !owner.email) return Response.json({ ok: false, reason: "no_recipient" });

    const paths = Number(analysis.pathCount) || 0;
    const jobs = Number(analysis.jobCount) || 0;
    const link = `${req.headers.get("origin") || ""}/career-paths`;
    const body_text = [
      `مرحباً ${owner.full_name || ""},`.trim(),
      "",
      `بناءً على سيرتك المعتمدة، وجدنا ${paths} مساراً مهنياً جديداً و${jobs} فرصة وظيفية حقيقية تناسب قدراتك.`,
      "",
      link ? `اطّلع على التفاصيل هنا: ${link}` : "افتح صفحة المسارات المهنية في التطبيق لعرض التفاصيل.",
      "",
      "لم نُجرِ أي تعديل على سيرتك."
    ].join("\n");

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: owner.email,
      subject: "مسارات وفرص مهنية جديدة بناءً على سيرتك",
      body: body_text
    });

    await base44.asServiceRole.entities.RepositioningAnalysis.update(analysisId, { notifiedAt: new Date().toISOString() });
    return Response.json({ ok: true, to: owner.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}