import React from "react"
import { TopNav } from "@/components/climb/top-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
