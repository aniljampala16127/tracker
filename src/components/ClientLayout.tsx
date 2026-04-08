"use client";

import { PageTransition } from "@/components/PageTransition";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <PageTransition>{children}</PageTransition>
    </main>
  );
}
