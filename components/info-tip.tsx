"use client";

import { useId, useState } from "react";

export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return <span className="info-tip" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
    <button
      type="button"
      aria-label={label}
      aria-describedby={open ? tooltipId : undefined}
      aria-expanded={open}
      onClick={() => setOpen((current) => !current)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >i</button>
    {open && <span id={tooltipId} role="tooltip">{children}</span>}
  </span>;
}
