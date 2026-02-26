import { useState, useCallback } from "react";

type PreviewRow = Record<string, unknown>;
type Stats = {
  totalStudents: number;
  totalCourses: number;
  activeSessions: number;
  averageGrade: number;
  simulated?: boolean;
};

const DB = {
  host: "127.0.0.1",
  port: "3307",
  database: "moodle",
  user: "root",
  password: "",
  prefix: "mdl_",
};

export function useDashboardData() {
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [previewError, setPreviewError] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState("");

  const runDbQuery = useCallback(async (query: string): Promise<PreviewRow[]> => {
    const res = await fetch("/api/moodle/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...DB, query }),
    });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || "Database query failed.");
    }
    return Array.isArray(data.data) ? (data.data as PreviewRow[]) : [];
  }, []);

  const fetchPreview = useCallback(
    async (query: string): Promise<PreviewRow[]> => {
      setLoadingPreview(true);
      setPreviewError("");
      try {
        const res = await fetch("/api/moodle/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...DB, query }),
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          setPreview([]);
          setPreviewError(data?.error || "Failed to load preview data.");
          return [];
        }
        const rows = Array.isArray(data.data) ? (data.data as PreviewRow[]) : [];
        setPreview(rows);
        return rows;
      } catch {
        setPreview([]);
        setPreviewError("Failed to load preview data.");
        return [];
      } finally {
        setLoadingPreview(false);
      }
    },
    []
  );

  const fetchStats = useCallback(async () => {
    setStatsError("");
    try {
      const params = new URLSearchParams({
        dbhost: DB.host,
        dbport: DB.port,
        dbname: DB.database,
        dbuser: DB.user,
        dbpass: DB.password,
        prefix: DB.prefix,
      });
      const res = await fetch(`/api/moodle/stats?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data?.stats) {
        setStats(null);
        setStatsError(data?.error || "Failed to load stats.");
        return;
      }
      setStats({
        totalStudents: Number(data.stats.totalStudents || 0),
        totalCourses: Number(data.stats.totalCourses || 0),
        activeSessions: Number(data.stats.activeSessions || 0),
        averageGrade: Number(data.stats.averageGrade || 0),
        simulated: Boolean(data.simulated),
      });
    } catch {
      setStats(null);
      setStatsError("Failed to load stats.");
    }
  }, []);

  return {
    preview,
    previewError,
    loadingPreview,
    stats,
    statsError,
    setPreview,
    runDbQuery,
    fetchPreview,
    fetchStats,
  };
}
