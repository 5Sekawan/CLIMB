"use client";

import { cn } from "@/lib/utils";
import { ClimbLogo, SearchIcon, SettingsIcon } from "./icons";
import { AIStatusBadge } from "./ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/explorer", label: "Explorer", matchPrefix: "/explorer" },
  { href: "/reconciliation", label: "Reconciliation", matchPrefix: "/reconciliation" },
  { href: "/settings", label: "Settings" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 flex h-14 w-full items-center border-b border-border bg-card/80 backdrop-blur-md">
      <div className="flex w-full items-center gap-6 px-6">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <ClimbLogo className="h-7 w-7" />
          <span className="text-base font-bold text-foreground tracking-tight">
            CLIMB
          </span>
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {navLinks.map((link) => {
            const prefix = "matchPrefix" in link ? link.matchPrefix : undefined;
            const isActive = prefix
              ? pathname.startsWith(prefix)
              : pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-climb-fast",
                  isActive
                    ? "bg-climb-mint-subtle text-climb-mint"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search Bar (Command Palette Trigger) */}
        <button
          className="hidden sm:flex items-center gap-2 h-9 w-64 rounded-lg border border-border bg-muted/50 px-3 text-sm text-muted-foreground transition-colors duration-climb-fast hover:border-primary/30 hover:bg-muted"
          aria-label="Search"
        >
          <SearchIcon className="h-4 w-4" />
          <span className="flex-1 text-left text-xs">
            Ask AI about your project...
          </span>
          <kbd className="hidden lg:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-card px-1.5 font-mono text-[10px] text-muted-foreground">
            {"Cmd+K"}
          </kbd>
        </button>

        {/* AI Status */}
        <AIStatusBadge status="idle" />

        {/* Settings */}
        <Link
          href="/settings"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Settings"
        >
          <SettingsIcon className="h-4 w-4" />
        </Link>

        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
          KS
        </div>
      </div>
    </header>
  );
}
