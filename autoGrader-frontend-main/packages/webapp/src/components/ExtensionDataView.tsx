"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSyncAlt,
  faDownload,
  faFileCode,
  faTable,
  faInbox,
  faCube,
  faGlobe,
  faCalendarAlt,
  faSearch,
  faFilter,
  faChartBar,
  faCopy,
  faCheck,
  faExpand,
  faCompress,
  faLayerGroup,
  faBolt,
  faEye,
  faEyeSlash,
  faSort,
  faSortUp,
  faSortDown,
  faFileCsv,
  faClipboard,
  faDatabase,
  faMagic,
  faTags,
  faArrowRight,
  faArrowLeft,
  faChevronDown,
  faChevronUp,
  faChevronLeft,
  faExternalLinkAlt,
  faInfoCircle,
  faCheckCircle,
  faTimesCircle,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TYPES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type DataItem = {
  id?: string;
  name?: string;
  fieldName: string;
  value: string | number;
  type?: string;
  metadata?: Record<string, unknown>;
};

type Payload = {
  source?: string;
  url?: string;
  pageTitle?: string;
  data?: DataItem[];
  statistics?: {
    totalItems?: number;
    totalFields?: number;
    fieldCounts?: Record<string, number>;
  };
  metadata?: Record<string, unknown>;
  receivedAt?: string;
  timestamp?: string;
};

type ViewMode = "cards" | "table" | "json" | "analytics";
type SortDirection = "asc" | "desc" | "none";
type SortField = "fieldName" | "value" | "type";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// UTILITY FUNCTIONS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function groupByField(data: DataItem[]): Record<string, DataItem[]> {
  const grouped: Record<string, DataItem[]> = {};
  (data || []).forEach((item) => {
    const name = item.fieldName || "unknown";
    if (!grouped[name]) grouped[name] = [];
    grouped[name].push(item);
  });
  return grouped;
}

function getTypeColor(type?: string): string {
  const t = (type || "text").toLowerCase();
  const colorMap: Record<string, string> = {
    text: "from-blue-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30",
    number: "from-emerald-500/20 to-green-500/20 text-emerald-400 border-emerald-500/30",
    link: "from-violet-500/20 to-purple-500/20 text-violet-400 border-violet-500/30",
    url: "from-violet-500/20 to-purple-500/20 text-violet-400 border-violet-500/30",
    image: "from-pink-500/20 to-rose-500/20 text-pink-400 border-pink-500/30",
    email: "from-amber-500/20 to-yellow-500/20 text-amber-400 border-amber-500/30",
    date: "from-orange-500/20 to-red-500/20 text-orange-400 border-orange-500/30",
    html: "from-teal-500/20 to-emerald-500/20 text-teal-400 border-teal-500/30",
  };
  return colorMap[t] || "from-slate-500/20 to-gray-500/20 text-slate-400 border-slate-500/30";
}

function getTypeIcon(type?: string) {
  const t = (type || "text").toLowerCase();
  const iconMap: Record<string, any> = {
    text: faFileCode,
    number: faChartBar,
    link: faExternalLinkAlt,
    url: faGlobe,
    image: faEye,
    email: faCopy,
    date: faCalendarAlt,
  };
  return iconMap[t] || faCube;
}

