"use client";

import React, { createContext, useContext, useState, useMemo, useCallback } from "react";

export interface WorkspacePrompt {
  id: string;
  name: string;
  category: "customer-service" | "marketing" | "code" | "support" | "analytics";
  content: string;
  variables: Record<string, string>;
  systemPrompt: string;
}

export interface StreamMetrics {
  ttft: number | null; // ms
  totalLatency: number | null; // ms
  promptTokens: number;
  completionTokens: number;
  costEstimate: number; // USD
  status: "idle" | "connecting" | "streaming" | "completed" | "error" | "rate_limited";
  errorMessage?: string;
}

export interface HistoryLog {
  id: string;
  timestamp: string;
  promptSnippet: string;
  tokens: number;
  latency: number;
  status: string;
}

export interface WorkspaceState {
  leftSidebarOpen: boolean;
  rightInspectorOpen: boolean;
  toggleLeftSidebar: () => void;
  toggleRightInspector: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setRightInspectorOpen: (open: boolean) => void;

  activeWorkspaceId: string;
  activeWorkspaceName: string;
  setActiveWorkspace: (id: string, name: string) => void;

  templates: WorkspacePrompt[];
  activePromptId: string;
  promptContent: string;
  systemPrompt: string;
  variables: Record<string, string>;
  setPromptContent: (content: string) => void;
  setSystemPrompt: (prompt: string) => void;
  setVariableValue: (key: string, value: string) => void;
  selectTemplate: (id: string) => void;

  temperature: number;
  topP: number;
  maxOutputTokens: number;
  frequencyPenalty: number;
  presencePenalty: number;
  model: string;
  setTemperature: (val: number) => void;
  setTopP: (val: number) => void;
  setMaxOutputTokens: (val: number) => void;
  setFrequencyPenalty: (val: number) => void;
  setPresencePenalty: (val: number) => void;
  setModel: (model: string) => void;

  streamOutput: string;
  rawViewMode: boolean;
  autoScrollLocked: boolean;
  metrics: StreamMetrics;
  historyLogs: HistoryLog[];
  setRawViewMode: (raw: boolean) => void;
  setAutoScrollLocked: (lock: boolean) => void;
  appendStreamChunk: (chunk: string) => void;
  setStreamOutput: (output: string) => void;
  setMetrics: (metrics: Partial<StreamMetrics>) => void;
  resetStream: () => void;
  addHistoryLog: (log: {
    promptSnippet: string;
    tokens: number;
    latency: number;
    status: string;
  }) => void;
}

const DEFAULT_TEMPLATES: WorkspacePrompt[] = [
  {
    id: "tpl-1",
    name: "Customer Order Inquiry Resolver",
    category: "customer-service",
    systemPrompt:
      "You are ShopVault's senior e-commerce support concierge. Prioritize empathetic, ultra-concise, and accurate order resolutions.",
    content:
      "Review order #{{order_id}} for customer {{customer_name}}. Current shipment status is {{shipment_status}} with carrier {{carrier_name}}. Draft an immediate resolution response reassuring the customer and offering next steps.",
    variables: {
      order_id: "ORD-94821",
      customer_name: "Elena Rostova",
      shipment_status: "Out for Delivery",
      carrier_name: "BlueDart Express",
    },
  },
  {
    id: "tpl-2",
    name: "Product Description & SEO Generator",
    category: "marketing",
    systemPrompt:
      "You are a world-class luxury e-commerce copywriter with deep expertise in conversion rate optimization and technical SEO.",
    content:
      "Generate a compelling, high-converting product showcase for '{{product_title}}' priced at {{price_inr}}. Highlight key attributes: {{attributes}}. Include 3 SEO title tags, 1 meta description, and 5 search tags.",
    variables: {
      product_title: "Titanium Mechanical Chronograph",
      price_inr: "₹24,999",
      attributes:
        "Aerospace-grade titanium chassis, sapphire crystal, 100m water resistance, Japanese automatic movement",
    },
  },
  {
    id: "tpl-3",
    name: "Vendor Refund Risk Scoring",
    category: "analytics",
    systemPrompt:
      "You are a financial risk analyst engine evaluating e-commerce return requests against merchant dispute records.",
    content:
      "Evaluate refund claim for shop {{shop_name}}. Total disputed value: {{dispute_amount}}. Item condition on return: {{item_condition}}. Return reason: '{{return_reason}}'. Provide risk score (1-100) and recommendation.",
    variables: {
      shop_name: "Apex Electronics Hub",
      dispute_amount: "₹12,450",
      item_condition: "Opened original box, sealed warranty intact",
      return_reason: "Customer ordered incompatible voltage model",
    },
  },
  {
    id: "tpl-4",
    name: "Prisma Schema Optimization Review",
    category: "code",
    systemPrompt:
      "You are an elite PostgreSQL & Prisma ORM database architect specialized in high-concurrency multi-tenant systems.",
    content:
      "Analyze the indexing strategy for model '{{model_name}}'. Query load pattern: {{query_pattern}}. Table scale: {{table_rows}} rows. Recommend composite indexes and partitioning strategy.",
    variables: {
      model_name: "OrderItem",
      query_pattern:
        "Heavy write on order creation, high frequency reads filtered by [shopId, createdAt]",
      table_rows: "4.8 Million",
    },
  },
];

// Reactive singleton store with subscription hooks
type Listener = () => void;

class Store {
  private state: {
    leftSidebarOpen: boolean;
    rightInspectorOpen: boolean;
    activeWorkspaceId: string;
    activeWorkspaceName: string;
    templates: WorkspacePrompt[];
    activePromptId: string;
    promptContent: string;
    systemPrompt: string;
    variables: Record<string, string>;
    temperature: number;
    topP: number;
    maxOutputTokens: number;
    frequencyPenalty: number;
    presencePenalty: number;
    model: string;
    streamOutput: string;
    rawViewMode: boolean;
    autoScrollLocked: boolean;
    metrics: StreamMetrics;
    historyLogs: HistoryLog[];
  };

