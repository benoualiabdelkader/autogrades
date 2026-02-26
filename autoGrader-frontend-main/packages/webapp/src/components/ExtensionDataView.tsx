"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSyncAlt,
  faDownload,
  faFileCode,
  faTable,
  faLink,
  faCalendarAlt,
  faGlobe,
  faCube,
  faCopy,
  faCheck,
  faInbox,
} from "@fortawesome/free-solid-svg-icons";

type DataItem = {
  id?: string;
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

function groupByField(data: DataItem[]): Record<string, DataItem[]> {
  const grouped: Record<string, DataItem[]> = {};
  (data || []).forEach((item) => {
    const name = item.fieldName || "unknown";
    if (!grouped[name]) grouped[name] = [];
    grouped[name].push(item);
  });
  return grouped;
}

export default function ExtensionDataView() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "json">("table");
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scraper-data");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch");
      setPayload(json.payload || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const copyJson = () => {
    if (!payload) return;
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportJson = () => {
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extension-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = payload?.statistics;
  const dataItems = Array.isArray(payload?.data) ? payload.data : [];
  const grouped = groupByField(dataItems);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <FontAwesomeIcon icon={faCube as any} className="text-white text-xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-100 tracking-tight">
              بيانات الإضافة (Extension)
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              آخر بيانات مستخرجة من متصفحك عبر OnPage Scraper
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-600/50 transition-all disabled:opacity-50"
          >
            <FontAwesomeIcon
              icon={faSyncAlt as any}
              className={loading ? "animate-spin" : ""}
            />
            تحديث
          </button>
          <span className="text-slate-500 text-sm">
            {payload?.receivedAt || payload?.timestamp
              ? `آخر استلام: ${new Date(
                payload.receivedAt || payload.timestamp || ""
              ).toLocaleString("ar")}`
              : "لا توجد بيانات بعد"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("table")}
            className={`px-4 py-2 rounded-xl border transition-all flex items-center gap-2 ${viewMode === "table"
              ? "bg-primary/20 text-primary border-primary/40"
              : "bg-slate-800/50 text-slate-400 border-slate-600/50 hover:text-slate-200"
              }`}
          >
            <FontAwesomeIcon icon={faTable as any} />
            جدول
          </button>
          <button
            onClick={() => setViewMode("json")}
            className={`px-4 py-2 rounded-xl border transition-all flex items-center gap-2 ${viewMode === "json"
              ? "bg-primary/20 text-primary border-primary/40"
              : "bg-slate-800/50 text-slate-400 border-slate-600/50 hover:text-slate-200"
              }`}
          >
            <FontAwesomeIcon icon={faFileCode as any} />
            JSON
          </button>
          <button
            onClick={copyJson}
            disabled={!payload}
            className="p-2 rounded-xl bg-slate-800/50 text-slate-400 border border-slate-600/50 hover:text-slate-200 disabled:opacity-50 transition-all"
            title="نسخ JSON"
          >
            <FontAwesomeIcon icon={(copied ? faCheck : faCopy) as any} />
          </button>
          <button
            onClick={exportJson}
            disabled={!payload}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 disabled:opacity-50 transition-all"
          >
            <FontAwesomeIcon icon={faDownload as any} />
            تصدير JSON
          </button>
        </div>
      </div>

      {loading && !payload && (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <FontAwesomeIcon
            icon={faSyncAlt as any}
            className="text-4xl text-primary/60 animate-spin mb-4"
          />
          <p className="text-slate-400">جاري جلب البيانات...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">
          <p className="font-medium">تعذر تحميل البيانات</p>
          <p className="text-sm text-amber-200/80 mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && !payload && (
        <div className="glass-panel rounded-2xl p-16 text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-slate-800/80 flex items-center justify-center">
            <FontAwesomeIcon icon={faInbox as any} className="text-4xl text-slate-500" />
          </div>
          <h3 className="text-xl font-semibold text-slate-200 mb-2">
            لا توجد بيانات بعد
          </h3>
          <p className="text-slate-400 max-w-md mx-auto">
            استخدم إضافة المتصفح (OnPage Scraper) لاستخراج بيانات من أي صفحة، ثم اضغط
            &quot;استخراج وإرسال إلى AutoGrader&quot;. ستظهر البيانات هنا تلقائياً.
          </p>
        </div>
      )}

      {!loading && payload && (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="glass-panel rounded-2xl p-5 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <FontAwesomeIcon icon={faCube as any} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-100">
                    {stats?.totalItems ?? dataItems.length}
                  </p>
                  <p className="text-xs text-slate-500">عنصر</p>
                </div>
              </div>
            </div>
            <div className="glass-panel rounded-2xl p-5 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <FontAwesomeIcon icon={faTable as any} className="text-violet-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-100">
                    {stats?.totalFields ?? Object.keys(grouped).length}
                  </p>
                  <p className="text-xs text-slate-500">حقل</p>
                </div>
              </div>
            </div>
            <div className="glass-panel rounded-2xl p-5 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <FontAwesomeIcon icon={faGlobe as any} className="text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate" title={payload.url}>
                    {payload.url
                      ? (() => {
                        try {
                          const u = new URL(payload.url!);
                          if (u.protocol === "file:") return u.pathname.split("/").pop() || "ملف محلي";
                          return u.hostname || payload.url!.slice(0, 25) + "…";
                        } catch {
                          return String(payload.url).slice(0, 25) + (payload.url!.length > 25 ? "…" : "");
                        }
                      })()
                      : "—"}
                  </p>
                  <p className="text-xs text-slate-500">المصدر</p>
                </div>
              </div>
            </div>
            <div className="glass-panel rounded-2xl p-5 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <FontAwesomeIcon icon={faCalendarAlt as any} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    {payload.receivedAt || payload.timestamp
                      ? new Date(
                        payload.receivedAt || payload.timestamp || ""
                      ).toLocaleString("ar")
                      : "—"}
                  </p>
                  <p className="text-xs text-slate-500">وقت الاستلام</p>
                </div>
              </div>
            </div>
          </div>

          {/* Page title & URL */}
          {(payload.pageTitle || payload.url) && (
            <div className="glass-panel rounded-2xl p-5 mb-6 border border-slate-700/50 flex flex-wrap items-center gap-4">
              {payload.pageTitle && (
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faLink as any} className="text-slate-500" />
                  <span className="text-slate-300 font-medium">
                    {payload.pageTitle}
                  </span>
                </div>
              )}
              {payload.url && (
                <a
                  href={payload.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm truncate max-w-md"
                >
                  {payload.url}
                </a>
              )}
            </div>
          )}

          {/* Data content */}
          <div className="glass-panel rounded-2xl border border-slate-700/50 overflow-hidden">
            {viewMode === "table" ? (
              <div className="p-6 space-y-8">
                {Object.keys(grouped).length === 0 ? (
                  <p className="text-slate-500 text-center py-8">
                    لا توجد عناصر في هذه المجموعة.
                  </p>
                ) : (
                  Object.entries(grouped).map(([fieldName, items]) => (
                    <div key={fieldName}>
                      <h3 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
                        <span className="w-2 h-5 rounded-full bg-primary" />
                        {fieldName}
                        <span className="text-slate-500 font-normal text-sm">
                          ({items.length})
                        </span>
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 hover:border-primary/30 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
                                {item.type || "text"}
                              </span>
                              {item.name && (
                                <span className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]" title={item.name}>
                                  {item.name}
                                </span>
                              )}
                            </div>
                            <p className="text-slate-200 text-sm break-words leading-relaxed">
                              {String(item.value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="p-6">
                <pre className="text-sm text-slate-300 font-mono overflow-x-auto rounded-xl bg-slate-900/80 p-6 border border-slate-700/50">
                  {JSON.stringify(payload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
