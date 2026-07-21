export function splitName(filename: string): { name: string; ext: string } {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return { name: filename, ext: "" };
  return { name: filename.slice(0, dot), ext: filename.slice(dot) };
}

export function applyTemplate(
  template: string,
  ctx: { name: string; ext: string; index: number; prefix: string },
): string {
  return template
    .replace(/\{index:(\d+)\}/g, (_, width: string) =>
      String(ctx.index).padStart(Number(width), "0"),
    )
    .replace(/\{index\}/g, String(ctx.index))
    .replace(/\{name\}/g, ctx.name)
    .replace(/\{ext\}/g, ctx.ext)
    .replace(/\{prefix\}/g, ctx.prefix);
}
