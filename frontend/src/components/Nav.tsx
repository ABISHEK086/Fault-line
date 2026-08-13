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
    <header className="sticky top-0 z-20 bg-paper">
      <div className="hazard-tape" />
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center border-[1.5px] border-ink">
            <span className="h-2 w-2 bg-hazard" />
          </span>
          <span className="font-display text-sm tracking-wide text-ink">FAULTLINE</span>
        </Link>

        <div className="flex items-center gap-5">
          <nav className="flex items-center gap-1 font-mono text-xs uppercase tracking-wide">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 transition-colors ${
                    active ? "bg-ink text-paper" : "text-ink/60 hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {session?.user && (
            <div className="flex items-center gap-3 border-l border-ink/25 pl-4">
              <span className="hidden font-mono text-[11px] text-ink/60 sm:inline">
                {session.user.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="border border-ink/40 px-2.5 py-1 font-mono text-[11px] uppercase text-ink/70 transition-colors hover:border-ink hover:text-ink"
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