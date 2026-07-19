import type { AuthoredStakeholderMessage, AgentGamePhase } from "../types";

export const jonMessages: Record<AgentGamePhase, AuthoredStakeholderMessage> = {
  start: {
    id: "jon-start",
    role: "senior",
    author: "Jon · Senior Eng",
    body: "The log labels this a gateway failure. Which operation had already succeeded before that error was created?",
    timestamp: "2:01 PM",
  },
  mid: {
    id: "jon-mid",
    role: "senior",
    author: "Jon · Senior Eng",
    body: "What does each request observe if two calls enter `processCheckout` before either charge promise resolves?",
    timestamp: "2:08 PM",
  },
  "after-wrong-fix": {
    id: "jon-after-wrong-fix",
    role: "senior",
    author: "Jon · Senior Eng",
    body: "The 502 is gone. What invariant does the ledger assertion enforce that response handling does not?",
    timestamp: "2:12 PM",
  },
  "after-tests-fail": {
    id: "jon-after-tests-fail",
    role: "senior",
    author: "Jon · Senior Eng",
    body: "Compare the settled results with the ledger count. Which side effect occurs before the strict transition rejects the second caller?",
    timestamp: "2:15 PM",
  },
};
