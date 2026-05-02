const htmlEntities: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => htmlEntities[character] ?? character);
}

export function classNames(...values: Array<string | false | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function percentage(value: number): number {
  return Math.min(Math.max(Math.round(value), 0), 100);
}
