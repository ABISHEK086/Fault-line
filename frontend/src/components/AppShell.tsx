"use client";

import { usePathname } from "next/navigation";
import Nav from "@/components/Nav";

const AUTH_ROUTES = ["/login", "/signup"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (AUTH_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      <footer className="mx-auto max-w-6xl px-6 pb-10 pt-4 font-mono text-xs text-muted">
        Faultline - 2026
      </footer>
    </>
  );
}