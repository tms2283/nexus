export function assertNever(value: never, message = 'Unexpected value'): never {
  throw new Error(`${message}: ${String(value)}`);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createId(prefix: string): string {
  // Good enough for local-only personal use; replace with UUID later if desired.
  const rand = Math.random().toString(16).slice(2);
  return `${prefix}_${Date.now().toString(16)}_${rand}`;
}
