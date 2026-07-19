export interface LogEntry {
  level: "info" | "error";
  message: string;
  fields: Record<string, unknown>;
}

export class Logger {
  readonly entries: LogEntry[] = [];

  error(message: string, fields: Record<string, unknown>): void {
    this.entries.push({ level: "error", message, fields });
  }

  info(message: string, fields: Record<string, unknown> = {}): void {
    this.entries.push({ level: "info", message, fields });
  }

  clear(): void {
    this.entries.length = 0;
  }
}
