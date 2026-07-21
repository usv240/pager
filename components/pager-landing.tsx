import Link from "next/link";
import { InfoTip } from "@/components/info-tip";
import { ThemeToggle } from "@/components/theme-toggle";

const starterIncident = "/?play=1&incident=python-invoice-queue";

export function PagerLanding() {
  return <main id="main-content" className="landing-shell">
    <a className="skip-link" href="#start">Skip to incident details</a>
    <header className="landing-nav" aria-label="Pager navigation">
      <Link className="brand" href="/">PAGER</Link>
      <nav><a href="#how-it-works">Experience</a><a href="#proof">Why Pager</a><a href="#upcoming">Roadmap</a></nav>
      <div className="nav-actions"><ThemeToggle /><Link className="nav-start" href={starterIncident}>Start incident</Link></div>
    </header>

    <section className="landing-hero" aria-labelledby="pager-title">
      <div className="hero-copy">
        <p className="eyebrow">AI oversight, proven by execution</p>
        <h1 id="pager-title">Practice the judgment that comes after AI writes the code.</h1>
        <p className="hero-lede">Pager puts developers inside a production incident: inspect the evidence, judge a plausible AI repair, and ship only what holds under a real acceptance suite.</p>
        <div className="hero-actions">
          <Link className="primary-action" href={starterIncident}>Start a live incident <span aria-hidden="true">&rarr;</span></Link>
          <InfoTip label="What happens in an incident">You inspect a real incident artifact, review authored repair options, run the acceptance suite in your browser, and earn a credential only when execution proves the repair.</InfoTip>
        </div>
        <p className="hero-note">No account. No setup. A complete evidence loop in about 15 minutes.</p>
      </div>
      <aside className="incident-preview" aria-label="Incident preview">
        <div className="preview-heading"><span className="live-dot" aria-hidden="true" />THE MOMENT PAGER SIMULATES <span>SEV-2</span></div>
        <h2>Duplicate invoice work</h2>
        <p>A retry can enqueue the same invoice more than once, delaying reconciliation.</p>
        <dl><div><dt>Context</dt><dd>Signals + codebase</dd></div><div><dt>Decision</dt><dd>3 repair hypotheses</dd></div><div><dt>Proof</dt><dd>Real unittest suite</dd></div></dl>
      </aside>
    </section>

    <section id="how-it-works" className="landing-section" aria-labelledby="how-title">
      <div className="section-heading"><p className="eyebrow">The learning loop</p><h2 id="how-title">Investigate the evidence. Judge the repair. Prove the result.</h2></div>
      <ol className="landing-steps"><li><span>01</span><h3>Investigate the incident</h3><p>Read the alert, telemetry, stakeholder context, and unfamiliar codebase without being told the answer.</p></li><li><span>02</span><h3>Judge the AI repair</h3><p>Review the exact code diff, then apply or reject a plausible proposal. Teaching feedback arrives after you make the call.</p></li><li><span>03</span><h3>Verify by execution</h3><p>The acceptance suite, not an LLM, decides whether the incident is actually resolved.</p></li></ol>
    </section>

    <section id="proof" className="proof-panel" aria-labelledby="proof-title">
      <div><p className="eyebrow">Why Pager</p><h2 id="proof-title">AI can accelerate the fix. You still own the decision.</h2><p>Pager is not a generic coding drill or an incident-management dashboard. It trains the missing layer between an AI-generated patch and a safe production decision: verification discipline under realistic constraints.</p></div>
      <ul><li><strong>Real systems, not isolated puzzles</strong><span>Every lab includes services, a timeline, stakeholders, a codebase, and acceptance evidence that point to one customer-facing invariant.</span></li><li><strong>Judgment before feedback</strong><span>Repairs stay plausible until the learner inspects the actual diff and records an Apply or Reject decision.</span></li><li><strong>Execution, not AI scoring</strong><span>The in-browser suite is the authority. A credential requires a real passing run and demonstrated AI oversight.</span></li></ul>
    </section>

    <section className="landing-impact" aria-labelledby="impact-title">
      <div className="section-heading"><p className="eyebrow">The product advantage</p><h2 id="impact-title">Pager makes the invisible part of AI-assisted development visible.</h2><p>Most tools can generate code. Pager lets a learner practice the professional behavior that follows: identify the invariant, interrogate the proposed change, and prove the outcome before it reaches customers.</p></div>
      <div className="impact-grid"><article><span>01</span><h3>Build judgment safely</h3><p>Experience the pressure, ambiguity, and incomplete context of a live incident without risking a real customer or production system.</p></article><article><span>02</span><h3>Learn from plausible mistakes</h3><p>Authored repair hypotheses are meaningful alternatives, not obviously broken distractors. Feedback explains what the suite disproved.</p></article><article><span>03</span><h3>Show evidence of the skill</h3><p>Execution-verified credentials capture the lab, the passing suite, and the learner&apos;s rejection of flawed guidance.</p></article></div>
    </section>

    <section className="language-availability" aria-labelledby="incidents-title">
      <div><p className="eyebrow">Practice path - 5 verified incidents</p><h2 id="incidents-title">Begin small. Build judgment through evidence.</h2><p className="practice-path-note">Start with a focused Python retry bug, then work through increasingly realistic Python and TypeScript systems. Every incident includes a real artifact, operational context, repair hypotheses, and an executable acceptance suite.</p></div>
      <div className="language-cards"><article><span className="status complete">01 - Python - Easy</span><h3>Invoice Queue Retry</h3><p>A focused retry incident. Learn the three-part loop: inspect, judge, verify.</p><Link href={starterIncident}>Start incident</Link></article><article><span className="status complete">02 - Python - Medium</span><h3>Inventory Reservation Retry</h3><p>Contain duplicate stock holds while preserving independent reservations.</p><Link href="/?play=1&incident=python-inventory-reservation">Open incident</Link></article><article><span className="status complete">03 - Python - Advanced</span><h3>Settlement Replay Claim</h3><p>Claim work before an external delivery can re-enter and duplicate it.</p><Link href="/?play=1&incident=python-settlement-replay">Open incident</Link></article><article><span className="status complete">04 - TypeScript - Medium</span><h3>The Webhook Replay</h3><p>Stop provider retries from creating duplicate fulfillment work.</p><Link href="/?play=1&incident=typescript-webhook-replay">Open incident</Link></article><article><span className="status complete">05 - TypeScript - Advanced</span><h3>The 2 PM Incident</h3><p>Trace a concurrent checkout race and prove exactly one external charge.</p><Link href="/?play=1&incident=checkout-2pm">Open incident</Link></article></div>
    </section>

    <section id="upcoming" className="landing-roadmap" aria-labelledby="upcoming-title">
      <div><p className="eyebrow">Product roadmap</p><h2 id="upcoming-title">Scale the evidence loop, not just the content catalog.</h2><p>Pager will not label a language as supported until it has a browser-ready runner, a realistic artifact, and deterministic acceptance tests. Credibility is the product constraint.</p></div>
      <details><summary>What is next</summary><ul><li><strong>Broader execution:</strong> Java and C++ once isolated compiler sandboxes are available.</li><li><strong>Richer production cases:</strong> authorization, data consistency, asynchronous delivery, and observability failures.</li><li><strong>Learning continuity:</strong> saved progress, debrief history, and targeted next-lab recommendations.</li><li><strong>Team readiness:</strong> assessment-ready scenarios for engineering onboarding and interview preparation.</li></ul></details>
    </section>

    <section id="start" className="landing-cta" aria-labelledby="start-title"><p className="eyebrow">Ready when you are</p><h2 id="start-title">Find the cause. Verify the repair. Protect the customer.</h2><p>Start with the Invoice Queue Retry and complete the full incident loop in your browser.</p><Link className="primary-action" href={starterIncident}>Enter the incident room <span aria-hidden="true">&rarr;</span></Link></section>
  </main>;
}
