import Link from "next/link";
import { InfoTip } from "@/components/info-tip";
import { ThemeToggle } from "@/components/theme-toggle";

export function PagerLanding() {
  return <main id="main-content" className="landing-shell">
    <a className="skip-link" href="#start">Skip to mission details</a>
    <header className="landing-nav" aria-label="Pager navigation">
      <Link className="brand" href="/">PAGER</Link>
      <nav><a href="#how-it-works">How it works</a><a href="#proof">Why it matters</a></nav>
      <div className="nav-actions"><ThemeToggle /><Link className="nav-start" href="/?play=1">Start incident</Link></div>
    </header>

    <section className="landing-hero" aria-labelledby="pager-title">
      <div className="hero-copy">
        <p className="eyebrow">AI oversight, proven by execution</p>
        <h1 id="pager-title">Your AI pair has a fix.<br />Do you ship it?</h1>
        <p className="hero-lede">Pager puts developers inside a production incident, where the most convincing repair is not always the one that holds under load.</p>
        <div className="hero-actions">
          <Link className="primary-action" href="/?play=1">Start the 2 PM Incident <span aria-hidden="true">→</span></Link>
          <InfoTip label="What happens in this mission">You inspect a real TypeScript checkout service, judge three AI recommendations, run the acceptance suite in your browser, and earn a credential only when execution proves the repair.</InfoTip>
        </div>
        <p className="hero-note">No account. No setup. About 20 minutes.</p>
      </div>
      <aside className="incident-preview" aria-label="Mission preview">
        <div className="preview-heading"><span className="live-dot" aria-hidden="true" />LIVE INCIDENT <span>SEV-1</span></div>
        <h2>Duplicate checkout charges</h2>
        <p>Customers report duplicate charges. The logs blame the payment gateway. The AI pair has three fixes ready — at most one of them holds.</p>
        <dl>
          <div><dt>Service</dt><dd>TypeScript checkout</dd></div>
          <div><dt>Decision</dt><dd>3 AI proposals</dd></div>
          <div><dt>Proof</dt><dd>Real acceptance suite</dd></div>
        </dl>
      </aside>
    </section>

    <section id="how-it-works" className="landing-section" aria-labelledby="how-title">
      <div className="section-heading"><p className="eyebrow">The learning loop</p><h2 id="how-title">Practice the judgment that comes after AI writes the code.</h2></div>
      <ol className="landing-steps">
        <li><span>01</span><h3>Investigate the incident</h3><p>Read the alert, stakeholder context, and unfamiliar codebase without being told the answer.</p></li>
        <li><span>02</span><h3>Judge the AI repair</h3><p>Apply or reject a plausible proposal. Teaching feedback arrives after you make the call.</p></li>
        <li><span>03</span><h3>Verify by execution</h3><p>The acceptance suite—not an LLM—decides whether the incident is actually resolved.</p></li>
      </ol>
    </section>

    <section id="proof" className="proof-panel" aria-labelledby="proof-title">
      <div><p className="eyebrow">Why Pager</p><h2 id="proof-title">Confidence is not evidence.</h2><p>Modern developers need to evaluate AI output under real constraints. Pager makes the hidden failure mode visible: a repair can sound reasonable, remove the error, and still harm customers.</p></div>
      <ul>
        <li><strong>Authored fault model</strong><span>Recommendations are deliberately plausible, not randomly broken.</span></li>
        <li><strong>Execution-gated credential</strong><span>A passing test run and a recorded judgment are both required.</span></li>
        <li><strong>AI support with boundaries</strong><span>AI Pair, PM, and Senior guidance stay advisory; execution remains the authority.</span></li>
      </ul>
    </section>

    <section className="language-availability" aria-labelledby="languages-title">
      <div><p className="eyebrow">Language availability</p><h2 id="languages-title">Start with a verified incident. Expand from evidence.</h2></div>
      <div className="language-cards"><article><span className="status complete">Complete</span><h3>TypeScript / JavaScript</h3><p>The flagship incident: full AI guidance, authored candidate faults, browser execution, and credential.</p><Link href="/?play=1">Open mission</Link></article><article><span className="status experimental">Experimental</span><h3>Python</h3><p>A real Pyodide execution lab for queue retries. It does not yet include the full AI oversight learning loop.</p><Link href="/?play=1&incident=python-invoice-queue">Open Python lab</Link></article></div>
    </section>

    <section id="start" className="landing-cta" aria-labelledby="start-title">
      <p className="eyebrow">Ready when you are</p><h2 id="start-title">Find the cause. Don’t ship the confident wrong fix.</h2>
      <Link className="primary-action" href="/?play=1">Enter the incident room <span aria-hidden="true">→</span></Link>
    </section>
  </main>;
}
