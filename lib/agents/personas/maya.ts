import type { AuthoredStakeholderMessage, AgentGamePhase } from "../types";

export const mayaMessages: Record<AgentGamePhase, AuthoredStakeholderMessage> = {
  start: {
    id: "maya-start",
    role: "pm",
    author: "Maya · PM",
    body: "Support has three customer reports and is holding replies. Give me an initial assessment and ETA within ten minutes.",
    timestamp: "2:00 PM",
  },
  mid: {
    id: "maya-mid",
    role: "pm",
    author: "Maya · PM",
    body: "We need the next support update now. Is customer impact contained, and what is your current ETA to a verified checkout recovery?",
    timestamp: "2:07 PM",
  },
  "after-wrong-fix": {
    id: "maya-after-wrong-fix",
    role: "pm",
    author: "Maya · PM",
    body: "The customer-facing error changed, but finance still sees duplicate charge records. Does that change your ETA, and what are you verifying next?",
    timestamp: "2:12 PM",
  },
  "after-tests-fail": {
    id: "maya-after-tests-fail",
    role: "pm",
    author: "Maya · PM",
    body: "Verification is still red, so I cannot call this contained. Tell me what the failed check disproved and give me the next ETA.",
    timestamp: "2:14 PM",
  },
};
