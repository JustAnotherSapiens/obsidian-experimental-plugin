
export default function getYouTubeChannelIDsAndHandles(text: string): {
  ids: string[] | undefined;
  handles: string[] | undefined;
} | undefined {
  const channelIdRegex = /(?:^|[^\w-])youtube\.com\/channel\/([\w-~]+)/g;

  // Handles overview: https://support.google.com/youtube/answer/11585688
  // Handle requirements: 3–30 chars, no separator at start/end, only _-.· as separators
  // Uses Unicode property escapes (ES2018+)
  // https://unicode.org/reports/tr18/#General_Category_Property
  // L (Letter), Nd (Decimal Digit Number)
  const handleRegex = /(?:^|[^\w-])youtube\.com\/(@[\p{L}\p{Nd}][\p{L}\p{Nd}.·_-]{1,28}[\p{L}\p{Nd}])/gu;


  const channelIds: string[] = [];
  for (const match of text.matchAll(channelIdRegex)) {
    channelIds.push(match[1]);
  }

  const channelHandles: string[] = [];
  for (const match of text.matchAll(handleRegex)) {
    channelHandles.push(match[1]);
  }

  if (channelIds.length === 0 && channelHandles.length === 0) return;

  return {
    ids: channelIds.length > 0 ? channelIds : undefined,
    handles: channelHandles.length > 0 ? channelHandles : undefined,
  };
}
