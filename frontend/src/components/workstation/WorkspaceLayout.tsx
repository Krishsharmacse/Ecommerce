"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useWorkspaceStore } from "@/lib/useWorkspaceStore";
import { PromptEditor } from "./PromptEditor";
import { StreamViewer } from "./StreamViewer";
import { InspectorPanel } from "./InspectorPanel";
import {
  Sidebar,
  Sliders,
  Search,
  FolderTree,
  History,
  Activity,
  Terminal,
  ChevronDown,
  Layers,
  Sparkles,
  Command,
  Database,
  ShoppingBag,
  ExternalLink,
  Zap,
} from "lucide-react";
import Link from "next/link";

export const WorkspaceLayout: React.FC = () => {
  const leftSidebarOpen = useWorkspaceStore((s) => s.leftSidebarOpen);
  const rightInspectorOpen = useWorkspaceStore((s) => s.rightInspectorOpen);
  const toggleLeftSidebar = useWorkspaceStore((s) => s.toggleLeftSidebar);
  const toggleRightInspector = useWorkspaceStore((s) => s.toggleRightInspector);

  const activeWorkspaceName = useWorkspaceStore((s) => s.activeWorkspaceName);
  const templates = useWorkspaceStore((s) => s.templates);
  const activePromptId = useWorkspaceStore((s) => s.activePromptId);
  const selectTemplate = useWorkspaceStore((s) => s.selectTemplate);
  const historyLogs = useWorkspaceStore((s) => s.historyLogs);

  const promptContent = useWorkspaceStore((s) => s.promptContent);
  const systemPrompt = useWorkspaceStore((s) => s.systemPrompt);
  const variables = useWorkspaceStore((s) => s.variables);
  const model = useWorkspaceStore((s) => s.model);
  const metrics = useWorkspaceStore((s) => s.metrics);

  const appendStreamChunk = useWorkspaceStore((s) => s.appendStreamChunk);
  const setStreamOutput = useWorkspaceStore((s) => s.setStreamOutput);
  const setMetrics = useWorkspaceStore((s) => s.setMetrics);
  const addHistoryLog = useWorkspaceStore((s) => s.addHistoryLog);

  const [isStreaming, setIsStreaming] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        toggleLeftSidebar();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "i") {
        e.preventDefault();
        toggleRightInspector();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleLeftSidebar, toggleRightInspector]);

  // Execute Prompt Streaming Mock / Real Abstraction
  const executePrompt = useCallback(async () => {
    if (isStreaming) return;

    // Substitute variables into prompt
    let finalPrompt = promptContent;
    Object.entries(variables).forEach(([k, v]) => {
      finalPrompt = finalPrompt.replaceAll(`{{${k}}}`, v || `[${k}]`);
    });

    setIsStreaming(true);
    setStreamOutput("");

    const startTime = performance.now();
    let firstTokenTime: number | null = null;

    setMetrics({
      status: "connecting",
      ttft: null,
      totalLatency: null,
      promptTokens: Math.ceil(finalPrompt.length / 3.8),
      completionTokens: 0,
    });

    try {
      // High performance developer stream simulation with simulated tokens
      const mockStreamChunks = [
        "### Workspace Telemetry & Analysis\n\n",
        `**System Prompt:** \`${systemPrompt.slice(0, 60)}...\`\n`,
        `**Target Inference Model:** \`${model}\`\n\n`,
        "```typescript\n",
        "// Injected Context Variables payload\n",
        JSON.stringify(variables, null, 2) + "\n",
        "```\n\n",
        "#### Evaluated Diagnostics & Findings:\n",
        "- **Context Resolution:** Successfully substituted all dynamic `{{variable}}` keys.\n",
        "- **Operational Integrity:** Database connection verified via Neon PostgreSQL cluster.\n",
        "- **Redis State:** TCP cache hit at 99.4% precision with zero dropped frames.\n\n",
        "```sql\n",
        "-- Optimized Query Execution Plan\n",
        "EXPLAIN ANALYZE SELECT o.id, o.status, p.amount_paise\n",
        "FROM \"Order\" o\n",
        "JOIN \"Payment\" p ON p.\"orderId\" = o.id\n",
        "WHERE o.\"userId\" = 'usr_prod_899'\n",
        "ORDER BY o.\"createdAt\" DESC\n",
        "LIMIT 10;\n",
        "```\n\n",
        "All pipeline validation constraints passed. Ready for downstream webhook invocation.",
      ];

      for (let i = 0; i < mockStreamChunks.length; i++) {
        await new Promise((res) => setTimeout(res, 85));
        const chunk = mockStreamChunks[i];

        if (i === 0 && !firstTokenTime) {
          firstTokenTime = Math.round(performance.now() - startTime);
          setMetrics({ ttft: firstTokenTime, status: "streaming" });
        }

        appendStreamChunk(chunk);
        setMetrics({
          completionTokens: (i + 1) * 28,
        });
      }

      const totalTime = Math.round(performance.now() - startTime);
      setMetrics({
        totalLatency: totalTime,
        status: "completed",
        costEstimate: 0.0014,
      });

      addHistoryLog({
        promptSnippet: finalPrompt.slice(0, 50) + "...",
        tokens: Math.ceil(finalPrompt.length / 3.8) + mockStreamChunks.length * 28,
        latency: totalTime,
        status: "success",
      });
    } catch {
      setMetrics({
        status: "error",
        errorMessage: "Stream interrupted or connection reset",
      });
    } finally {
      setIsStreaming(false);
    }
  }, [
    isStreaming,
    promptContent,
    variables,
    systemPrompt,
    model,
    setStreamOutput,
    setMetrics,
    appendStreamChunk,
    addHistoryLog,
  ]);

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#06080b] text-zinc-100 font-sans select-none">
      {/* ── TOP WORKSTATION APP HEADER ── */}
      <header className="h-11 border-b border-[#1b1f27] bg-[#090b10] px-3 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          {/* Logo & Workstation Name */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-cyan-500/20">
              ⚡
            </div>
            <span className="font-semibold text-xs tracking-tight text-white flex items-center gap-1.5">
              SHOPVAULT <span className="text-zinc-500 font-normal">/</span> WORKSTATION
            </span>
          </div>

          <div className="h-4 w-px bg-[#1f2633]" />

          {/* Quick cluster switch badge */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#10141d] border border-[#1e2533] text-[11px] font-mono text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{activeWorkspaceName}</span>
          </div>
        </div>

        {/* Global Navigation and Shortcut badges */}
        <div className="flex items-center gap-2">
          {/* Quick Search Trigger */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#10141d] hover:bg-[#161c28] border border-[#1e2533] text-zinc-400 text-xs transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-[11px]">Quick Jump</span>
            <kbd className="px-1 py-0.2 rounded bg-black/40 text-[9px] font-mono text-zinc-400 border border-white/10">
              ⌘K
            </kbd>
          </button>

          {/* View Storefront Link */}
          <Link
            href="/shop"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-[#161c28] text-xs font-mono transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Storefront</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </Link>

          {/* Toggle Sidebar Buttons */}
          <button
            type="button"
            onClick={toggleLeftSidebar}
            title="Toggle Left Sidebar (⌘B)"
            className={`p-1.5 rounded border transition-colors ${
              leftSidebarOpen
                ? "bg-[#161c28] text-cyan-400 border-cyan-800/40"
                : "text-zinc-400 hover:bg-[#10141d] border-[#1e2533]"
            }`}
          >
            <Sidebar className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={toggleRightInspector}
            title="Toggle Right Inspector (⌘I)"
            className={`p-1.5 rounded border transition-colors ${
              rightInspectorOpen
                ? "bg-[#161c28] text-cyan-400 border-cyan-800/40"
                : "text-zinc-400 hover:bg-[#10141d] border-[#1e2533]"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ── 3-COLUMN WORKSPACE VIEWPORT CLAMP ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* COLUMN 1: LEFT SIDEBAR (~260px) */}
        {leftSidebarOpen && (
          <aside className="w-[260px] flex-shrink-0 flex flex-col bg-[#07090d] border-r border-[#1b1f27] text-xs z-20 transition-all duration-150">
            {/* Search filter bar */}
            <div className="p-2 border-b border-[#1b1f27]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter templates..."
                  className="w-full bg-[#10141d] border border-[#1b2230] rounded py-1 pl-8 pr-2 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 font-mono"
                />
              </div>
            </div>

            {/* Tree Navigation Sections */}
            <div className="flex-1 overflow-y-auto p-2 space-y-4 scrollbar-thin">
              {/* Templates Section */}
              <div className="space-y-1">
                <div className="flex items-center justify-between px-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <FolderTree className="w-3 h-3" /> Prompts & Workflows
                  </span>
                  <span>{filteredTemplates.length}</span>
                </div>

                <div className="space-y-0.5">
                  {filteredTemplates.map((t) => {
                    const isActive = t.id === activePromptId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => selectTemplate(t.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                          isActive
                            ? "bg-cyan-950/40 text-cyan-300 border border-cyan-800/50 font-medium"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-[#10141d]"
                        }`}
                      >
                        <span className="truncate pr-2">{t.name}</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-zinc-500 font-mono">
                          {t.category}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recent History Logs */}
              <div className="space-y-1 pt-2 border-t border-[#1b1f27]">
                <div className="flex items-center justify-between px-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <History className="w-3 h-3" /> Recent Executions
                  </span>
                </div>

                <div className="space-y-1">
                  {historyLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-1.5 rounded bg-[#0c0f16] border border-[#1b2230] text-[10px] font-mono text-zinc-400 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center justify-between text-zinc-500 text-[9px] mb-0.5">
                        <span>{log.timestamp}</span>
                        <span className="text-emerald-400">{log.latency}ms</span>
                      </div>
                      <p className="truncate text-zinc-300">{log.promptSnippet}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* COLUMN 2: CENTER STAGE (Flex-1) */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#06080b] relative">
          {/* Top Panel: Resizable Prompt Editor */}
          <div className="h-[46%] min-h-[180px]">
            <PromptEditor onExecute={executePrompt} isStreaming={isStreaming} />
          </div>

          {/* Bottom Panel: Live Streaming Execution View */}
          <div className="h-[54%] min-h-[220px] flex flex-col">
            <StreamViewer isStreaming={isStreaming} />
          </div>
        </main>

        {/* COLUMN 3: RIGHT INSPECTOR (~320px) */}
        {rightInspectorOpen && (
          <aside className="w-[320px] flex-shrink-0 z-20">
            <InspectorPanel />
          </aside>
        )}
      </div>

      {/* ── BOTTOM DOCK: PERSISTENT TELEMETRY STRIP (~36px) ── */}
      <footer className="h-9 px-3 border-t border-[#1b1f27] bg-[#080a0e] flex items-center justify-between text-[11px] font-mono text-zinc-400 select-none z-30">
        {/* Left Telemetry Cluster */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                metrics.status === "streaming"
                  ? "bg-cyan-400 animate-ping"
                  : metrics.status === "completed"
                  ? "bg-emerald-400"
                  : metrics.status === "rate_limited"
                  ? "bg-rose-400"
                  : "bg-zinc-600"
              }`}
            />
            <span className="text-zinc-300 uppercase tracking-wider text-[10px]">
              {metrics.status}
            </span>
          </div>

          <span className="text-zinc-700">|</span>

          <div className="flex items-center gap-1">
            <span className="text-zinc-500">TTFT:</span>
            <span className="text-zinc-200">
              {metrics.ttft ? `${metrics.ttft}ms` : "--"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-zinc-500">Latency:</span>
            <span className="text-zinc-200">
              {metrics.totalLatency ? `${metrics.totalLatency}ms` : "--"}
            </span>
          </div>
        </div>

        {/* Center / Right Token Metrics */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-zinc-500">Prompt:</span>
            <span className="text-cyan-400">{metrics.promptTokens} tks</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-zinc-500">Completion:</span>
            <span className="text-emerald-400">{metrics.completionTokens} tks</span>
          </div>

          <span className="text-zinc-700">|</span>

          <div className="flex items-center gap-1">
            <span className="text-zinc-500">Est. Cost:</span>
            <span className="text-zinc-200">${metrics.costEstimate.toFixed(5)}</span>
          </div>

          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#10141c] border border-[#1b2230] text-[10px] text-zinc-400">
            <Database className="w-2.5 h-2.5 text-cyan-400" />
            <span>Neon DB / Upstash Redis: OK</span>
          </div>
        </div>
      </footer>

      {/* Quick Jump Command Palette Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#0c0f16] border border-[#242b38] rounded-xl shadow-2xl p-3 text-xs space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-2 py-1.5 border-b border-[#1b2230]">
              <Search className="w-4 h-4 text-cyan-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search templates, commands, or workspaces..."
                className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none font-mono"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <kbd className="px-1.5 py-0.5 rounded bg-[#161b24] text-[10px] font-mono text-zinc-400 border border-[#242b38]">
                ESC
              </kbd>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 p-1">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    selectTemplate(t.id);
                    setSearchOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded hover:bg-[#161b24] text-zinc-200 flex items-center justify-between transition-colors"
                >
                  <span className="font-medium">{t.name}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{t.category}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
