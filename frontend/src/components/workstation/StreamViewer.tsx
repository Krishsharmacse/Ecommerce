"use client";

import React, { useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/lib/useWorkspaceStore";
import {
  Terminal,
  Copy,
  Check,
  Lock,
  Unlock,
  Code2,
  FileText,
  AlertTriangle,
  Loader2,
  Zap,
} from "lucide-react";

interface StreamViewerProps {
  isStreaming: boolean;
}

export const StreamViewer: React.FC<StreamViewerProps> = ({ isStreaming }) => {
  const streamOutput = useWorkspaceStore((s) => s.streamOutput);
  const rawViewMode = useWorkspaceStore((s) => s.rawViewMode);
  const setRawViewMode = useWorkspaceStore((s) => s.setRawViewMode);
  const autoScrollLocked = useWorkspaceStore((s) => s.autoScrollLocked);
  const setAutoScrollLocked = useWorkspaceStore((s) => s.setAutoScrollLocked);
  const metrics = useWorkspaceStore((s) => s.metrics);

  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  // Auto-scroll logic
  useEffect(() => {
    if (autoScrollLocked && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [streamOutput, autoScrollLocked]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(streamOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  // Simple Markdown renderer with code block parsing
  const renderFormattedMarkdown = (text: string) => {
    if (!text.trim()) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-zinc-600 select-none">
          <Terminal className="w-8 h-8 mb-2 stroke-[1.5] text-zinc-700" />
          <p className="text-xs font-mono">Workstation stream output idle</p>
          <p className="text-[11px] text-zinc-700 mt-1">
            Hit <kbd className="px-1 py-0.5 rounded bg-[#161b24] text-zinc-400 border border-[#242b38]">⌘ + Enter</kbd> to stream output
          </p>
        </div>
      );
    }

    // Split on code blocks (```lang ... ```)
    const segments = text.split(/(```[\s\S]*?```)/g);

    return (
      <div className="space-y-3 font-sans text-[13px] leading-relaxed text-zinc-200">
        {segments.map((seg, idx) => {
          if (seg.startsWith("```") && seg.endsWith("```")) {
            const rawContent = seg.slice(3, -3);
            const firstLineBreak = rawContent.indexOf("\n");
            const language =
              firstLineBreak !== -1 ? rawContent.slice(0, firstLineBreak).trim() : "code";
            const code =
              firstLineBreak !== -1 ? rawContent.slice(firstLineBreak + 1) : rawContent;

            return (
              <div
                key={idx}
                className="my-2 rounded border border-[#222834] bg-[#07090d] overflow-hidden"
              >
                <div className="flex items-center justify-between px-3 py-1 bg-[#10141c] border-b border-[#222834] text-[10px] font-mono text-zinc-400">
                  <span className="uppercase tracking-wider text-cyan-400 font-semibold">
                    {language || "code"}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(code)}
                    className="hover:text-zinc-200"
                  >
                    Copy Block
                  </button>
                </div>
                <pre className="p-3 text-[12px] font-mono text-emerald-300 overflow-x-auto selection:bg-emerald-900/40">
                  <code>{code}</code>
                </pre>
              </div>
            );
          }

          // Format normal paragraphs and markdown bullet points
          const lines = seg.split("\n");
          return (
            <div key={idx} className="space-y-1.5">
              {lines.map((line, lineIdx) => {
                if (line.startsWith("### ")) {
                  return (
                    <h3 key={lineIdx} className="font-semibold text-zinc-100 text-[14px] mt-2">
                      {line.replace("### ", "")}
                    </h3>
                  );
                }
                if (line.startsWith("## ")) {
                  return (
                    <h2 key={lineIdx} className="font-bold text-zinc-100 text-[15px] mt-3 pb-1 border-b border-[#1f2633]">
                      {line.replace("## ", "")}
                    </h2>
                  );
                }
                if (line.startsWith("# ")) {
                  return (
                    <h1 key={lineIdx} className="font-bold text-white text-[16px] mt-3 pb-1 border-b border-[#1f2633]">
                      {line.replace("# ", "")}
                    </h1>
                  );
                }
                if (line.startsWith("- ") || line.startsWith("* ")) {
                  return (
                    <li key={lineIdx} className="ml-4 list-disc text-zinc-300">
                      {line.slice(2)}
                    </li>
                  );
                }
                if (line.trim() === "") {
                  return <div key={lineIdx} className="h-1" />;
                }
                return (
                  <p key={lineIdx} className="text-zinc-300 leading-normal">
                    {line}
                  </p>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#07090d] min-h-0">
      {/* Stream Viewer Top Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-[#1b1f27] bg-[#0c0f16]/90 backdrop-blur-sm select-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#161b24] text-[11px] font-mono text-zinc-400 border border-[#242b38]">
            <Terminal className="w-3 h-3 text-emerald-400" />
            <span>LIVE EXECUTION STREAM</span>
          </div>

          {isStreaming && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 text-[10px] font-mono animate-pulse">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              <span>STREAMING</span>
            </div>
          )}

          {metrics.status === "rate_limited" && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/60 text-[10px] font-mono">
              <AlertTriangle className="w-2.5 h-2.5" />
              <span>429 RATE LIMIT</span>
            </div>
          )}
        </div>

        {/* View Mode & AutoScroll Toggles */}
        <div className="flex items-center gap-2 text-[11px]">
          {/* Raw / Rendered Toggle */}
          <div className="flex items-center p-0.5 rounded bg-[#121620] border border-[#202735]">
            <button
              type="button"
              onClick={() => setRawViewMode(false)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                !rawViewMode
                  ? "bg-[#1f2737] text-cyan-300 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>Rendered</span>
            </button>
            <button
              type="button"
              onClick={() => setRawViewMode(true)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                rawViewMode
                  ? "bg-[#1f2737] text-cyan-300 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Code2 className="w-3 h-3" />
              <span>Raw</span>
            </button>
          </div>

          {/* Auto Scroll Lock */}
          <button
            type="button"
            onClick={() => setAutoScrollLocked(!autoScrollLocked)}
            title={autoScrollLocked ? "Auto-scroll locked to bottom" : "Auto-scroll unlocked"}
            className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors ${
              autoScrollLocked
                ? "bg-cyan-950/30 text-cyan-300 border-cyan-800/40"
                : "bg-[#121620] text-zinc-500 border-[#202735] hover:text-zinc-300"
            }`}
          >
            {autoScrollLocked ? (
              <Lock className="w-3 h-3 text-cyan-400" />
            ) : (
              <Unlock className="w-3 h-3" />
            )}
            <span className="hidden sm:inline">Auto-Scroll</span>
          </button>

          {/* Copy Response */}
          <button
            type="button"
            onClick={handleCopy}
            disabled={!streamOutput}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#121620] text-zinc-400 hover:text-zinc-200 hover:bg-[#1c2332] border border-[#202735] disabled:opacity-40 transition-colors"
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* Stream Viewer Container with Independent Virtual Scroll */}
      <div
        ref={containerRef}
        className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 select-text"
      >
        {rawViewMode ? (
          <pre className="font-mono text-[12px] text-zinc-300 whitespace-pre-wrap break-words leading-relaxed selection:bg-cyan-500/20">
            {streamOutput || (
              <span className="text-zinc-600">No output streamed yet.</span>
            )}
          </pre>
        ) : (
          renderFormattedMarkdown(streamOutput)
        )}
      </div>
    </div>
  );
};
