export function sanitizeShikimoriText(
  value: string | null | undefined,
): string {
  if (!value) return "";
  return value
    .replace(
      /\[(?:character|anime|manga)=\d+\]([\s\S]*?)\[\/(?:character|anime|manga)\]/gi,
      "$1",
    )
    .replace(/\[url=[^\]]+\]([\s\S]*?)\[\/url\]/gi, "$1")
    .replace(
      /\[(?:b|i|u|s|spoiler|quote)(?:=[^\]]+)?\]([\s\S]*?)\[\/(?:b|i|u|s|spoiler|quote)\]/gi,
      "$1",
    )
    .replace(/\[[^\]]+\]/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
