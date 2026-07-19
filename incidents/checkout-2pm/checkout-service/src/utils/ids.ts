let sequence = 0;

export function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}_${sequence}`;
}

export function resetIds(): void {
  sequence = 0;
}
