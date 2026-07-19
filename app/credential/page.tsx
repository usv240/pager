"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadCredentialSession, type CredentialSession } from "@/engine/credential-session";

export default function CredentialPage() {
  const [session, setSession] = useState<CredentialSession | null>();

  useEffect(() => setSession(loadCredentialSession()), []);

  if (session === undefined) return <main className="shell"><p>Loading verified credential…</p></main>;
  if (!session) return <main className="shell"><h1>No verified credential yet.</h1><p>Complete an incident and pass its execution suite to mint one.</p><Link href="/">Return to Pager</Link></main>;

  return <main className="shell credential-page">
    <span>EXECUTION-VERIFIED</span>
    <h1>{session.credential.title}</h1>
    <p>{session.credential.summary}</p>
    <dl>
      <div><dt>Mission</dt><dd>{session.incidentTitle}</dd></div>
      <div><dt>Verification</dt><dd>{session.testResult.summary}</dd></div>
      <div><dt>AI oversight</dt><dd>{session.caughtIncorrectAiFix ? "Rejected an incorrect AI recommendation" : "Not recorded"}</dd></div>
      <div><dt>Issued</dt><dd>{session.credential.issuedAt}</dd></div>
    </dl>
    <Link className="verify" href="/">Start another incident</Link>
  </main>;
}
