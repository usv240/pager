"use client";

import { useEffect, useState } from "react";

function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function IncidentClock({ timeLimitSeconds }: { timeLimitSeconds: number }) {
  const [remaining, setRemaining] = useState(timeLimitSeconds);

  useEffect(() => {
    setRemaining(timeLimitSeconds);
    const timer = window.setInterval(() => setRemaining((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [timeLimitSeconds]);

  return <span className="timer">{remaining === 0 ? "TIME EXPIRED" : `${formatRemaining(remaining)} remaining`}</span>;
}
