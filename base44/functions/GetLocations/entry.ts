// Returns Swedish counties (län) and municipalities (kommuner) with their
// JobTech Taxonomy concept ids, so the frontend can build location filters
// and the SearchJobs function can pass them as `region` / `municipality` params.
// Municipalities carry a `lanCode` (first 2 digits of the LAU-2 code) so the UI
// can narrow the municipality list to the selected counties.

const LAN_BY_LABEL = {
  "Stockholms län": "01",
  "Uppsala län": "03",
  "Södermanlands län": "04",
  "Östergötlands län": "05",
  "Jönköpings län": "06",
  "Kronobergs län": "07",
  "Kalmar län": "08",
  "Gotlands län": "09",
  "Blekinge län": "10",
  "Skåne län": "12",
  "Hallands län": "13",
  "Västra Götalands län": "14",
  "Värmlands län": "17",
  "Örebro län": "18",
  "Västmanlands län": "19",
  "Dalarnas län": "20",
  "Gävleborgs län": "21",
  "Västernorrlands län": "22",
  "Jämtlands län": "23",
  "Västerbottens län": "24",
  "Norrbottens län": "25",
};

export default async function () {
  try {
    const [rRes, mRes] = await Promise.all([
      fetch("https://taxonomy.api.jobtechdev.se/v1/taxonomy/specific/concepts/region?limit=5000", {
        headers: { Accept: "application/json" },
      }),
      fetch("https://taxonomy.api.jobtechdev.se/v1/taxonomy/specific/concepts/municipality?limit=5000", {
        headers: { Accept: "application/json" },
      }),
    ]);
    if (!rRes.ok || !mRes.ok) return Response.json({ error: "Taxonomy HTTP error" }, { status: 502 });
    const regionsRaw = await rRes.json();
    const muniRaw = await mRes.json();

    const regions = (Array.isArray(regionsRaw) ? regionsRaw : [])
      .filter((x) => /län$/.test(x["taxonomy/preferred-label"] || ""))
      .map((x) => ({
        id: x["taxonomy/id"],
        label: x["taxonomy/preferred-label"],
        lanCode: LAN_BY_LABEL[x["taxonomy/preferred-label"]] || null,
      }))
      .filter((x) => x.lanCode)
      .sort((a, b) => a.label.localeCompare(b.label, "sv"));

    const municipalities = (Array.isArray(muniRaw) ? muniRaw : [])
      .filter((x) => x["taxonomy/lau-2-code-2015"])
      .map((x) => ({
        id: x["taxonomy/id"],
        label: x["taxonomy/preferred-label"],
        lanCode: (x["taxonomy/lau-2-code-2015"] || "").slice(0, 2),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "sv"));

    return Response.json({ regions, municipalities });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}