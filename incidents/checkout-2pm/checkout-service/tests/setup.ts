import { afterEach } from "vitest";
import { resetGatewayLedger } from "../src/gateway/clearwater-payments.js";
import { resetIds } from "../src/utils/ids.js";

afterEach(() => {
  resetGatewayLedger();
  resetIds();
});