  private listeners = new Set<Listener>();

  constructor() {
    this.state = {
      leftSidebarOpen: true,
      rightInspectorOpen: true,
      activeWorkspaceId: "ws-primary",
      activeWorkspaceName: "ShopVault Production Cluster",
      templates: DEFAULT_TEMPLATES,
      activePromptId: "tpl-1",
      promptContent: DEFAULT_TEMPLATES[0].content,
      systemPrompt: DEFAULT_TEMPLATES[0].systemPrompt,
      variables: { ...DEFAULT_TEMPLATES[0].variables },
      temperature: 0.35,
      topP: 0.9,
      maxOutputTokens: 2048,
      frequencyPenalty: 0.1,
      presencePenalty: 0.05,
      model: "claude-3-7-sonnet-latest",
      streamOutput: "",
      rawViewMode: false,
      autoScrollLocked: true,
      metrics: {
        ttft: null,
        totalLatency: null,
        promptTokens: 0,
        completionTokens: 0,
        costEstimate: 0,
        status: "idle",
      },
      historyLogs: [
        {
          id: "log-1",
          timestamp: "10:42:15",
          promptSnippet: "Review order #ORD-94821 for customer Elena Rostova...",
          tokens: 412,
          latency: 840,
          status: "success",
        },
        {
          id: "log-2",
          timestamp: "10:31:02",
          promptSnippet: "Generate a compelling product showcase for Titanium Mechanical...",
          tokens: 685,
          latency: 1240,
          status: "success",
        },
        {
          id: "log-3",
          timestamp: "09:58:44",
          promptSnippet: "Evaluate refund claim for shop Apex Electronics Hub...",
          tokens: 380,
          latency: 710,
          status: "success",
        },
      ],
    };
  }

  getState() {
    return this.state;
  }

  setState(partial: Partial<typeof this.state> | ((prev: typeof this.state) => Partial<typeof this.state>)) {
    const next = typeof partial === "function" ? partial(this.state) : partial;
    this.state = { ...this.state, ...next };
    this.listeners.forEach((l) => l());
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

const storeInstance = new Store();

// Drop-in compatible hook matching Zustand `useWorkspaceStore((s) => s.foo)`
export function useWorkspaceStore<T>(selector: (state: WorkspaceState) => T): T {
  const [, setTick] = useState(0);

  React.useEffect(() => {
    return storeInstance.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  const raw = storeInstance.getState();

  const fullState: WorkspaceState = useMemo(() => {
    return {
      ...raw,
      toggleLeftSidebar: () =>
        storeInstance.setState((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
      toggleRightInspector: () =>
        storeInstance.setState((s) => ({ rightInspectorOpen: !s.rightInspectorOpen })),
      setLeftSidebarOpen: (open: boolean) => storeInstance.setState({ leftSidebarOpen: open }),
      setRightInspectorOpen: (open: boolean) => storeInstance.setState({ rightInspectorOpen: open }),
      setActiveWorkspace: (id: string, name: string) =>
        storeInstance.setState({ activeWorkspaceId: id, activeWorkspaceName: name }),
      setPromptContent: (content: string) => storeInstance.setState({ promptContent: content }),
      setSystemPrompt: (prompt: string) => storeInstance.setState({ systemPrompt: prompt }),
      setVariableValue: (key: string, value: string) =>
        storeInstance.setState((s) => ({
          variables: { ...s.variables, [key]: value },
        })),
      selectTemplate: (id: string) => {
        const tpl = storeInstance.getState().templates.find((t) => t.id === id);
        if (tpl) {
          storeInstance.setState({
            activePromptId: tpl.id,
            promptContent: tpl.content,
            systemPrompt: tpl.systemPrompt,
            variables: { ...tpl.variables },
          });
        }
      },
      setTemperature: (val: number) => storeInstance.setState({ temperature: val }),
      setTopP: (val: number) => storeInstance.setState({ topP: val }),
      setMaxOutputTokens: (val: number) => storeInstance.setState({ maxOutputTokens: val }),
      setFrequencyPenalty: (val: number) => storeInstance.setState({ frequencyPenalty: val }),
      setPresencePenalty: (val: number) => storeInstance.setState({ presencePenalty: val }),
      setModel: (model: string) => storeInstance.setState({ model }),
      setRawViewMode: (raw: boolean) => storeInstance.setState({ rawViewMode: raw }),
      setAutoScrollLocked: (lock: boolean) => storeInstance.setState({ autoScrollLocked: lock }),
      appendStreamChunk: (chunk: string) =>
        storeInstance.setState((s) => ({ streamOutput: s.streamOutput + chunk })),
      setStreamOutput: (output: string) => storeInstance.setState({ streamOutput: output }),
      setMetrics: (metrics: Partial<StreamMetrics>) =>
        storeInstance.setState((s) => ({ metrics: { ...s.metrics, ...metrics } })),
      resetStream: () =>
        storeInstance.setState({
          streamOutput: "",
          metrics: {
            ttft: null,
            totalLatency: null,
            promptTokens: 0,
            completionTokens: 0,
            costEstimate: 0,
            status: "idle",
          },
        }),
      addHistoryLog: (log: {
        promptSnippet: string;
        tokens: number;
        latency: number;
        status: string;
      }) =>
        storeInstance.setState((s) => ({
          historyLogs: [
            {
              id: `log-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              ...log,
            },
            ...s.historyLogs.slice(0, 19),
          ],
        })),
    };
  }, [raw]);

  return selector(fullState);
}
