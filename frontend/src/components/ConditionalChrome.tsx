"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import AnimatedBackground from "@/components/AnimatedBackground";

export default function ConditionalChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isWorkspace = pathname?.startsWith("/workspace");
  const isAdminDashboard = pathname?.startsWith("/dashboard/admin");

  if (isWorkspace || isAdminDashboard) {
    return <>{children}</>;
  }

  return (
    <>
      <AnimatedBackground />
      <Navbar />
      <main>{children}</main>
    </>
  );
}
