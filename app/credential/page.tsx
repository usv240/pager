"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { loadCredentialSession, type CredentialSession } from "@/engine/credential-session";

export default function CredentialPage() {
  const [session, setSession] = useState<CredentialSession | null>();
  useEffect(() => setSession(loadCredentialSession()), []);

  if (session === undefined) return <main className="shell"><p>Loading verified credential...</p></main>;
  if (!session) return <main className="shell empty-state"><h1>No verified credential yet.</h1><p>Complete an incident and pass its execution suite to mint one.</p><Link className="primary-action" href="/">Return to Pager</Link></main>;

  const passedTests = session.testResult.tests.filter((test) => test.passed).length;
  const incidentHref = `/?play=1&incident=${encodeURIComponent(session.incidentId)}`;
  return <main className="credential-shell">
    <header className="credential-nav"><Link className="brand" href="/">PAGER</Link><div><ThemeToggle /><Link href={incidentHref}>Back to incident</Link><Link href="/?play=1">Mission library</Link></div></header>
    <section className="credential-hero"><div><p className="eyebrow">Execution-verified credential</p><h1>{session.credential.title}</h1><p>{session.credential.summary}</p><div className="credential-proof"><span>✓</span><div><strong>Incident contained</strong><small>{session.testResult.summary}</small></div></div></div><aside className="credential-seal"><span>VERIFIED</span><strong>01</strong><small>Pager evidence record</small></aside></section>
    <section className="credential-grid"><article className="credential-card"><p className="eyebrow">Evidence record</p><dl><div><dt>Mission</dt><dd>{session.incidentTitle}</dd></div><div><dt>Suite result</dt><dd>{passedTests}/{session.testResult.tests.length} checks passed</dd></div><div><dt>AI oversight</dt><dd>{session.caughtIncorrectAiFix ? "Incorrect recommendation rejected" : "Not recorded"}</dd></div><div><dt>Issued</dt><dd>{session.credential.issuedAt}</dd></div></dl></article><article className="credential-card debrief-card"><p className="eyebrow">Incident debrief</p><h2>What execution proved</h2><p><strong>Root cause</strong>{session.briefing.rootCause}</p><p><strong>Decisive evidence</strong>{session.briefing.evidence}</p></article></section>
    <section className="next-incident"><div><p className="eyebrow">Keep practicing</p><h2>Good judgment is a repeatable engineering skill.</h2></div><Link className="primary-action" href="/?play=1">Start another incident <span aria-hidden="true">→</span></Link></section>
  </main>;
}
