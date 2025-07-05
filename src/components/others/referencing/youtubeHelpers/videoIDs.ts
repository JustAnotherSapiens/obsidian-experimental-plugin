
export default function getYouTubeVideoIDs(text: string): string[] | undefined {
  // Matching only unreserved URI characters for the ID; excluding the dot '.'
  // due to some reference formats (e.g. MlA) appending a dot after the URL.
  // Also ensuring no domain characters behind the YouTube domain. (no fake URLs)
  const regex = /(?:^|[^\w-])(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-~]+)/g;

  const ids: string[] = [];
  for (const match of text.matchAll(regex)) {
    const id = match[1];
    ids.push(id);
    // Current Norm ID (2025-07-02)
    if (!/^[\w-]{11}$/.test(id)) {
      console.debug(`Unexpected ID Structure: '${id}' (${id.length} chars)`);
    }
  }

  if (ids.length === 0) {
    console.debug(`No YouTube video IDs found in: ${text}`);
    return;
  }

  return ids;
}

// Unreserved URI Characters specified at RFC 3986, page 13:
// https://datatracker.ietf.org/doc/html/rfc3986#page-13

// Domain Name specificiations at RFC 952, page 1:
// https://datatracker.ietf.org/doc/html/rfc952
