/** Recherche 100 % locale : les mots tapés ne quittent pas le navigateur. */

export function normalizeOfficialSearch(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function editDistance(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const old = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = old;
    }
  }
  return prev[b.length];
}

export function searchOfficialSites(sites, query = "", country = "all") {
  const candidates = sites.filter(
    (site) => country === "all" || site.country === country,
  );
  const normalized = normalizeOfficialSearch(query);
  if (!normalized) return { sites: candidates, suggestion: null };
  const terms = normalized.split(" ");
  const found = candidates.filter((site) => {
    const text = normalizeOfficialSearch(
      [site.name, site.url, site.category, ...site.keywords].join(" "),
    );
    return terms.every((term) => text.includes(term));
  });
  if (found.length || normalized.length < 4 || normalized.length > 35) {
    return { sites: found, suggestion: null };
  }
  let best = null;
  let bestDistance = Infinity;
  for (const site of candidates) {
    for (const option of [site.name, ...site.keywords]) {
      const word = normalizeOfficialSearch(option);
      if (!word || Math.abs(word.length - normalized.length) > 2) continue;
      const distance = editDistance(normalized, word);
      if (distance < bestDistance) {
        best = { query: word, siteId: site.id };
        bestDistance = distance;
      }
    }
  }
  // N'affiche une correction que si elle est proche, pour éviter de suggérer
  // à tort un service non lié.
  return { sites: found, suggestion: bestDistance <= 2 ? best : null };
}
