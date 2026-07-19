import type { Credential, SessionLog } from "./types";

export function mintCredential(session: SessionLog): Credential {
  return {
    id: `pager-${session.incidentId}`,
    title: "Pager: Incident Responder",
    summary: "Verified a production checkout fix and rejected an incorrect AI recommendation.",
    issuedAt: new Date().toLocaleDateString(),
  };
}
