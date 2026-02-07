import React from "react";
import Link from "next/link";
import { ClimbLogo, MountainIcon } from "@/components/climb/icons";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full">
      {/* ── Left Side: Form Area ───────────────────────────── */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24 bg-background">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-10">
            <Link href="/" className="flex items-center gap-2 group">
              <ClimbLogo className="h-8 w-8 transition-transform group-hover:scale-105" />
              <span className="text-lg font-bold text-foreground tracking-tight">CLIMB</span>
            </Link>
          </div>
          
          {children}

          <div className="mt-10 border-t border-border pt-6">
            <p className="text-xs text-center text-muted-foreground">
              &copy; 2026 CLIMB Intelligence Platform. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Side: Brand Visuals ──────────────────────── */}
      <div className="relative hidden w-0 flex-1 lg:block bg-slate-950 overflow-hidden">
        {/* Background Grids & Effects */}
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%" className="text-climb-mint">
            <defs>
              <pattern id="auth-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#auth-grid)" />
          </svg>
        </div>
        
        {/* Decorative Gradient */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-[500px] w-[500px] rounded-full bg-climb-mint/20 blur-[100px]" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-[500px] w-[500px] rounded-full bg-climb-lime/10 blur-[100px]" />

        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 animate-pulse rounded-full bg-climb-mint/20 blur-xl" />
            <MountainIcon className="relative h-24 w-24 text-climb-mint" />
          </div>
          
          <h2 className="text-3xl font-bold text-white tracking-tight mb-4 text-balance">
            Closed-Loop Intelligence for Mining Blocks
          </h2>
          <p className="text-base text-slate-400 max-w-md text-balance">
            Integrate geospatial data, hybrid AI inference, and operational reconciliation in one unified platform.
          </p>

          {/* Stat Card Decoration */}
          <div className="absolute bottom-12 left-12 right-12 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-md flex items-center justify-between shadow-2xl">
            <div className="text-left">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">System Status</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-climb-mint opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-climb-mint"></span>
                </span>
                <span className="text-sm font-medium text-white">Operational</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Confidence</p>
              <p className="text-sm font-mono font-bold text-climb-mint">98.4%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