function analyzeDataQuality(data: DataItem[]): {
  score: number;
  completeness: number;
  uniqueness: number;
  consistency: number;
} {
  if (!data || data.length === 0) return { score: 0, completeness: 0, uniqueness: 0, consistency: 0 };

  // Completeness: how many items have all fields filled
  const filledFields = data.filter(
    (item) => item.fieldName && item.value !== undefined && item.value !== ""
  ).length;
  const completeness = Math.round((filledFields / data.length) * 100);

  // Uniqueness: percentage of unique values
  const values = data.map((d) => String(d.value));
  const uniqueValues = new Set(values).size;
  const uniqueness = Math.round((uniqueValues / values.length) * 100);

  // Consistency: percentage of items with consistent type
  const types = data.map((d) => d.type || "text");
  const typeCount: Record<string, number> = {};
  types.forEach((t) => (typeCount[t] = (typeCount[t] || 0) + 1));
  const dominantType = Math.max(...Object.values(typeCount));
  const consistency = Math.round((dominantType / types.length) * 100);

  const score = Math.round((completeness + uniqueness + consistency) / 3);
  return { score, completeness, uniqueness, consistency };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SUB-COMPONENTS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AnimatedCounter({ value, suffix = "" }: { value: number | string; suffix?: string }) {
  const [displayed, setDisplayed] = useState(0);
  const numValue = typeof value === "number" ? value : parseInt(String(value)) || 0;

  useEffect(() => {
    if (typeof value !== "number") return;
    let start = 0;
    const duration = 800;
    const step = Math.ceil(numValue / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= numValue) {
        setDisplayed(numValue);
        clearInterval(timer);
      } else {
        setDisplayed(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [numValue, value]);

  if (typeof value === "string") return <span>{value}</span>;
  return (
    <span>
      {displayed}
      {suffix}
    </span>
  );
}

function QualityMeter({ score, label }: { score: number; label: string }) {
  const getColor = () => {
    if (score >= 80) return "from-emerald-500 to-green-400";
    if (score >= 60) return "from-amber-500 to-yellow-400";
    if (score >= 40) return "from-orange-500 to-amber-400";
    return "from-red-500 to-rose-400";
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        <span className="text-xs font-bold text-slate-300">{score}%</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${getColor()} transition-all duration-1000 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function CopyButton({ text, label = "Ù†Ø³Ø®" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${copied
        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
        : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20"
        }`}
    >
      <FontAwesomeIcon icon={(copied ? faCheck : faCopy) as any} className="text-[10px]" />
      {copied ? "تم النسخ!" : label}
    </button>
  );
}

function ToastNotification({
  message,
  type = "success",
  visible,
}: {
  message: string;
  type?: "success" | "error" | "info";
  visible: boolean;
}) {
  const colors = {
    success: "from-emerald-500/20 to-green-500/20 border-emerald-500/30 text-emerald-400",
    error: "from-red-500/20 to-rose-500/20 border-red-500/30 text-red-400",
    info: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400",
  };

  const icons = {
    success: faCheckCircle,
    error: faTimesCircle,
    info: faInfoCircle,
  };

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"
        }`}
    >
      <div
        className={`flex items-center gap-3 px-5 py-3 rounded-2xl border bg-gradient-to-r backdrop-blur-xl ${colors[type]}`}
      >
        <FontAwesomeIcon icon={icons[type] as any} />
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MAIN COMPONENT
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function ExtensionDataView() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("fieldName");
  const [sortDir, setSortDir] = useState<SortDirection>("none");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as "success" | "error" | "info" });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Toast helper
  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }, []);


  // â”€â”€ Data Fetching â”€â”€
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch("/api/scraper-data");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch");

      const newPayload = json.payload || null;

      // If this is a silent poll, detect new data
      if (silent && newPayload?.data && !payload?.data) {
        showToast("New data received from extension!", "info");
      }

      setPayload(newPayload);
      if (newPayload?.data) {
        const groups = Object.keys(groupByField(newPayload.data));
        setExpandedGroups(new Set(groups.slice(0, 3)));
      }
    } catch (e) {
      if (!silent) {
        setError(e instanceof Error ? e.message : "Unknown error");
        setPayload(null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [payload, showToast]);

  // Initial fetch on mount
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-poll every 5 seconds for new extension data
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // â”€â”€ Actions â”€â”€
  const copyJson = async () => {
    if (!payload) return;
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    showToast("تم نسخ JSON بنجاح!", "success");
  };

  const exportJson = () => {
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extension-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("ØªÙ… ØªØµØ¯ÙŠØ± Ø§Ù„Ù…Ù„Ù Ø¨ØµÙŠØºØ© JSON", "success");
  };

  const exportCsv = () => {
    if (!payload?.data) return;
    const headers = ["Field Name", "Value", "Type", "Name", "ID"];
    const rows = payload.data.map((item) => [
      item.fieldName,
      String(item.value).replace(/"/g, '""'),
      item.type || "text",
      item.name || "",
      item.id || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extension-data-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("ØªÙ… ØªØµØ¯ÙŠØ± Ø§Ù„Ù…Ù„Ù Ø¨ØµÙŠØºØ© CSV", "success");
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  // â”€â”€ Derived Data â”€â”€
  const dataItems = useMemo(() => (Array.isArray(payload?.data) ? payload!.data : []), [payload]);

  const allTypes = useMemo(() => {
    const types = new Set(dataItems.map((d) => d.type || "text"));
    return ["all", ...Array.from(types)];
  }, [dataItems]);

  const filteredData = useMemo(() => {
    let items = [...dataItems];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.fieldName?.toLowerCase().includes(q) ||
          String(item.value).toLowerCase().includes(q) ||
          item.name?.toLowerCase().includes(q) ||
          item.type?.toLowerCase().includes(q)
      );
    }

    // Type filter
    if (selectedType !== "all") {
      items = items.filter((item) => (item.type || "text") === selectedType);
    }

    // Sorting
    if (sortDir !== "none") {
      items.sort((a, b) => {
        const aVal = String(a[sortField] || "");
        const bVal = String(b[sortField] || "");
        const cmp = aVal.localeCompare(bVal);
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return items;
  }, [dataItems, searchQuery, selectedType, sortField, sortDir]);

  const grouped = useMemo(() => groupByField(filteredData), [filteredData]);
  const quality = useMemo(() => analyzeDataQuality(dataItems), [dataItems]);
  const stats = payload?.statistics;

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "none" ? "asc" : d === "asc" ? "desc" : "none"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const expandAll = () => setExpandedGroups(new Set(Object.keys(grouped)));
  const collapseAll = () => setExpandedGroups(new Set());

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // RENDER
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div ref={containerRef} className="max-w-[1600px] mx-auto space-y-6" dir="rtl">
      {/* Toast */}
      <ToastNotification message={toast.message} type={toast.type} visible={toast.visible} />

      {/* â•â•â•â•â•â•â• HERO HEADER â•â•â•â•â•â•â• */}
      <header className="relative overflow-hidden rounded-3xl border border-white/[0.06]" style={{ animationDelay: "0s" }}>
        {/* Ambient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-violet-600/5 to-cyan-600/10" />
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl" />

        <div className="relative p-8">
          <div className="flex items-start justify-between gap-6">
            {/* Left: Title block */}
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-xl shadow-blue-500/20 ring-1 ring-white/10">
                <FontAwesomeIcon icon={faCube as any} className="text-white text-2xl" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">
                  <span className="bg-gradient-to-r from-white via-blue-100 to-blue-300 bg-clip-text text-transparent">
                    مركز بيانات الإضافة
                  </span>
                </h1>
                <p className="text-sm text-slate-400 mt-1.5 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  البيانات المستخرجة عبر OnPage Scraper Extension
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => fetchData()}
                disabled={loading}
                className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all duration-300 text-sm font-medium disabled:opacity-50"
              >
                <FontAwesomeIcon
                  icon={faSyncAlt as any}
                  className={`text-xs transition-transform group-hover:rotate-180 duration-500 ${loading ? "animate-spin" : ""
                    }`}
                />
                تحديث
              </button>
              {payload && (
                <>
                  <button
                    onClick={copyJson}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all duration-300 text-sm font-medium"
                  >
                    <FontAwesomeIcon icon={faClipboard as any} className="text-xs" />
                    نسخ JSON
                  </button>
                  <div className="relative group">
                    <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:brightness-110 transition-all duration-300 text-sm font-bold">
                      <FontAwesomeIcon icon={faDownload as any} className="text-xs" />
                      تصدير
                      <FontAwesomeIcon icon={faChevronDown as any} className="text-[10px] ml-1" />
                    </button>
                    <div className="absolute left-0 top-full mt-2 w-48 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <button
                        onClick={exportJson}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors rounded-t-xl text-right"
                      >
                        <FontAwesomeIcon icon={faFileCode as any} className="text-blue-400 w-4" />
                        تصدير JSON
                      </button>
                      <button
                        onClick={exportCsv}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors rounded-b-xl text-right"
                      >
                        <FontAwesomeIcon icon={faFileCsv as any} className="text-emerald-400 w-4" />
                        تصدير CSV
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={toggleFullscreen}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white transition-all duration-300"
                    title={isFullscreen ? "تصغير" : "تكبير"}
                  >
                    <FontAwesomeIcon icon={(isFullscreen ? faCompress : faExpand) as any} className="text-xs" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* â•â•â•â•â•â•â• LOADING STATE â•â•â•â•â•â•â• */}
      {loading && !payload && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
            ))}
          </div>
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
            ))}
          </div>
        </div>
      )}

      {/* â•â•â•â•â•â•â• ERROR STATE â•â•â•â•â•â•â• */}
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-500/10 to-rose-500/10 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <FontAwesomeIcon icon={faExclamationTriangle as any} className="text-red-400 text-lg" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-400">تعذر تحميل البيانات</h3>
            <p className="text-sm text-red-300/70 mt-1">{error}</p>
          </div>
          <button
            onClick={() => fetchData()}
            className="mr-auto px-4 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all text-sm font-medium"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* â•â•â•â•â•â•â• EMPTY STATE â•â•â•â•â•â•â• */}
      {!loading && !error && !payload && (
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-16 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-violet-500/5" />
          <div className="relative">
            {/* Animated empty icon */}
            <div className="relative mx-auto w-28 h-28 mb-8">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/10 to-violet-500/10 animate-pulse" />
              <div className="absolute inset-2 rounded-full bg-slate-900/80 flex items-center justify-center">
                <FontAwesomeIcon icon={faInbox as any} className="text-4xl text-slate-600" />
              </div>
              {/* Orbiting dots */}
              <div className="absolute inset-0 animate-spin" style={{ animationDuration: "8s" }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-500/40" />
              </div>
              <div className="absolute inset-0 animate-spin" style={{ animationDuration: "12s", animationDirection: "reverse" }}>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-violet-500/40" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-300 mb-3">لا توجد بيانات بعد</h2>
            <p className="text-slate-500 max-w-md mx-auto leading-relaxed mb-8">
              Ø§Ø³ØªØ®Ø¯Ù… Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ù…ØªØµÙØ­{" "}
              استخدم إضافة المتصفح <span className='text-blue-400 font-semibold'>OnPage Scraper</span> لاستخراج بيانات ذكية من أي صفحة ويب
            </p>

            {/* Steps */}
            <div className="flex items-center justify-center gap-4 text-sm">
              {[
                { icon: faBolt, text: 'تثبيت الإضافة' },
                { icon: faGlobe, text: 'فتح صفحة ويب' },
                { icon: faMagic, text: "استخراج البيانات" },
              ].map((step, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <FontAwesomeIcon icon={faArrowLeft as any} className="text-slate-700 text-xs" />}
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400">
                    <FontAwesomeIcon icon={step.icon as any} className="text-blue-400 text-xs" />
                    <span>{step.text}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* â•â•â•â•â•â•â• DATA VIEW â•â•â•â•â•â•â• */}
      {!loading && payload && (
        <>
          {/* â”€â”€ Statistics Cards â”€â”€ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: faCube,
                label: "إجمالي العناصر",
                value: stats?.totalItems ?? dataItems.length,
                gradient: "from-blue-600 to-cyan-500",
                glow: "shadow-blue-500/20",
              },
              {
                icon: faLayerGroup,
                label: "عدد الحقول",
                value: stats?.totalFields ?? Object.keys(grouped).length,
                gradient: "from-violet-600 to-purple-500",
                glow: "shadow-violet-500/20",
              },
              {
                icon: faGlobe,
                label: "المصدر",
                value: payload.url ? (() => { try { return new URL(payload.url).hostname; } catch { return "-"; } })() : "-",
                gradient: "from-emerald-600 to-green-500",
                glow: "shadow-emerald-500/20",
                isText: true,
              },
              {
                icon: faCalendarAlt,
                label: "وقت الاستلام",
                value:
                  payload.receivedAt || payload.timestamp
                    ? new Date(payload.receivedAt || payload.timestamp || "").toLocaleTimeString("ar")
                    : "-",
                gradient: "from-orange-600 to-amber-500",
                glow: "shadow-orange-500/20",
                isText: true,
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent p-5 transition-all duration-500 hover:border-white/[0.12] hover:shadow-xl"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${stat.gradient} opacity-10 group-hover:opacity-20 transition-opacity blur-xl`} />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-2">{stat.label}</p>
                    <p className={`font-bold tracking-tight ${stat.isText ? "text-lg text-slate-200" : "text-3xl text-white"}`}>
                      {stat.isText ? (
                        <span className="truncate block max-w-[140px]">{String(stat.value)}</span>
                      ) : (
                        <AnimatedCounter value={stat.value as number} />
                      )}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg ${stat.glow} ring-1 ring-white/10`}>
                    <FontAwesomeIcon icon={stat.icon as any} className="text-white text-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* â”€â”€ Page Info + Quality Bar â”€â”€ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Page Info */}
            {(payload.pageTitle || payload.url) && (
              <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.03] to-white/[0.01] p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <FontAwesomeIcon icon={faGlobe as any} className="text-blue-400 text-sm" />
                  </div>
                  <span className="text-xs text-slate-500 font-medium">ØµÙØ­Ø© Ø§Ù„Ù…ØµØ¯Ø±</span>
                </div>
                {payload.pageTitle && (
                  <h3 className="text-lg font-bold text-slate-200 mb-2">{payload.pageTitle}</h3>
                )}
                {payload.url && (
                  <a
                    href={payload.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400/80 hover:text-blue-400 transition-colors hover:underline underline-offset-4 block truncate"
                    dir="ltr"
                  >
                    {payload.url}
                  </a>
                )}
              </div>
            )}

            {/* Data Quality */}
            <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faChartBar as any} className="text-violet-400 text-sm" />
                  <span className="text-sm font-bold text-slate-300">جودة البيانات</span>
                </div>
                <span
                  className={`text-2xl font-black ${quality.score >= 80 ? "text-emerald-400" : quality.score >= 60 ? "text-amber-400" : "text-red-400"
                    }`}
                >
                  {quality.score}%
                </span>
              </div>
              <div className="space-y-3">
                <QualityMeter score={quality.completeness} label="الاكتمال" />
                <QualityMeter score={quality.uniqueness} label="التنوع" />
                <QualityMeter score={quality.consistency} label="الاتساق" />
              </div>
            </div>
          </div>

          {/* â”€â”€ Toolbar â”€â”€ */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[260px]">
              <FontAwesomeIcon
                icon={faSearch as any}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ø¨Ø­Ø« ÙÙŠ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª..."
                className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.06] transition-all"
                dir="rtl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors text-xs"
                >
                  âœ•
                </button>
              )}
            </div>

            {/* Type Filter */}
            <div className="relative">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="appearance-none px-4 py-2.5 pr-8 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-slate-300 focus:outline-none focus:border-blue-500/40 transition-all cursor-pointer"
                dir="rtl"
              >
                {allTypes.map((t) => (
                  <option key={t} value={t} className="bg-slate-900">
                    {t === "all" ? "كل الأنواع" : t}
                  </option>
                ))}
              </select>
              <FontAwesomeIcon
                icon={faFilter as any}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none"
              />
            </div>

            {/* View Mode Tabs */}
            <div className="flex items-center rounded-xl bg-white/[0.03] border border-white/[0.06] p-1 gap-0.5">
              {(
                [
                  { mode: "cards" as ViewMode, icon: faCube, label: "Ø¨Ø·Ø§Ù‚Ø§Øª" },
                  { mode: "table" as ViewMode, icon: faTable, label: "Ø¬Ø¯ÙˆÙ„" },
                  { mode: "json" as ViewMode, icon: faFileCode, label: "JSON" },
                  { mode: "analytics" as ViewMode, icon: faChartBar, label: "ØªØ­Ù„ÙŠÙ„" },
                ] as const
              ).map(({ mode, icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-300 ${viewMode === mode
                    ? "bg-gradient-to-r from-blue-600/80 to-violet-600/80 text-white shadow-lg shadow-blue-500/10"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                    }`}
                >
                  <FontAwesomeIcon icon={icon as any} className="text-[10px]" />
                  {label}
                </button>
              ))}
            </div>

            {/* Extra controls */}
            {viewMode === "cards" && Object.keys(grouped).length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={expandAll}
                  className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all text-xs"
                  title="توسيع الكل"
                >
                  <FontAwesomeIcon icon={faEye as any} />
                </button>
                <button
                  onClick={collapseAll}
                  className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all text-xs"
                  title="طي الكل"
                >
                  <FontAwesomeIcon icon={faEyeSlash as any} />
                </button>
              </div>
            )}
          </div>

          {/* Filter indicator */}
          {(searchQuery || selectedType !== "all") && (
            <div className="flex flex-row-reverse items-center gap-2 text-xs text-slate-500">
              <FontAwesomeIcon icon={faFilter as any} />
              <span>
                عرض {filteredData.length} من {dataItems.length} عنصر
              </span>
              {searchQuery && (
                <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  &ldquo;{searchQuery}&rdquo;
                </span>
              )}
              {selectedType !== "all" && (
                <span className="px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  {selectedType}
                </span>
              )}
            </div>
          )}

          {/* â”€â”€ No Results â”€â”€ */}
          {filteredData.length === 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
              <FontAwesomeIcon icon={faSearch as any} className="text-3xl text-slate-700 mb-4" />
              <p className="text-slate-500">لا توجد نتائج مطابقة</p>
            </div>
          )}

          {/* â•â•â•â•â•â•â• CARDS VIEW â•â•â•â•â•â•â• */}
          {viewMode === "cards" && filteredData.length > 0 && (
            <div className="space-y-4">
              {Object.entries(grouped).map(([fieldName, items], gIdx) => {
                const isExpanded = expandedGroups.has(fieldName);
                return (
                  <div
                    key={fieldName}
                    className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent overflow-hidden transition-all duration-300"
                    style={{ animationDelay: `${gIdx * 0.05}s` }}
                  >
                    {/* Group header */}
                    <button
                      onClick={() => toggleGroup(fieldName)}
                      className="w-full flex items-center justify-between gap-4 p-5 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-white/[0.06] flex items-center justify-center">
                          <FontAwesomeIcon icon={faTags as any} className="text-blue-400 text-sm" />
                        </div>
                        <div className="text-right">
                          <h3 className="text-base font-bold text-slate-200">{fieldName}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {items.length} Ø¹Ù†ØµØ± â€¢ {Array.from(new Set(items.map((i) => i.type || "text"))).join(", ")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold">
                          {items.length}
                        </span>
                        <FontAwesomeIcon
                          icon={(isExpanded ? faChevronUp : faChevronDown) as any}
                          className="text-slate-500 text-xs transition-transform duration-300"
                        />
                      </div>
                    </button>

                    {/* Group content */}
                    <div
                      className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                        }`}
                    >
                      <div className="p-5 pt-0 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((item, itemIdx) => (
                          <div
                            key={item.id || itemIdx}
                            className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300 overflow-hidden"
                          >
                            {/* Type indicator bar */}
                            <div className={`absolute top-0 right-0 w-1 h-full bg-gradient-to-b ${getTypeColor(item.type).split(" ")[0]} ${getTypeColor(item.type).split(" ")[1]}`} />

                            <div className="p-4 pr-5">
                              <div className="flex items-center justify-between mb-3">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border bg-gradient-to-r ${getTypeColor(
                                    item.type
                                  )}`}
                                >
                                  <FontAwesomeIcon icon={getTypeIcon(item.type) as any} className="text-[9px]" />
                                  {item.type || "text"}
                                </span>
                                <CopyButton text={String(item.value)} label="" />
                              </div>
                              {item.name && (
                                <p className="text-[11px] text-slate-500 mb-1.5 truncate">{item.name}</p>
                              )}
                              <p className="text-sm text-slate-200 leading-relaxed break-words line-clamp-3">
                                {String(item.value)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* â•â•â•â•â•â•â• TABLE VIEW â•â•â•â•â•â•â• */}
          {viewMode === "table" && filteredData.length > 0 && (
            <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="text-right px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">#</th>
                      {(
                        [
                          { field: "fieldName" as SortField, label: "اسم الحقل" },
                          { field: "value" as SortField, label: "القيمة" },
                          { field: "type" as SortField, label: "النوع" },
                        ] as const
                      ).map(({ field, label }) => (
                        <th
                          key={field}
                          onClick={() => toggleSort(field)}
                          className="text-right px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors select-none"
                        >
                          <div className="inline-flex items-center gap-2">
                            {label}
                            <FontAwesomeIcon
                              icon={(
                                (sortField === field
                                  ? sortDir === "asc"
                                    ? faSortUp
                                    : sortDir === "desc"
                                      ? faSortDown
                                      : faSort
                                  : faSort) as any
                              ) as any}
                              className={`text-[10px] ${sortField === field && sortDir !== "none" ? "text-blue-400" : "text-slate-600"}`}
                            />
                          </div>
                        </th>
                      ))}
                      <th className="text-right px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredData.map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-5 py-4 text-xs text-slate-600 font-mono">{idx + 1}</td>
                        <td className="px-5 py-4">
                          <span className="text-sm font-semibold text-slate-300">{item.fieldName}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-slate-400 max-w-xs truncate block">{String(item.value)}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border bg-gradient-to-r ${getTypeColor(
                              item.type
                            )}`}
                          >
                            <FontAwesomeIcon icon={getTypeIcon(item.type) as any} className="text-[9px]" />
                            {item.type || "text"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <CopyButton text={String(item.value)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Table footer */}
              <div className="px-5 py-3 border-t border-white/[0.04] bg-white/[0.02] flex items-center justify-between text-xs text-slate-500">
                <span>Ø¥Ø¬Ù…Ø§Ù„ÙŠ: {filteredData.length} Ø¹Ù†ØµØ±</span>
                <span>{Object.keys(grouped).length} Ø­Ù‚Ù„ ÙØ±ÙŠØ¯</span>
              </div>
            </div>
          )}

          {/* â•â•â•â•â•â•â• JSON VIEW â•â•â•â•â•â•â• */}
          {viewMode === "json" && (
            <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faFileCode as any} className="text-blue-400 text-sm" />
                  <span className="text-sm font-bold text-slate-300">Ø¹Ø±Ø¶ JSON</span>
                </div>
                <CopyButton text={JSON.stringify(payload, null, 2)} label="Ù†Ø³Ø® Ø§Ù„ÙƒÙ„" />
              </div>
              <div className="relative">
                <pre
                  className="text-sm font-mono p-6 overflow-x-auto text-slate-400 leading-relaxed max-h-[600px] overflow-y-auto"
                  dir="ltr"
                  style={{ tabSize: 2 }}
                >
                  {JSON.stringify(payload, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* â•â•â•â•â•â•â• ANALYTICS VIEW â•â•â•â•â•â•â• */}
          {viewMode === "analytics" && (
            <div className="space-y-4">
              {/* Field Distribution */}
              <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-6">
                <div className="flex items-center gap-2 mb-6">
                  <FontAwesomeIcon icon={faChartBar as any} className="text-violet-400" />
                  <h3 className="text-lg font-bold text-slate-200">ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ø­Ù‚ÙˆÙ„</h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(grouped)
                    .sort(([, a], [, b]) => b.length - a.length)
                    .map(([fieldName, items]) => {
                      const pct = Math.round((items.length / filteredData.length) * 100);
                      return (
                        <div key={fieldName} className="group">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm text-slate-300 font-medium">{fieldName}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-500">{items.length} Ø¹Ù†ØµØ±</span>
                              <span className="text-xs font-bold text-slate-400">{pct}%</span>
                            </div>
                          </div>
                          <div className="h-2 bg-slate-800/60 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-500 transition-all duration-700 ease-out"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Type Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <FontAwesomeIcon icon={faTags as any} className="text-cyan-400" />
                    <h3 className="text-lg font-bold text-slate-200">ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ø£Ù†ÙˆØ§Ø¹</h3>
                  </div>
                  <div className="space-y-2">
                    {(() => {
                      const typeCounts: Record<string, number> = {};
                      filteredData.forEach((d) => {
                        const t = d.type || "text";
                        typeCounts[t] = (typeCounts[t] || 0) + 1;
                      });
                      return Object.entries(typeCounts)
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, count]) => (
                          <div
                            key={type}
                            className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                          >
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border bg-gradient-to-r ${getTypeColor(
                                type
                              )}`}
                            >
                              <FontAwesomeIcon icon={getTypeIcon(type) as any} className="text-[9px]" />
                              {type}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-300">{count}</span>
                              <span className="text-xs text-slate-600">
                                ({Math.round((count / filteredData.length) * 100)}%)
                              </span>
                            </div>
                          </div>
                        ));
                    })()}
                  </div>
                </div>

                {/* Data Summary */}
                <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <FontAwesomeIcon icon={faDatabase as any} className="text-emerald-400" />
                    <h3 className="text-lg font-bold text-slate-200">Ù…Ù„Ø®Øµ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: "Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¹Ù†Ø§ØµØ±", value: filteredData.length, icon: faCube },
                      { label: "Ø­Ù‚ÙˆÙ„ ÙØ±ÙŠØ¯Ø©", value: Object.keys(grouped).length, icon: faLayerGroup },
                      { label: "Ø£Ù†ÙˆØ§Ø¹ Ù…Ø®ØªÙ„ÙØ©", value: allTypes.length - 1, icon: faTags },
                      {
                        label: "Ù…ØªÙˆØ³Ø· Ø·ÙˆÙ„ Ø§Ù„Ù‚ÙŠÙ…Ø©",
                        value: Math.round(
                          filteredData.reduce((sum, d) => sum + String(d.value).length, 0) / Math.max(filteredData.length, 1)
                        ),
                        icon: faChartBar,
                        suffix: " Ø­Ø±Ù",
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                      >
                        <div className="flex items-center gap-3">
                          <FontAwesomeIcon icon={item.icon as any} className="text-slate-500 text-sm" />
                          <span className="text-sm text-slate-400">{item.label}</span>
                        </div>
                        <span className="text-lg font-bold text-slate-200">
                          {item.value}
                          {item.suffix || ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* â•â•â•â•â•â•â• SCOPED STYLES â•â•â•â•â•â•â• */}
      {/* @ts-ignore */}
      <style jsx>{`
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        table {
          border-collapse: separate;
          border-spacing: 0;
        }

        pre::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        pre::-webkit-scrollbar-track {
          background: transparent;
        }

        pre::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        pre::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        select option {
          background: #0f172a;
          color: #cbd5e1;
        }
      `}</style>
    </div>
  );
}

