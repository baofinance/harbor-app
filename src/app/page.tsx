"use client";

import React from "react";

export default function DashboardPage() {
  return (
    <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
      <main className="container mx-auto px-4 sm:px-10 pb-6">
        <section className="mb-6">
          <div className="p-4">
            <h1 className="font-semibold font-mono text-white text-2xl mb-2">
              Dashboard
            </h1>
            <p className="text-white/60 text-sm">
              Overview of your Harbor Protocol activity and positions.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
