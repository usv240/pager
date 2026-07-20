import Link from "next/link";
import { InfoTip } from "@/components/info-tip";
import { ThemeToggle } from "@/components/theme-toggle";

const starterIncident = "/?play=1&incident=python-invoice-queue";

export function PagerLanding() {
  return <main id="main-content" className="landing-shell">
    <a className="skip-link" href="#start">Skip to incident details</a>
    <header className="landing-nav" aria-label="Pager navigation">
      <Link className="brand" href="/">PAGER</Link>
      <nav><a href="#how-it-works">How it works</a><a href="#proof">Why it matters</a></nav>
      <div className="nav-actions"><ThemeToggle /><Link className="nav-start" href={starterIncident}>Start incident</Link></div>
    </header>

    <section className="landing-hero" aria-labelledby="pager-title">
      <div className="hero-copy">
        <p className="eyebrow">AI oversight, proven by execution</p>
        <h1 id="pager-title">Practice the judgment that comes after AI writes the code.</h1>
        <p className="hero-lede">Pager puts developers inside a production incident. Inspect the evidence, judge a plausible AI repair, and ship only what holds under a real acceptance suite.</p>
        <div className="hero-actions">
          <Link className="primary-action" href={starterIncident}>Start a live incident <span aria-hidden="true">&rarr;</span></Link>
          <InfoTip label="What happens in an incident">You inspect a real incident artifact, review authored repair options, run the acceptance suite in your browser, and earn a credential only when execution proves the repair.</InfoTip>
        </div>
        <p className="hero-note">No account. No setup. About 15 minutes.</p>
      </div>
      <aside className="incident-preview" aria-label="Incident preview">
        <div className="preview-heading"><span className="live-dot" aria-hidden="true" />LIVE INCIDENT <span>SEV-2</span></div>
        <h2>Duplicate invoice work</h2>
        <p>A retry can enqueue the same invoice more than once, delaying reconciliation.</p>
        <dl><div><dt>Context</dt><dd>Signals + codebase</dd></div><div><dt>Decision</dt><dd>3 repair options</dd></div><div><dt>Proof</dt><dd>Real unittest suite</dd></div></dl>
      </aside>
    </section>

    <section id="how-it-works" className="landing-section" aria-labelledby="how-title">
      <div className="section-heading"><p className="eyebrow">The learning loop</p><h2 id="how-title">Investigate the evidence. Judge the repair. Prove the result.</h2></div>
      <ol className="landing-steps"><li><span>01</span><h3>Investigate the incident</h3><p>Read the alert, telemetry, stakeholder context, and unfamiliar codebase without being told the answer.</p></li><li><span>02</span><h3>Judge the AI repair</h3><p>Review the exact code diff, then apply or reject a plausible proposal. Teaching feedback arrives after you make the call.</p></li><li><span>03</span><h3>Verify by execution</h3><p>The acceptance suite, not an LLM, decides whether the incident is actually resolved.</p></li></ol>
    </section>

    <section id="proof" className="proof-panel" aria-labelledby="proof-title">
      <div><p className="eyebrow">Why Pager</p><h2 id="proof-title">AI can accelerate the fix. You still own the decision.</h2><p>Pager complements coding agents by training verification discipline under realistic constraints. A repair can sound reasonable, remove an error, and still violate the customer-facing invariant.</p></div>
      <ul><li><strong>Distinct production context</strong><span>Every lab has its own services, timeline, stakeholders, codebase, and acceptance evidence.</span></li><li><strong>Decision before reveal</strong><span>Repair options stay plausible until the learner reviews and records a judgment.</span></li><li><strong>Execution-gated proof</strong><span>A real passing suite and rejection of flawed guidance are required before Pager mints a credential.</span></li></ul>
    </section>

    <section className="language-availability" aria-labelledby="incidents-title">
      <div><p className="eyebrow">Practice path - 5 verified incidents</p><h2 id="incidents-title">Begin small. Build judgment through evidence.</h2><p className="practice-path-note">Each incident includes a real code artifact, operational context, authored repair options, and an executable acceptance suite.</p></div>
      <div className="language-cards"><article><span className="status complete">01 - Python - Easy</span><h3>Invoice Queue Retry</h3><p>A focused retry incident. Learn the three-part loop: inspect, judge, verify.</p><Link href={starterIncident}>Start incident</Link></article><article><span className="status complete">02 - Python - Medium</span><h3>Inventory Reservation Retry</h3><p>Contain duplicate stock holds while preserving independent reservations.</p><Link href="/?play=1&incident=python-inventory-reservation">Open incident</Link></article><article><span className="status complete">03 - Python - Advanced</span><h3>Settlement Replay Claim</h3><p>Claim work before an external delivery can re-enter and duplicate it.</p><Link href="/?play=1&incident=python-settlement-replay">Open incident</Link></article><article><span className="status complete">04 - TypeScript - Medium</span><h3>The Webhook Replay</h3><p>Stop provider retries from creating duplicate fulfillment work.</p><Link href="/?play=1&incident=typescript-webhook-replay">Open incident</Link></article><article><span className="status complete">05 - TypeScript - Advanced</span><h3>The 2 PM Incident</h3><p>Trace a concurrent checkout race and prove exactly one external charge.</p><Link href="/?play=1&incident=checkout-2pm">Open incident</Link></article></div>
    </section>

    <section id="upcoming" className="landing-roadmap" aria-labelledby="upcoming-title">
      <div><p className="eyebrow">Product roadmap</p><h2 id="upcoming-title">What we are building next.</h2><p>Pager will not label a language as supported until it has a browser-ready runner, a real artifact, and deterministic acceptance tests.</p></div>
      <details><summary>Upcoming features</summary><ul><li>Java and C++ runners after sandboxed execution is available.</li><li>More incident families: data consistency, authorization, and asynchronous delivery.</li><li>Saved progress history for completed, execution-verified labs.</li><li>More assessment-ready scenarios for teams and interview preparation.</li></ul></details>
    </section>

    <section id="start" className="landing-cta" aria-labelledby="start-title"><p className="eyebrow">Ready when you are</p><h2 id="start-title">Find the cause. Do not ship the confident wrong fix.</h2><Link className="primary-action" href={starterIncident}>Enter the incident room <span aria-hidden="true">&rarr;</span></Link></section>
  </main>;
}
