"use client";

import React, { useMemo } from "react";
import { useWorkspaceStore } from "@/lib/useWorkspaceStore";
import {
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Copy,
  Check,
  Tag,
  Hash,
} from "lucide-react";

interface PromptEditorProps {
  onExecute: () => void;
  isStreaming: boolean;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({
  onExecute,
  isStreaming,
}) => {
  const promptContent = useWorkspaceStore((s) => s.promptContent);
  const setPromptContent = useWorkspaceStore((s) => s.setPromptContent);
  const variables = useWorkspaceStore((s) => s.variables);
  const resetStream = useWorkspaceStore((s) => s.resetStream);

  const [copied, setCopied] = React.useState(false);

  // Extract variable tokens like {{var_name}}
  const detectedVariables = useMemo(() => {
    const matches = promptContent.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g) || [];
    return Array.from(new Set(matches.map((m) => m.replace(/[{}]/g, ""))));
  }, [promptContent]);

  // Rough token estimate (chars / 3.8 average for code/prose mix)
  const estimatedTokens = useMemo(() => {
    return Math.max(1, Math.ceil(promptContent.length / 3.8));
  }, [promptContent]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!isStreaming) {
        onExecute();
      }
    }
  };

  const handleInsertVariable = (varName: string) => {
    const tag = `{{${varName}}}`;
    setPromptContent(`${promptContent} ${tag}`);
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0c10] border-b border-[#1b1f27]">
      {/* Editor Header Bar */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-[#1b1f27] bg-[#0d1017]/80 backdrop-blur-sm select-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#161b24] text-[11px] font-mono text-zinc-400 border border-[#242b38]">
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>PROMPT CANVAS</span>
          </div>

          <span className="text-zinc-600 text-xs">/</span>

          <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
            <Hash className="w-3 h-3 text-zinc-500" />
            <span>~{estimatedTokens.toLocaleString()} tokens</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyPrompt}
            title="Copy prompt text"
            className="flex items-center gap-1 px-2 py-1 text-[11px] rounded bg-[#12161f] text-zinc-400 hover:text-zinc-200 hover:bg-[#1b2230] border border-[#212836] transition-colors"
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          <button
            type="button"
            onClick={resetStream}
            disabled={isStreaming}
            title="Reset active prompt stream"
            className="flex items-center gap-1 px-2 py-1 text-[11px] rounded bg-[#12161f] text-zinc-400 hover:text-zinc-200 hover:bg-[#1b2230] border border-[#212836] disabled:opacity-40 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear</span>
          </button>

          <button
            type="button"
            onClick={onExecute}
            disabled={isStreaming || !promptContent.trim()}
            className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium rounded bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-sm shadow-cyan-500/20 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            <Play className={`w-3 h-3 fill-current ${isStreaming ? "animate-pulse" : ""}`} />
            <span>{isStreaming ? "Executing..." : "Execute"}</span>
            <kbd className="ml-1 px-1 py-0.2 rounded bg-black/30 text-[9px] font-mono text-cyan-200 border border-white/10">
              ⌘↵
            </kbd>
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="relative flex-1 min-h-[160px] p-3 flex flex-col">
        <textarea
          value={promptContent}
          onChange={(e) => setPromptContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Compose developer prompt using {{variable_name}} syntax..."
          spellCheck={false}
          className="w-full h-full resize-none bg-transparent font-mono text-[13px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:outline-none scrollbar-thin selection:bg-cyan-500/20 selection:text-cyan-200"
        />

        {/* Variable Tags Overlay Row */}
        <div className="pt-2 border-t border-[#1b1f27] flex items-center justify-between gap-2 overflow-x-auto text-[11px] select-none">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider flex items-center gap-1">
              <Tag className="w-2.5 h-2.5" /> Variables:
            </span>

            {detectedVariables.length === 0 ? (
              <span className="text-zinc-600 italic text-[11px]">
                No variables detected. Type &#123;&#123;name&#125;&#125; to inject.
              </span>
            ) : (
              detectedVariables.map((v) => {
                const hasValue = Boolean(variables[v]);
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleInsertVariable(v)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] border transition-colors ${
                      hasValue
                        ? "bg-cyan-950/40 text-cyan-300 border-cyan-800/60 hover:bg-cyan-900/50"
                        : "bg-amber-950/40 text-amber-300 border-amber-800/60 hover:bg-amber-900/50"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>&#123;&#123;{v}&#125;&#125;</span>
                  </button>
                );
              })
            )}
          </div>

          <div className="text-[10px] text-zinc-500 font-mono whitespace-nowrap">
            Press <kbd className="px-1 py-0.5 rounded bg-[#161b24] text-zinc-400 border border-[#242b38]">Ctrl+Enter</kbd> to run
          </div>
        </div>
      </div>
    </div>
  );
};
