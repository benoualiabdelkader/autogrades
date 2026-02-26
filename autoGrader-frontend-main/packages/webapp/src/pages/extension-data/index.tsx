"use client";

import React from "react";
import Sidebar from "@/components/Sidebar";
import ExtensionDataView from "@/components/ExtensionDataView";

export default function ExtensionDataPage() {
  return (
    <div className="flex min-h-screen bg-background-dark">
      <Sidebar />
      <main className="flex-1 pl-64 min-h-screen">
        <ExtensionDataView />
      </main>
    </div>
  );
}
