import { Suspense } from "react";
import { IncidentWorkbench } from "@/components/incident-workbench";
export default function Home() { return <Suspense fallback={<main className="shell"><p>Loading incident…</p></main>}><IncidentWorkbench /></Suspense>; }
