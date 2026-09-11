export function formatMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const rest = abs % 100;
  const body = dollars.toLocaleString("en-US");
  if (rest === 0) return `${sign}$${body}`;
  return `${sign}$${body}.${rest.toString().padStart(2, "0")}`;
}

export function formatCompact(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents) / 100;
  if (abs >= 1_000_000) {
    const n = abs / 1_000_000;
    return `${sign}$${n.toFixed(n >= 10 ? 0 : 1)}M`;
  }
  if (abs >= 10_000) return `${sign}$${Math.round(abs / 1000)}k`;
  if (abs >= 1000) {
    const n = abs / 1000;
    return `${sign}$${n.toFixed(1)}k`;
  }
  return formatMoney(cents);
}

export function parseMoney(input: string): number | null {
  const trimmed = input.trim().replace(/[$,\s]/g, "");
  if (!trimmed || trimmed === "-" || trimmed === ".") return null;
  const neg = trimmed.startsWith("(") && trimmed.endsWith(")");
  const raw = (neg ? trimmed.slice(1, -1) : trimmed).replace(/^\(/, "");
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const cents = Math.round(n * 100);
  return neg || trimmed.startsWith("-") ? -Math.abs(cents) : cents;
}

export function formatPct(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export function bathsLabel(tenths: number): string {
  if (tenths % 10 === 0) return String(tenths / 10);
  return (tenths / 10).toFixed(1);
}

export function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}
