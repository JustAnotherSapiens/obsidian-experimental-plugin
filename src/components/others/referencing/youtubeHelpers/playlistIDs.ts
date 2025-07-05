
export default function getYouTubePlaylistIDs(text: string): string[] | undefined {
  const regex = /(?:^|[^\w-])youtube\.com\/(?:watch|playlist|embed\/videoseries)[^\s]*?[?&]list=([\w-~]+)/g;

  const ids: string[] = [];
  for (const match of text.matchAll(regex)) {
    ids.push(match[1]);
  }

  if (ids.length === 0) {
    console.debug(`No YouTube playlist IDs found in: ${text}`);
    return;
  }

  return ids;
}
