"use client";

import { cn } from "@/lib/utils";
import { ClimbLogo, SettingsIcon } from "./icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/explorer", label: "Explorer", matchPrefix: "/explorer" },
  { href: "/reconciliation", label: "Reconciliation", matchPrefix: "/reconciliation" },
];

export function TopNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

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

        {/* Settings */}
        <Link
          href="/settings"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Settings"
        >
          <SettingsIcon className="h-4 w-4" />
        </Link>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              {user?.name ? user.name.substring(0, 2).toUpperCase() : "KS"}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name || "User"}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || "user@example.com"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 cursor-pointer">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
