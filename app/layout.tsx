import type { Metadata } from "next";
import "./globals.css";
import "./workspace.css";
import "./guide.css";
import "./resize.css";
import "./polish.css";
export const metadata: Metadata = { title: "Pager — The 2 PM Incident", description: "Train the judgment to catch confident AI mistakes." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
