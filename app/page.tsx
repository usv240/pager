"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { IncidentWorkbench } from "@/components/incident-workbench";
import { PagerLanding } from "@/components/pager-landing";

function PagerHome() {
  const searchParams = useSearchParams();
  return searchParams.get("play") === "1" ? <IncidentWorkbench /> : <PagerLanding />;
}

export default function Home() {
  return <Suspense fallback={<main className="shell"><p>Loading Pager...</p></main>}><PagerHome /></Suspense>;
}
