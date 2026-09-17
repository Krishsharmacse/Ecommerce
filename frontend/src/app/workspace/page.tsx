import type { Metadata } from "next";
import { WorkspaceLayout } from "@/components/workstation/WorkspaceLayout";

export const metadata: Metadata = {
  title: "ShopVault Workstation — Developer Inference & Prompt Engine",
  description:
    "High-performance developer-grade prompt engineering, telemetry dock, and streaming workstation interface.",
};

export default function WorkspacePage() {
  return <WorkspaceLayout />;
}
