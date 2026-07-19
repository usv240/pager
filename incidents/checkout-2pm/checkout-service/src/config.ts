import { ValidationError } from "./domain/errors.js";

export interface ServiceConfig {
  port: number;
  serviceName: string;
  defaultTaxJurisdiction: string;
}

function readPort(value: string | undefined): number {
  if (!value) return 3000;
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 0 || port > 65_535) {
    throw new ValidationError("PORT must be an integer from 0 through 65535.");
  }
  return port;
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): ServiceConfig {
  return {
    port: readPort(environment.PORT),
    serviceName: environment.SERVICE_NAME?.trim() || "checkout-service",
    defaultTaxJurisdiction: environment.DEFAULT_TAX_JURISDICTION?.trim().toUpperCase() || "IL",
  };
}

export const config = loadConfig();
