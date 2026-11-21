"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import FloatingAIAssistant from "@/components/FloatingAIAssistant";

export default function ConditionalChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isWorkspace = pathname?.startsWith("/workspace");
  const isAdminDashboard = pathname?.startsWith("/dashboard/admin") || pathname?.startsWith("/admin");
  const isVendorDashboard = pathname?.startsWith("/dashboard/vendor");

  if (isWorkspace || isAdminDashboard || isVendorDashboard) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main>{children}</main>
      <FloatingAIAssistant />
    </>
  );
}
