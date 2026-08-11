"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/vulnerabilities", label: "Vulnerabilities" },
  { href: "/services", label: "Services" },
];

export default function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-sm border border-signal text-signal">
            <span className="h-1.5 w-1.5 rounded-full bg-signal" />
          </span>
          <span className="font-mono text-sm font-semibold tracking-wide text-paper">
            FAULTLINE
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-1 font-mono text-sm">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded px-3 py-1.5 transition-colors ${
                    active ? "bg-panel2 text-paper" : "text-muted hover:text-paper"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {session?.user && (
            <div className="flex items-center gap-3 border-l border-line pl-4">
              <span className="hidden text-xs text-muted sm:inline">{session.user.email}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="rounded border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:border-steady hover:text-paper"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
