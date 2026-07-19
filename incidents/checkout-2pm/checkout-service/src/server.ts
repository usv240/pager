import { createApp } from "./app.js";
import { config } from "./config.js";

const { app, context } = createApp();

const server = app.listen(config.port, () => {
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : config.port;
  context.logger.info("checkout service listening", {
    service: config.serviceName,
    port,
  });
});

function closeServer(signal: string): void {
  context.logger.info("checkout service stopping", { signal });
  server.close(() => {
    process.exitCode = 0;
  });
}

process.once("SIGINT", () => closeServer("SIGINT"));
process.once("SIGTERM", () => closeServer("SIGTERM"));
