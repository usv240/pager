export interface LogEntry {
  level: "error";
  message: string;
  fields: Record<string, unknown>;
}

export class Logger {
  readonly entries: LogEntry[] = [];

  error(message: string, fields: Record<string, unknown>): void {
    this.entries.push({ level: "error", message, fields });
  }
}
