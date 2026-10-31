// de-duplicate articles and merge
// ordering is done via the rankArticles.js file

function normalizeTitle(title) {
  return (title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function mergeArticles(newsApiArticles = [], gdeltArticles = []) {
  const tagged = [
    ...newsApiArticles.map((a) => ({
      ...a,
      _provider: a._provider || "newsapi",
    })),
    ...gdeltArticles,
  ];

  const seenUrls = new Map(); // url -> index into deduped
  const seenTitles = new Map(); // normalized title -> index into deduped
  const deduped = [];

  for (const article of tagged) {
    const url = article.url || "";
    if (!url) continue;
    const titleKey = normalizeTitle(article.title);

    const existingIndex = seenUrls.has(url)
      ? seenUrls.get(url)
      : titleKey && seenTitles.has(titleKey)
        ? seenTitles.get(titleKey)
        : undefined;

    if (existingIndex !== undefined) {
      deduped[existingIndex]._duplicateCount =
        (deduped[existingIndex]._duplicateCount || 1) + 1;
      continue;
    }

    const index = deduped.length;
    deduped.push({ ...article, _duplicateCount: 1 });
    seenUrls.set(url, index);
    if (titleKey) seenTitles.set(titleKey, index);
  }

  return deduped;
}
