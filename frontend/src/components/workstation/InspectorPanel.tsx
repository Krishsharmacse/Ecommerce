"use client";

import React, { useMemo } from "react";
import { useWorkspaceStore } from "@/lib/useWorkspaceStore";
import {
  Sliders,
  Cpu,
  Variable,
  ShieldAlert,
  ChevronRight,
  Info,
  RotateCcw,
} from "lucide-react";

export const InspectorPanel: React.FC = () => {
  const promptContent = useWorkspaceStore((s) => s.promptContent);
  const systemPrompt = useWorkspaceStore((s) => s.systemPrompt);
  const setSystemPrompt = useWorkspaceStore((s) => s.setSystemPrompt);
  const variables = useWorkspaceStore((s) => s.variables);
  const setVariableValue = useWorkspaceStore((s) => s.setVariableValue);

  // Runtime parameters
  const model = useWorkspaceStore((s) => s.model);
  const setModel = useWorkspaceStore((s) => s.setModel);
  const temperature = useWorkspaceStore((s) => s.temperature);
  const setTemperature = useWorkspaceStore((s) => s.setTemperature);
  const topP = useWorkspaceStore((s) => s.topP);
  const setTopP = useWorkspaceStore((s) => s.setTopP);
  const maxOutputTokens = useWorkspaceStore((s) => s.maxOutputTokens);
  const setMaxOutputTokens = useWorkspaceStore((s) => s.setMaxOutputTokens);

  // Extract variables dynamically
  const parsedVariableKeys = useMemo(() => {
    const matches = promptContent.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g) || [];
    return Array.from(new Set(matches.map((m) => m.replace(/[{}]/g, ""))));
  }, [promptContent]);

  return (
    <div className="flex flex-col h-full bg-[#090b10] border-l border-[#1b1f27] text-zinc-300 text-xs select-none">
      {/* Inspector Header */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-[#1b1f27] bg-[#0d1017]/90">
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-zinc-200">RUNTIME INSPECTOR</span>
        </div>

        <button
          type="button"
          onClick={() => {
            setTemperature(0.35);
            setTopP(0.9);
            setMaxOutputTokens(2048);
          }}
          title="Reset runtime settings to defaults"
          className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[#161b24] transition-colors"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Inspector Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
        {/* Model Selection */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span>MODEL TARGET</span>
          </label>
          <div className="relative">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-[#121620] border border-[#202735] rounded px-2.5 py-1.5 text-zinc-200 text-xs font-mono focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
            >
              <option value="claude-3-7-sonnet-latest">claude-3-7-sonnet-latest</option>
              <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet-20241022</option>
              <option value="gpt-4o">gpt-4o (production)</option>
              <option value="deepseek-r1">deepseek-r1 (reasoning)</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash</option>
            </select>
            <ChevronRight className="w-3 h-3 text-zinc-500 absolute right-2.5 top-2.5 rotate-90 pointer-events-none" />
          </div>
        </div>

        {/* System Prompt Override */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              <span>SYSTEM PROMPT</span>
            </span>
            <span className="text-[10px] text-zinc-500">{systemPrompt.length} chars</span>
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={3}
            placeholder="Instruct runtime behaviors and constraints..."
            className="w-full bg-[#121620] border border-[#202735] rounded p-2 text-zinc-200 text-[11px] font-mono leading-relaxed placeholder:text-zinc-600 resize-none focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        {/* Runtime Sliders */}
        <div className="p-2.5 rounded bg-[#0d1017] border border-[#1b1f27] space-y-3.5">
          <div className="text-[10px] font-mono text-zinc-400 tracking-wider uppercase flex items-center justify-between pb-1 border-b border-[#1b1f27]">
            <span>Inference Hyperparameters</span>
            <Info className="w-2.5 h-2.5 text-zinc-500" />
          </div>

          {/* Temperature */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-400">Temperature</span>
              <span className="text-cyan-400 font-semibold">{temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1 bg-[#1a212d] rounded cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-zinc-600 font-mono">
              <span>Precise (0.0)</span>
              <span>Creative (1.0)</span>
            </div>
          </div>

          {/* Top-P */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-400">Top-P (Nucleus)</span>
              <span className="text-cyan-400 font-semibold">{topP.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={topP}
              onChange={(e) => setTopP(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1 bg-[#1a212d] rounded cursor-pointer"
            />
          </div>

          {/* Max Output Tokens */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-400">Max Output Tokens</span>
              <span className="text-cyan-400 font-semibold">{maxOutputTokens}</span>
            </div>
            <input
              type="range"
              min={256}
              max={8192}
              step={128}
              value={maxOutputTokens}
              onChange={(e) => setMaxOutputTokens(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-400 h-1 bg-[#1a212d] rounded cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-zinc-600 font-mono">
              <span>256 tokens</span>
              <span>8,192 tokens</span>
            </div>
          </div>
        </div>

        {/* Dynamic Variable Injection Fields */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Variable className="w-3 h-3 text-cyan-400" />
              <span>DYNAMIC VARIABLES</span>
            </span>
            <span className="px-1.5 py-0.5 rounded bg-[#161b24] text-[10px] text-cyan-300 font-mono">
              {parsedVariableKeys.length} active
            </span>
          </div>

          {parsedVariableKeys.length === 0 ? (
            <div className="p-3 text-center rounded border border-[#1b1f27] bg-[#0c0f16] text-[11px] text-zinc-500 italic">
              No &#123;&#123;variables&#125;&#125; in the current prompt template.
            </div>
          ) : (
            <div className="space-y-2">
              {parsedVariableKeys.map((key) => (
                <div key={key} className="space-y-1 bg-[#0c0f16] p-2 rounded border border-[#1b1f27]">
                  <label className="text-[10px] font-mono text-cyan-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>&#123;&#123;{key}&#125;&#125;</span>
                  </label>
                  <input
                    type="text"
                    value={variables[key] || ""}
                    onChange={(e) => setVariableValue(key, e.target.value)}
                    placeholder={`Enter value for ${key}...`}
                    className="w-full bg-[#121620] border border-[#202735] rounded px-2 py-1 text-zinc-200 text-[11px] font-mono focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
