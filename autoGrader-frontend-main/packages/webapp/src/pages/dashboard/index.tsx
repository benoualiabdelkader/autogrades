"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faCheckCircle,
  faCog,
  faDatabase,
  faExclamationTriangle,
  faFilter,
  faFileCode,
  faGraduationCap,
  faPaperPlane,
  faPlay,
  faPlus,
  faSignal,
  faSpinner,
  faTasks,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import RealWorkflowModal from "@/components/RealWorkflowModal";
import ExtensionDataView from "@/components/ExtensionDataView";
import { WorkflowRegistry } from "@/lib/n8n/WorkflowRegistry";
import type { TaskInput } from "@/lib/n8n/WorkflowGenerator";

type Task = {
  id: number;
  title: string;
  description: string;
  prompt: string;
  icon: string;
  dataSource: string;
  active: boolean;
  isCustom?: boolean;
};
type NewTaskForm = { title: string; description: string; prompt: string; icon: string };

type PreviewRow = Record<string, unknown>;
type ChatMessage = { role: "ai" | "user"; content: string; time: string };
type Stats = { totalStudents: number; totalCourses: number; activeSessions: number; averageGrade: number; simulated?: boolean };
type StudentOverview = {
  studentId: number;
  studentName: string;
  email: string;
  coursesEnrolled: number;
  averageGrade: number;
  submissionsCount: number;
  lastAccessUnix: number;
};
type StudentInsight = {
  overview: StudentOverview | null;
  recentGrades: Array<Record<string, unknown>>;
  recentActivity: Array<Record<string, unknown>>;
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
  inactivityDays: number;
  notes: string[];
};

const TASKS_KEY = "autograder.customTasks.v1";
const OUTPUT_KEY = "autograder.dashboard.outputDraft.v1";
const DB = { host: "127.0.0.1", port: "3307", database: "moodle", user: "root", password: "", prefix: "mdl_" };

const BASE_TASKS: Task[] = [
  { id: 1, title: "Grade Assignments", description: "AI grading for submissions", prompt: "Grade student submissions and return concise feedback.", icon: "GRD", dataSource: "mdl_assign_submission", active: true },
  { id: 2, title: "Generate Rubric", description: "Create rubric criteria and levels", prompt: "Generate clear rubric criteria with levels and points.", icon: "RUB", dataSource: "mdl_assign", active: true },
  { id: 3, title: "Student Analytics", description: "Risk and performance analysis", prompt: "Analyze student performance and provide recommendations.", icon: "ANA", dataSource: "mdl_user", active: true },
  { id: 4, title: "Generate Feedback", description: "Personalized feedback drafts", prompt: "Generate constructive personalized feedback.", icon: "FDB", dataSource: "mdl_user", active: true },
];

const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const normalize = (v: string) => v.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const cell = (v: unknown) => (v === null || v === undefined ? "-" : typeof v === "object" ? JSON.stringify(v) : String(v));
const formatUnixDate = (unix: number) =>
  unix > 0 ? new Date(unix * 1000).toLocaleString() : "No recent activity";
const humanizeKey = (key: string) =>
  key
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
const numericValue = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function DashboardPage() {
  const registry = useMemo(() => WorkflowRegistry.getInstance(), []);

  const [tasks, setTasks] = useState<Task[]>(BASE_TASKS);
  const [selectedTaskId, setSelectedTaskId] = useState(BASE_TASKS[0].id);
  const [taskFilter, setTaskFilter] = useState("");

  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [previewError, setPreviewError] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [previewFilter, setPreviewFilter] = useState("");

  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState("");
  const [studentInsight, setStudentInsight] = useState<StudentInsight | null>(null);
  const [studentInsightLoading, setStudentInsightLoading] = useState(false);
  const [studentInsightError, setStudentInsightError] = useState("");

  const [runTaskState, setRunTaskState] = useState<Task | null>(null);
  const [openRunModal, setOpenRunModal] = useState(false);

  const [reviewPrompt, setReviewPrompt] = useState("Review selected student data for an English teacher. Return score /100, strengths, improvements, and final feedback.");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [outputDraft, setOutputDraft] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");
  const [newTask, setNewTask] = useState<NewTaskForm>({ title: "", description: "", prompt: "", icon: "CUS" });

  const [chatInput, setChatInput] = useState("");
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "ai", content: 'Welcome teacher. You can control the full dashboard from chat. Try: "help commands".', time: "" },
  ]);

  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedTaskId) || null, [tasks, selectedTaskId]);
  const selectedRowData = useMemo(() => (selectedRow === null ? null : preview[selectedRow] || null), [preview, selectedRow]);
  const readyCount = useMemo(() => tasks.filter((t) => registry.hasWorkflow(t.id)).length, [tasks, registry]);
  const filteredTasks = useMemo(() => {
    const q = normalize(taskFilter);
    if (!q) return tasks;
    return tasks.filter((t) => normalize(`${t.title} ${t.description}`).includes(q));
  }, [taskFilter, tasks]);
  const filteredPreview = useMemo(() => {
    const q = normalize(previewFilter);
    const indexed = preview.map((row, index) => ({ row, index }));
    if (!q) return indexed;
    return indexed.filter(({ row }) =>
      Object.values(row).some((value) => normalize(cell(value)).includes(q))
    );
  }, [preview, previewFilter]);

  const saveCustomTasks = useCallback((list: Task[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(TASKS_KEY, JSON.stringify(list.filter((t) => t.isCustom)));
  }, []);

  useEffect(() => {
    // Set initial assistant message time on the client only to avoid SSR/CSR time mismatch
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === "ai" && !prev[0].time) {
        return [{ ...prev[0], time: now() }];
      }
      return prev;
    });
  }, []);

  const appendAI = useCallback((content: string) => {
    setMessages((m) => [...m, { role: "ai", content, time: now() }]);
  }, []);

  const queryFor = useCallback(
    (task: Task): string => {
      if (task.id === 1) return "SELECT u.id as student_id, CONCAT(u.firstname,' ',u.lastname) as student_name, a.name as assignment_name, s.id as submission_id, FROM_UNIXTIME(s.timemodified) as submission_date, s.status FROM mdl_user u JOIN mdl_assign_submission s ON u.id=s.userid JOIN mdl_assign a ON s.assignment=a.id ORDER BY s.timemodified DESC LIMIT 20";
      if (task.id === 2) return "SELECT a.id as assignment_id, a.name as assignment_name, a.intro as assignment_description, a.grade as max_grade FROM mdl_assign a WHERE a.grade>0 LIMIT 10";
      if (task.id === 3) return "SELECT u.id as student_id, CONCAT(u.firstname,' ',u.lastname) as student_name FROM mdl_user u WHERE u.deleted=0 LIMIT 20";
      if (task.id === 4) return "SELECT u.id as student_id, CONCAT(u.firstname,' ',u.lastname) as student_name, u.email FROM mdl_user u WHERE u.deleted=0 LIMIT 20";
      const wf = registry.getWorkflow(task.id);
      const mysqlNode = wf?.workflow?.nodes?.find((n: { type?: string }) => n.type === "n8n-nodes-base.mySql") as { parameters?: { query?: string } } | undefined;
      return mysqlNode?.parameters?.query || "SELECT id, firstname, lastname, email FROM mdl_user WHERE deleted=0 LIMIT 20";
    },
    [registry]
  );

  const extractStudentId = useCallback((row: PreviewRow | null): number | null => {
    if (!row) return null;
    const candidates = [
      row.student_id,
      row.userid,
      row.user_id,
      row.id,
      row.studentid,
    ];
    for (const candidate of candidates) {
      const id = numericValue(candidate, Number.NaN);
      if (!Number.isNaN(id) && id > 0) return id;
    }
    return null;
  }, []);

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
    async (task: Task): Promise<PreviewRow[]> => {
      setLoadingPreview(true);
      setPreviewError("");
      setSelectedRow(null);
      try {
        const res = await fetch("/api/moodle/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...DB, query: queryFor(task) }),
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          setPreview([]);
          setPreviewError(data?.error || "Failed to load preview data.");
          return [];
        }
        const rows = Array.isArray(data.data) ? (data.data as PreviewRow[]) : [];
        setPreview(rows);
        if (rows.length) setSelectedRow(0);
        return rows;
      } catch {
        setPreview([]);
        setPreviewError("Failed to load preview data.");
        return [];
      } finally {
        setLoadingPreview(false);
      }
    },
    [queryFor]
  );

  const fetchStats = useCallback(async () => {
    setStatsError("");
    try {
      const params = new URLSearchParams({ dbhost: DB.host, dbport: DB.port, dbname: DB.database, dbuser: DB.user, dbpass: DB.password, prefix: DB.prefix });
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

  const fetchStudentInsight = useCallback(
    async (row: PreviewRow | null) => {
      setStudentInsightError("");
      setStudentInsight(null);

      const studentId = extractStudentId(row);
      if (!studentId) {
        setStudentInsightError("Select a student row that includes student ID.");
        return;
      }

      setStudentInsightLoading(true);
      try {
        const safeId = Math.floor(studentId);
        const overviewQuery = `
          SELECT
            u.id AS student_id,
            CONCAT(u.firstname,' ',u.lastname) AS student_name,
            COALESCE(u.email, '') AS email,
            COALESCE((SELECT COUNT(*) FROM mdl_user_enrolments ue WHERE ue.userid = u.id), 0) AS courses_enrolled,
            COALESCE((SELECT ROUND(AVG(gg.finalgrade), 1) FROM mdl_grade_grades gg WHERE gg.userid = u.id AND gg.finalgrade IS NOT NULL), 0) AS average_grade,
            COALESCE((SELECT COUNT(*) FROM mdl_assign_submission s WHERE s.userid = u.id), 0) AS submissions_count,
            COALESCE(u.lastaccess, 0) AS last_access_unix
          FROM mdl_user u
          WHERE u.id = ${safeId}
          LIMIT 1
        `;

        const gradesQuery = `
          SELECT
            COALESCE(gi.itemname, 'Assessment') AS assessment,
            ROUND(gg.finalgrade, 1) AS grade,
            ROUND(gi.grademax, 1) AS max_grade,
            FROM_UNIXTIME(gg.timemodified) AS graded_at
          FROM mdl_grade_grades gg
          JOIN mdl_grade_items gi ON gi.id = gg.itemid
          WHERE gg.userid = ${safeId}
            AND gg.finalgrade IS NOT NULL
            AND gi.itemtype = 'mod'
          ORDER BY gg.timemodified DESC
          LIMIT 8
        `;

        const activityQuery = `
          SELECT
            action,
            target,
            component,
            FROM_UNIXTIME(timecreated) AS activity_time
          FROM mdl_logstore_standard_log
          WHERE userid = ${safeId}
          ORDER BY timecreated DESC
          LIMIT 8
        `;

        const [overviewRows, recentGrades, recentActivity] = await Promise.all([
          runDbQuery(overviewQuery),
          runDbQuery(gradesQuery).catch(() => []),
          runDbQuery(activityQuery).catch(() => []),
        ]);

        if (!overviewRows.length) {
          setStudentInsightError("Could not load this student profile.");
          return;
        }

        const raw = overviewRows[0];
        const overview: StudentOverview = {
          studentId: safeId,
          studentName: cell(raw.student_name),
          email: cell(raw.email),
          coursesEnrolled: numericValue(raw.courses_enrolled),
          averageGrade: numericValue(raw.average_grade),
          submissionsCount: numericValue(raw.submissions_count),
          lastAccessUnix: numericValue(raw.last_access_unix),
        };

        const inactivityDays =
          overview.lastAccessUnix > 0
            ? Math.max(
              0,
              Math.floor(Date.now() / 1000 - overview.lastAccessUnix) / 86400
            )
            : 999;

        let riskScore = 0;
        if (overview.averageGrade < 60) riskScore += 3;
        else if (overview.averageGrade < 75) riskScore += 1;
        if (overview.submissionsCount === 0) riskScore += 2;
        else if (overview.submissionsCount < 3) riskScore += 1;
        if (inactivityDays > 14) riskScore += 2;
        else if (inactivityDays > 7) riskScore += 1;

        const riskLevel: "low" | "medium" | "high" =
          riskScore >= 5 ? "high" : riskScore >= 3 ? "medium" : "low";

        const notes: string[] = [];
        if (overview.averageGrade < 60) {
          notes.push("Student may need urgent support with current coursework.");
        } else if (overview.averageGrade < 75) {
          notes.push("Student performance is moderate and can improve with guidance.");
        } else {
          notes.push("Student currently performs at a good level.");
        }
        if (inactivityDays > 14) {
          notes.push("No recent activity for over two weeks.");
        } else if (inactivityDays > 7) {
          notes.push("Activity is lower than expected this week.");
        } else {
          notes.push("Recent engagement is active.");
        }
        if (overview.submissionsCount === 0) {
          notes.push("No assignment submissions were found.");
        } else if (overview.submissionsCount < 3) {
          notes.push("Submission history is limited.");
        } else {
          notes.push("Submission history looks healthy.");
        }

        setStudentInsight({
          overview,
          recentGrades,
          recentActivity,
          riskLevel,
          riskScore,
          inactivityDays: Number(inactivityDays.toFixed(1)),
          notes,
        });
      } catch (error: unknown) {
        setStudentInsightError(
          error instanceof Error ? error.message : "Failed to load student details."
        );
      } finally {
        setStudentInsightLoading(false);
      }
    },
    [extractStudentId, runDbQuery]
  );

  const runWorkflow = useCallback(
    (task: Task, fromAssistant = false): boolean => {
      if (!task.active) {
        if (!fromAssistant) appendAI(`"${task.title}" is paused.`);
        return false;
      }
      if (!registry.hasWorkflow(task.id)) {
        if (!fromAssistant) appendAI(`No workflow found for "${task.title}".`);
        return false;
      }
      setRunTaskState(task);
      setOpenRunModal(true);
      return true;
    },
    [appendAI, registry]
  );

  const askModel = useCallback(
    async (text: string): Promise<string | null> => {
      try {
        const res = await fetch("/api/assistant-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            history: messages.slice(-8).map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })),
            context: {
              selectedTask: selectedTask ? { id: selectedTask.id, title: selectedTask.title } : null,
              tasks: tasks.map((t) => ({ id: t.id, title: t.title, description: t.description, ready: registry.hasWorkflow(t.id) })),
              previewCount: preview.length,
              previewError,
              selectedStudentName: selectedRowData
                ? cell(selectedRowData.student_name ?? selectedRowData.firstname ?? selectedRowData.fullname ?? selectedRowData.name)
                : "",
              selectedRowExcerpt: selectedRowData
                ? Object.entries(selectedRowData)
                  .slice(0, 6)
                  .map(([k, v]) => `${k}: ${cell(v)}`)
                  .join(" | ")
                : "",
              riskLevel: studentInsight?.riskLevel || "",
              hasDraft: Boolean(outputDraft.trim()),
              reviewPrompt,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.success || typeof data?.reply !== "string") return null;
        return data.reply.trim();
      } catch {
        return null;
      }
    },
    [messages, outputDraft, preview.length, previewError, registry, reviewPrompt, selectedRowData, selectedTask, studentInsight?.riskLevel, tasks]
  );

  const reviewStudentData = useCallback(
    async (task: Task, rowData: PreviewRow, promptText: string): Promise<{ ok: boolean; error?: string }> => {
      setReviewBusy(true);
      setReviewError("");
      try {
        const rowText = Object.entries(rowData).map(([k, v]) => `${k}: ${cell(v)}`).join("\n");
        const prompt = `${promptText}\n\nTask: ${task.title}\nDescription: ${task.description}\n\nRow:\n${rowText}`;
        const reply = await askModel(prompt);
        if (!reply) throw new Error("AI review failed.");
        setOutputDraft(reply);
        appendAI("AI review completed and loaded to Feedback Editor.");
        return { ok: true };
      } catch (e: unknown) {
        const err = e instanceof Error ? e.message : "AI review failed.";
        setReviewError(err);
        return { ok: false, error: err };
      } finally {
        setReviewBusy(false);
      }
    },
    [appendAI, askModel]
  );

  const reviewSelectedStudent = useCallback(async () => {
    if (!selectedTask) {
      setReviewError("Select a task first.");
      return;
    }
    if (!selectedRowData) {
      setReviewError("Select a student row first.");
      return;
    }
    await reviewStudentData(selectedTask, selectedRowData, reviewPrompt);
  }, [reviewPrompt, reviewStudentData, selectedRowData, selectedTask]);

  const buildSmartReviewPrompt = useCallback(
    (rowData: PreviewRow | null): string => {
      if (!rowData) return reviewPrompt;
      const gradeHints = ["grade", "finalgrade", "average_grade", "score"];
      let detectedGrade = Number.NaN;
      for (const [key, value] of Object.entries(rowData)) {
        const keyNorm = normalize(key);
        if (!gradeHints.some((hint) => keyNorm.includes(hint))) continue;
        const n = numericValue(value, Number.NaN);
        if (!Number.isNaN(n)) {
          detectedGrade = n;
          break;
        }
      }
      if (!Number.isNaN(detectedGrade) && detectedGrade < 60) {
        return "Provide intervention-focused English teacher feedback. Include score /100, critical weaknesses, immediate corrective plan, and a 7-day support action list.";
      }
      if (!Number.isNaN(detectedGrade) && detectedGrade < 75) {
        return "Provide balanced English teacher feedback with score /100, key strengths, top improvements, and targeted exercises for grammar, vocabulary, and coherence.";
      }
      return "Provide concise English teacher feedback with score /100, strengths to maintain, enrichment opportunities, and one challenge task for next week.";
    },
    [reviewPrompt]
  );

  const createTaskFromValues = useCallback(async (values: NewTaskForm): Promise<{ ok: boolean; error?: string; title?: string }> => {
    setCreateErr("");
    if (!values.description.trim() || !values.prompt.trim()) {
      setCreateErr("Description and AI prompt are required.");
      return { ok: false, error: "Description and AI prompt are required." };
    }
    const id = tasks.reduce((max, t) => Math.max(max, t.id), 0) + 1;
    const title = values.title.trim() || `Custom Task ${id}`;
    if (tasks.some((t) => t.title.toLowerCase() === title.toLowerCase())) {
      setCreateErr("Task title already exists.");
      return { ok: false, error: "Task title already exists." };
    }
    const task: Task = { id, title, description: values.description.trim(), prompt: values.prompt.trim(), icon: values.icon.trim() || "CUS", dataSource: "mdl_user", active: true, isCustom: true };
    const wfTask: TaskInput = { id: task.id, title: task.title, description: task.description, prompt: task.prompt, icon: task.icon };
    setCreating(true);
    try {
      await registry.generateAndRegisterWorkflow(wfTask);
      const next = [...tasks, task];
      setTasks(next);
      setSelectedTaskId(task.id);
      saveCustomTasks(next);
      setNewTask({ title: "", description: "", prompt: "", icon: "CUS" });
      appendAI(`Created custom task "${task.title}".`);
      return { ok: true, title: task.title };
    } catch (e: unknown) {
      setCreateErr(e instanceof Error ? e.message : "Failed to create task.");
      return { ok: false, error: e instanceof Error ? e.message : "Failed to create task." };
    } finally {
      setCreating(false);
    }
  }, [appendAI, registry, saveCustomTasks, tasks]);

  const createTask = useCallback(async () => {
    await createTaskFromValues(newTask);
  }, [createTaskFromValues, newTask]);

  const setTaskActiveState = useCallback(
    (taskId: number, active: boolean) => {
      setTasks((current) => {
        const next = current.map((t) => (t.id === taskId ? { ...t, active } : t));
        saveCustomTasks(next);
        return next;
      });
    },
    [saveCustomTasks]
  );

  const toggleActive = useCallback(
    (taskId: number) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      setTaskActiveState(taskId, !task.active);
    },
    [setTaskActiveState, tasks]
  );

  const resolveTask = useCallback(
    (txt: string): Task | null => {
      const n = normalize(txt);
      const m = n.match(/\btask\s*(\d+)\b|\bworkflow\s*(\d+)\b|\b(\d+)\b/);
      const id = m ? Number(m[1] || m[2] || m[3]) : Number.NaN;
      if (!Number.isNaN(id)) {
        const exact = tasks.find((t) => t.id === id);
        if (exact) return exact;
      }
      const byTitle = tasks.find((t) => n.includes(normalize(t.title)));
      if (byTitle) return byTitle;

      const words = n.split(" ").filter(Boolean);
      let best: Task | null = null;
      let bestScore = 0;
      for (const task of tasks) {
        const hay = normalize(`${task.title} ${task.description}`);
        const score = words.reduce((sum, word) => sum + (hay.includes(word) ? 1 : 0), 0);
        if (score > bestScore) {
          best = task;
          bestScore = score;
        }
      }
      if (best && bestScore > 0) return best;
      return selectedTask;
    },
    [selectedTask, tasks]
  );

  const describePreviewRow = useCallback(
    (row: PreviewRow) =>
      cell(row.student_name ?? row.firstname ?? row.fullname ?? row.name ?? row.student_id ?? row.id ?? "Student"),
    []
  );

  const parseCreateTaskFromChat = useCallback((input: string): NewTaskForm | null => {
    const trigger = input.match(/^\s*(create task|new task|add task|انشئ مهمة|اضف مهمة|اضافة مهمة)\s*/i);
    if (!trigger) return null;
    const remainder = input.slice(trigger[0].length).trim();
    if (!remainder) return null;

    const parsed: NewTaskForm = { title: "", description: "", prompt: "", icon: "CUS" };
    const parts = remainder.split("|").map((p) => p.trim()).filter(Boolean);
    const hasKeyValue = parts.some((p) => /[:=]/.test(p));

    if (!hasKeyValue && parts.length >= 3) {
      parsed.title = parts[0];
      parsed.description = parts[1];
      parsed.prompt = parts[2];
      if (parts[3]) parsed.icon = parts[3];
      return parsed.description && parsed.prompt ? parsed : null;
    }

    for (const part of parts) {
      const m = part.match(/^([^:=]+)\s*[:=]\s*(.+)$/);
      if (!m) continue;
      const key = m[1].trim().toLowerCase();
      const value = m[2].trim();
      if (/^(title|name|task|عنوان)$/.test(key)) parsed.title = value;
      else if (/^(description|desc|details|وصف)$/.test(key)) parsed.description = value;
      else if (/^(prompt|instruction|ai prompt|تعليمات|برومبت)$/.test(key)) parsed.prompt = value;
      else if (/^(icon|code|رمز)$/.test(key)) parsed.icon = value;
    }
    return parsed.description && parsed.prompt ? parsed : null;
  }, []);

  const copyToClipboard = useCallback(
    async (text: string, successMessage: string) => {
      if (!text) {
        appendAI("There is no content to copy.");
        return;
      }
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        appendAI("Clipboard is not available in this browser.");
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        appendAI(successMessage);
      } catch {
        appendAI("Failed to copy text.");
      }
    },
    [appendAI]
  );

  const getVisibleRows = useCallback(() => {
    const previewQuery = normalize(previewFilter);
    return preview
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => !previewQuery || Object.values(row).some((value) => normalize(cell(value)).includes(previewQuery)));
  }, [preview, previewFilter]);

  const splitCommandInput = useCallback((input: string) => {
    return input
      .split(/\n|;|(?:\s+(?:then|بعدها|ثم)\s+)/gi)
      .map((s) => s.trim())
      .filter(Boolean);
  }, []);

  const getNextActionSuggestions = useCallback(() => {
    const suggestions: string[] = [];
    if (!selectedTask) suggestions.push('open task 1');
    if (!preview.length) suggestions.push('preview data');
    if (!selectedRowData) suggestions.push('select row 1');
    if (!outputDraft.trim()) suggestions.push('review selected');
    if (outputDraft.trim()) suggestions.push('save draft');
    return suggestions.slice(0, 3);
  }, [outputDraft, preview.length, selectedRowData, selectedTask]);

  const pickSmartRow = useCallback((rows: PreviewRow[]) => {
    if (!rows.length) return { row: null as PreviewRow | null, index: -1 };
    const gradeKeys = ["grade", "finalgrade", "average_grade", "score"];
    let bestIndex = 0;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      let rowScore = 100;
      for (const [key, value] of Object.entries(row)) {
        const keyNorm = normalize(key);
        if (!gradeKeys.some((hint) => keyNorm.includes(hint))) continue;
        const n = numericValue(value, Number.NaN);
        if (!Number.isNaN(n)) rowScore = Math.min(rowScore, n);
      }
      const status = normalize(cell((row as Record<string, unknown>).status));
      if (status.includes("new")) rowScore -= 4;
      if (status.includes("draft")) rowScore -= 2;
      if (rowScore < bestScore) {
        bestScore = rowScore;
        bestIndex = i;
      }
    }
    return { row: rows[bestIndex], index: bestIndex };
  }, []);

  const runSmartAutopilot = useCallback(async (): Promise<boolean> => {
    const preferred =
      (selectedTask && selectedTask.active ? selectedTask : null) ||
      tasks.find((t) => t.active && registry.hasWorkflow(t.id)) ||
      tasks[0] ||
      null;

    if (!preferred) {
      appendAI("Autopilot could not start because no tasks are available.");
      return true;
    }

    setSelectedTaskId(preferred.id);
    const rows =
      selectedTask && preferred.id === selectedTask.id && preview.length
        ? preview
        : await fetchPreview(preferred);
    if (!rows.length) {
      appendAI("Autopilot found no student rows to review.");
      return true;
    }

    const choice = pickSmartRow(rows);
    if (!choice.row || choice.index < 0) {
      appendAI("Autopilot could not choose a student row.");
      return true;
    }

    setSelectedRow(choice.index);
    const smartPrompt = buildSmartReviewPrompt(choice.row);
    setReviewPrompt(smartPrompt);

    const result = await reviewStudentData(preferred, choice.row, smartPrompt);
    if (!result.ok) {
      appendAI(`Autopilot failed: ${result.error || "review failed."}`);
      return true;
    }
    appendAI(`Autopilot reviewed ${describePreviewRow(choice.row)} using task "${preferred.title}".`);
    return true;
  }, [
    appendAI,
    buildSmartReviewPrompt,
    describePreviewRow,
    fetchPreview,
    pickSmartRow,
    preview,
    registry,
    reviewStudentData,
    selectedTask,
    tasks,
  ]);

  const executeAssistantCommand = useCallback(
    async (raw: string, n: string): Promise<boolean> => {
      const visibleRows = getVisibleRows();

      if (/(^|\s)(help|commands|control)(\s|$)/.test(n) || /مساعدة|اوامر|أوامر/.test(raw)) {
        appendAI(
          [
            "Control commands:",
            "- list tasks | open task 2 | run task 2",
            "- pause task 2 | activate task 2",
            "- autopilot review | what next",
            "- preview data | refresh all | refresh stats",
            "- search tasks: grading | search rows: ahmed",
            "- select row 3 | select student id 45 | next row",
            "- set review prompt: ... | review selected",
            "- save draft | clear draft | append draft: ...",
            "- copy summary | copy details",
            '- create task title: Essay Coach | description: ... | prompt: ... | icon: ESS',
            "- You can chain commands with ';' or 'then'",
          ].join("\n")
        );
        return true;
      }

      if (/(what next|next step|suggest next|recommend next)/.test(n) || /ماذا بعد|الخطوة التالية|اقترح/.test(raw)) {
        const suggestions = getNextActionSuggestions();
        appendAI(
          suggestions.length
            ? `Suggested next commands:\n- ${suggestions.join("\n- ")}`
            : "You are in a good state. Consider: run task, review selected, or refine feedback draft."
        );
        return true;
      }

      if (/(^|\s)(status|overview)(\s|$)/.test(n) || /حالة النظام|ملخص/.test(raw)) {
        const next = getNextActionSuggestions();
        appendAI(
          [
            "Dashboard status:",
            `- Selected task: ${selectedTask?.title || "none"}`,
            `- Selected student: ${selectedRowData ? describePreviewRow(selectedRowData) : "none"
            }`,
            `- Rows loaded: ${preview.length} (visible ${visibleRows.length})`,
            `- Workflows ready: ${tasks.filter((t) => registry.hasWorkflow(t.id)).length}/${tasks.length}`,
            `- Feedback draft: ${outputDraft.trim() ? "available" : "empty"}`,
            next.length ? `- Suggested next: ${next.join(" | ")}` : "- Suggested next: run task",
          ].join("\n")
        );
        return true;
      }

      if (/(show advanced|advanced on|enable advanced)/.test(n) || /اظهر.*متقدم|تفعيل.*متقدم/.test(raw)) {
        setShowAdvanced(true);
        appendAI("Advanced tools are now visible.");
        return true;
      }
      if (/(hide advanced|advanced off|disable advanced)/.test(n) || /اخف.*متقدم|تعطيل.*متقدم/.test(raw)) {
        setShowAdvanced(false);
        appendAI("Advanced tools are now hidden.");
        return true;
      }

      if (/(\s|^)(list tasks|tasks)(\s|$)/.test(n) || /عرض المهام|قائمة المهام/.test(raw)) {
        appendAI(tasks.map((t) => `${t.id}. ${t.title} (${t.active ? "active" : "paused"}, ${registry.hasWorkflow(t.id) ? "ready" : "missing"})`).join("\n"));
        return true;
      }

      if (/clear task filter|reset task filter/.test(n) || /مسح فلتر المهام/.test(raw)) {
        setTaskFilter("");
        appendAI("Task filter cleared.");
        return true;
      }
      const taskFilterMatch =
        raw.match(/(?:task filter|filter tasks|search tasks)\s*[:=]\s*(.+)$/i) ||
        raw.match(/(?:search tasks|filter tasks)\s+(.+)$/i);
      if (taskFilterMatch?.[1]) {
        setTaskFilter(taskFilterMatch[1].trim());
        appendAI(`Task filter set to "${taskFilterMatch[1].trim()}".`);
        return true;
      }

      if (/clear row filter|clear rows filter|reset row filter/.test(n) || /مسح فلتر الصفوف|مسح فلتر الطلاب/.test(raw)) {
        setPreviewFilter("");
        appendAI("Row filter cleared.");
        return true;
      }
      const rowFilterMatch =
        raw.match(/(?:row filter|rows filter|search rows|filter rows)\s*[:=]\s*(.+)$/i) ||
        raw.match(/(?:search rows|filter rows)\s+(.+)$/i);
      if (rowFilterMatch?.[1]) {
        setPreviewFilter(rowFilterMatch[1].trim());
        appendAI(`Row filter set to "${rowFilterMatch[1].trim()}".`);
        return true;
      }

      if ((/(\s|^)(open|select|show)(\s|$)/.test(n) && n.includes("task")) || /اختر.*مهمة|افتح.*مهمة/.test(raw)) {
        const t = resolveTask(raw);
        if (!t) {
          appendAI("I could not find that task.");
          return true;
        }
        setSelectedTaskId(t.id);
        appendAI(`Selected "${t.title}".`);
        return true;
      }

      if ((/(\s|^)(pause|disable|deactivate)(\s|$)/.test(n) || /ايقاف|تعطيل/.test(raw)) && (n.includes("task") || /مهمة/.test(raw))) {
        const t = resolveTask(raw);
        if (!t) {
          appendAI("I could not find that task.");
          return true;
        }
        setTaskActiveState(t.id, false);
        appendAI(`"${t.title}" is now paused.`);
        return true;
      }

      if ((/(\s|^)(activate|enable|resume)(\s|$)/.test(n) || /تفعيل|استئناف/.test(raw)) && (n.includes("task") || /مهمة/.test(raw))) {
        const t = resolveTask(raw);
        if (!t) {
          appendAI("I could not find that task.");
          return true;
        }
        setTaskActiveState(t.id, true);
        appendAI(`"${t.title}" is now active.`);
        return true;
      }

      if (/(\s|^)(preview|data)(\s|$)/.test(n) || /عرض البيانات|بيانات الطلاب/.test(raw)) {
        const t = resolveTask(raw);
        if (!t) {
          appendAI("I could not find that task.");
          return true;
        }
        setSelectedTaskId(t.id);
        await fetchPreview(t);
        appendAI(`Student data loaded for "${t.title}".`);
        return true;
      }

      if (/(\s|^)(run|execute|start)(\s|$)/.test(n) || /تشغيل|تنفيذ|ابدأ|ابدء/.test(raw)) {
        const t = resolveTask(raw);
        if (!t) {
          appendAI("I could not find that task.");
          return true;
        }
        setSelectedTaskId(t.id);
        if (runWorkflow(t, true)) appendAI(`Execution opened for "${t.title}".`);
        return true;
      }

      if (/autopilot|smart review|auto review/.test(n) || /تشغيل تلقائي|وضع تلقائي|مراجعة ذكية/.test(raw)) {
        return runSmartAutopilot();
      }

      if (/refresh all|reload all|sync all/.test(n) || /تحديث الكل|اعادة تحميل الكل/.test(raw)) {
        if (selectedTask) await fetchPreview(selectedTask);
        await fetchStats();
        appendAI("Dashboard data refreshed.");
        return true;
      }
      if (/refresh stats|reload stats/.test(n) || /تحديث الاحصائيات|تحديث الإحصائيات/.test(raw)) {
        await fetchStats();
        appendAI("Statistics refreshed.");
        return true;
      }

      const rowMatch = raw.match(/(?:select|open|choose|show)\s+row\s+(\d+)/i);
      if (rowMatch?.[1]) {
        const rowNumber = Number(rowMatch[1]);
        if (rowNumber < 1 || rowNumber > visibleRows.length) {
          appendAI(`Row ${rowNumber} is out of range. Visible rows: ${visibleRows.length}.`);
          return true;
        }
        const picked = visibleRows[rowNumber - 1];
        setSelectedRow(picked.index);
        appendAI(`Selected row ${rowNumber}: ${describePreviewRow(picked.row)}.`);
        return true;
      }

      if (/next row|next student/.test(n) || /الصف التالي|الطالب التالي/.test(raw)) {
        if (!visibleRows.length) {
          appendAI("No rows available.");
          return true;
        }
        const currentPosition = selectedRow === null ? -1 : visibleRows.findIndex((r) => r.index === selectedRow);
        const nextPosition = Math.min(visibleRows.length - 1, currentPosition + 1);
        setSelectedRow(visibleRows[nextPosition].index);
        appendAI(`Moved to row ${nextPosition + 1}: ${describePreviewRow(visibleRows[nextPosition].row)}.`);
        return true;
      }
      if (/previous row|prev row|previous student/.test(n) || /الصف السابق|الطالب السابق/.test(raw)) {
        if (!visibleRows.length) {
          appendAI("No rows available.");
          return true;
        }
        const currentPosition = selectedRow === null ? 0 : Math.max(0, visibleRows.findIndex((r) => r.index === selectedRow));
        const previousPosition = Math.max(0, currentPosition - 1);
        setSelectedRow(visibleRows[previousPosition].index);
        appendAI(`Moved to row ${previousPosition + 1}: ${describePreviewRow(visibleRows[previousPosition].row)}.`);
        return true;
      }

      const selectStudentIdMatch =
        raw.match(/(?:select|open|choose|show)\s+student(?:\s+id)?\s*[:#]?\s*(\d+)/i) ||
        raw.match(/(?:اختر|حدد|افتح|عرض).*(?:طالب).*(\d+)/);
      if (selectStudentIdMatch?.[1]) {
        const requestedId = Number(selectStudentIdMatch[1]);
        const idx = preview.findIndex((row) => extractStudentId(row) === requestedId);
        if (idx < 0) {
          appendAI(`Student ID ${requestedId} was not found in loaded rows.`);
          return true;
        }
        setSelectedRow(idx);
        appendAI(`Selected student ID ${requestedId}: ${describePreviewRow(preview[idx])}.`);
        return true;
      }

      const selectStudentByNameMatch = raw.match(/(?:select|open|choose|show)\s+student\s+(.+)$/i);
      if (selectStudentByNameMatch?.[1]) {
        const requestedName = selectStudentByNameMatch[1].trim().replace(/^["']|["']$/g, "");
        const nameQuery = normalize(requestedName);
        if (!nameQuery) {
          appendAI("Provide a student name after the command.");
          return true;
        }
        const idx = preview.findIndex((row) =>
          normalize(
            cell(row.student_name ?? row.firstname ?? row.fullname ?? row.name ?? "")
          ).includes(nameQuery)
        );
        let resolvedIndex = idx;
        if (resolvedIndex < 0) {
          const tokens = nameQuery.split(" ").filter(Boolean);
          let bestIndex = -1;
          let bestScore = 0;
          preview.forEach((row, rowIndex) => {
            const hay = normalize(cell(row.student_name ?? row.firstname ?? row.fullname ?? row.name ?? ""));
            const score = tokens.reduce((sum, token) => sum + (hay.includes(token) ? 1 : 0), 0);
            if (score > bestScore) {
              bestScore = score;
              bestIndex = rowIndex;
            }
          });
          if (bestScore > 0) resolvedIndex = bestIndex;
        }
        if (resolvedIndex < 0) {
          appendAI(`I could not find a student matching "${requestedName}".`);
          return true;
        }
        setSelectedRow(resolvedIndex);
        appendAI(`Selected "${describePreviewRow(preview[resolvedIndex])}".`);
        return true;
      }

      if (/student insight|analyze student|risk summary/.test(n) || /تحليل الطالب|ملخص المخاطر/.test(raw)) {
        if (!studentInsight?.overview) {
          appendAI("Select a student first to show insight.");
          return true;
        }
        const insightRecommendation =
          studentInsight.riskLevel === "high"
            ? "Schedule immediate 1:1 support and send targeted feedback today."
            : studentInsight.riskLevel === "medium"
              ? "Assign focused improvement tasks and monitor next submission."
              : "Keep current pace and provide enrichment challenge.";
        appendAI(
          [
            `Student insight for ${studentInsight.overview.studentName}:`,
            `- Risk: ${studentInsight.riskLevel.toUpperCase()} (${studentInsight.riskScore})`,
            `- Avg grade: ${studentInsight.overview.averageGrade}%`,
            `- Inactivity: ${studentInsight.inactivityDays} days`,
            `- Notes: ${studentInsight.notes.join(" | ")}`,
            `- Recommendation: ${insightRecommendation}`,
          ].join("\n")
        );
        return true;
      }

      if (/review selected|review student|ai review/.test(n) || /مراجعة الطالب|راجع الطالب|مراجعة/.test(raw)) {
        await reviewSelectedStudent();
        return true;
      }

      const promptMatch =
        raw.match(/(?:set|update|change)\s+(?:review\s+)?prompt\s*[:=]\s*(.+)$/i) ||
        raw.match(/(?:اضبط|عدل|تعديل).*(?:prompt|برومبت|تعليمات)\s*[:=]\s*(.+)$/i);
      if (promptMatch?.[1]) {
        setReviewPrompt(promptMatch[1].trim());
        appendAI("Review prompt updated.");
        return true;
      }
      if (/quick summary prompt|summary prompt/.test(n)) {
        setReviewPrompt("Give a short English-teacher summary with score /100, two strengths, two improvements, and one next step.");
        appendAI("Review prompt switched to quick summary.");
        return true;
      }
      if (/detailed correction prompt|grammar prompt/.test(n)) {
        setReviewPrompt("Provide detailed language feedback for grammar, vocabulary, coherence, and clarity. Include score /100 and practical corrections.");
        appendAI("Review prompt switched to detailed correction.");
        return true;
      }
      if (/motivational prompt|supportive prompt/.test(n)) {
        setReviewPrompt("Write supportive and motivating feedback for this student in simple English, include score /100 and one action for home practice.");
        appendAI("Review prompt switched to motivational tone.");
        return true;
      }

      if (/save draft|save feedback/.test(n) || /حفظ المسودة|حفظ التقييم/.test(raw)) {
        if (typeof window !== "undefined") {
          localStorage.setItem(OUTPUT_KEY, outputDraft);
          setSavedAt(now());
          appendAI("Feedback draft saved.");
        }
        return true;
      }
      if (/clear draft|clear feedback/.test(n) || /مسح المسودة|حذف المسودة/.test(raw)) {
        setOutputDraft("");
        if (typeof window !== "undefined") localStorage.removeItem(OUTPUT_KEY);
        setSavedAt("");
        appendAI("Feedback draft cleared.");
        return true;
      }
      const appendDraftMatch = raw.match(/(?:append draft|add to draft)\s*[:=]\s*(.+)$/i);
      if (appendDraftMatch?.[1]) {
        setOutputDraft((prev) => `${prev}${prev ? "\n" : ""}${appendDraftMatch[1].trim()}`);
        appendAI("Text appended to feedback draft.");
        return true;
      }
      if (/insert feedback template|teacher template/.test(n)) {
        setOutputDraft((prev) =>
          prev
            ? `${prev}\n\nStrengths:\n- \n- \n\nAreas to improve:\n- \n- \n\nNext step:\n- `
            : "Strengths:\n- \n- \n\nAreas to improve:\n- \n- \n\nNext step:\n- "
        );
        appendAI("Teacher template inserted into draft.");
        return true;
      }

      if (/copy summary|student summary/.test(n) || /نسخ الملخص|ملخص الطالب/.test(raw)) {
        const summary = studentInsight?.overview
          ? [
            `Student: ${studentInsight.overview.studentName} (ID ${studentInsight.overview.studentId})`,
            `Email: ${studentInsight.overview.email || "N/A"}`,
            `Average grade: ${studentInsight.overview.averageGrade}%`,
            `Courses enrolled: ${studentInsight.overview.coursesEnrolled}`,
            `Submissions: ${studentInsight.overview.submissionsCount}`,
            `Inactivity days: ${studentInsight.inactivityDays}`,
            `Risk level: ${studentInsight.riskLevel.toUpperCase()} (score ${studentInsight.riskScore})`,
            `Teacher notes: ${studentInsight.notes.join(" | ")}`,
          ].join("\n")
          : selectedRowData
            ? Object.entries(selectedRowData)
              .map(([k, v]) => `${humanizeKey(k)}: ${cell(v)}`)
              .join("\n")
            : "";
        await copyToClipboard(summary, "Student summary copied.");
        return true;
      }
      if (/copy details|copy student details/.test(n) || /نسخ التفاصيل/.test(raw)) {
        const details = selectedRowData
          ? Object.entries(selectedRowData)
            .map(([k, v]) => `${humanizeKey(k)}: ${cell(v)}`)
            .join("\n")
          : "";
        await copyToClipboard(details, "Student detail sheet copied.");
        return true;
      }

      const createTaskInput = parseCreateTaskFromChat(raw);
      if (createTaskInput) {
        const result = await createTaskFromValues(createTaskInput);
        if (!result.ok) {
          appendAI(result.error || "Failed to create task.");
        }
        return true;
      }

      return false;
    },
    [
      appendAI,
      copyToClipboard,
      createTaskFromValues,
      describePreviewRow,
      extractStudentId,
      fetchPreview,
      fetchStats,
      getNextActionSuggestions,
      getVisibleRows,
      outputDraft,
      parseCreateTaskFromChat,
      preview,
      registry,
      resolveTask,
      reviewSelectedStudent,
      runSmartAutopilot,
      runWorkflow,
      selectedRow,
      selectedRowData,
      selectedTask,
      setTaskActiveState,
      tasks,
      studentInsight,
    ]
  );

  const sendChat = useCallback(async () => {
    const raw = chatInput.trim();
    if (!raw) return;
    const n = normalize(raw);
    setMessages((m) => [...m, { role: "user", content: raw, time: now() }]);
    setChatInput("");
    setAssistantBusy(true);
    try {
      const parts = splitCommandInput(raw);
      let handledCount = 0;
      for (const part of parts) {
        const handled = await executeAssistantCommand(part, normalize(part));
        if (handled) handledCount += 1;
      }
      if (handledCount > 0) {
        if (parts.length > 1) {
          appendAI(`Executed ${handledCount}/${parts.length} requested command(s).`);
        }
        if (!/(help|commands|what next|next step|status|overview)/.test(n)) {
          const suggestions = getNextActionSuggestions();
          if (suggestions.length) appendAI(`Next best command: ${suggestions[0]}`);
        }
        return;
      }
      const reply = await askModel(raw);
      appendAI(reply || 'Try "help commands" for full control.');
    } finally {
      setAssistantBusy(false);
    }
  }, [appendAI, askModel, chatInput, executeAssistantCommand, getNextActionSuggestions, splitCommandInput]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(TASKS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Task[];
        const valid = Array.isArray(saved)
          ? saved.map((t) => ({ ...t, active: t.active !== false, isCustom: true })).filter((t) => registry.hasWorkflow(t.id))
          : [];
        if (valid.length) setTasks([...BASE_TASKS, ...valid]);
      }
    } catch { }
    try {
      const draft = localStorage.getItem(OUTPUT_KEY);
      if (typeof draft === "string") setOutputDraft(draft);
    } catch { }
  }, [registry]);

  useEffect(() => {
    if (!selectedTask) return;
    void fetchPreview(selectedTask);
  }, [fetchPreview, selectedTask]);

  useEffect(() => {
    if (!selectedRowData) {
      setStudentInsight(null);
      setStudentInsightError("");
      return;
    }
    void fetchStudentInsight(selectedRowData);
  }, [fetchStudentInsight, selectedRowData]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const cols = preview.length ? Object.keys(preview[0]) : [];
  const wf = selectedTask ? registry.getWorkflow(selectedTask.id) : null;
  const filteredRatio = preview.length ? Math.round((filteredPreview.length / preview.length) * 100) : 0;
  const selectedRowExcerpt = selectedRowData
    ? Object.entries(selectedRowData)
      .slice(0, 4)
      .map(([k, v]) => `${humanizeKey(k)}: ${cell(v)}`)
      .join(" | ")
    : "No row selected";
  const selectedStudentName = selectedRowData
    ? cell(
      selectedRowData.student_name ??
      selectedRowData.firstname ??
      selectedRowData.fullname ??
      selectedRowData.name
    )
    : "No student selected";
  const studentSummaryText = studentInsight?.overview
    ? [
      `Student: ${studentInsight.overview.studentName} (ID ${studentInsight.overview.studentId})`,
      `Email: ${studentInsight.overview.email || "N/A"}`,
      `Average grade: ${studentInsight.overview.averageGrade}%`,
      `Courses enrolled: ${studentInsight.overview.coursesEnrolled}`,
      `Submissions: ${studentInsight.overview.submissionsCount}`,
      `Inactivity days: ${studentInsight.inactivityDays}`,
      `Risk level: ${studentInsight.riskLevel.toUpperCase()} (score ${studentInsight.riskScore})`,
      `Teacher notes: ${studentInsight.notes.join(" | ")}`,
    ].join("\n")
    : "";
  const gradeSeries = studentInsight?.recentGrades?.map((g) => numericValue(g.grade, Number.NaN)).filter((v) => !Number.isNaN(v)) ?? [];
  const gradeTrendDelta = gradeSeries.length >= 2 ? Number((gradeSeries[0] - gradeSeries[gradeSeries.length - 1]).toFixed(1)) : 0;
  const gradeTrendLabel =
    gradeSeries.length < 2
      ? "Not enough grade history"
      : gradeTrendDelta > 2
        ? "Improving"
        : gradeTrendDelta < -2
          ? "Dropping"
          : "Stable";
  const engagementScore = studentInsight
    ? Math.max(
      0,
      Math.min(
        100,
        Math.round(
          100 -
          studentInsight.inactivityDays * 4 +
          studentInsight.recentActivity.length * 3 +
          studentInsight.overview.submissionsCount * 2
        )
      )
    )
    : 0;
  const recommendedAction = !studentInsight
    ? "Select a student first."
    : studentInsight.riskLevel === "high"
      ? "Schedule immediate 1:1 support and send targeted feedback today."
      : studentInsight.riskLevel === "medium"
        ? "Assign focused improvement tasks and monitor next submission."
        : "Keep current pace and provide enrichment challenge.";
  const detailEntries = selectedRowData ? Object.entries(selectedRowData) : [];
  const detailSheetText = detailEntries
    .map(([key, value]) => `${humanizeKey(key)}: ${cell(value)}`)
    .join("\n");
  const riskToneClass = !studentInsight
    ? "border-white/15 bg-white/5 text-slate-300"
    : studentInsight.riskLevel === "high"
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : studentInsight.riskLevel === "medium"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-green-500/30 bg-green-500/10 text-green-300";
  const trendToneClass =
    gradeTrendLabel === "Improving"
      ? "text-emerald-300"
      : gradeTrendLabel === "Dropping"
        ? "text-red-300"
        : "text-slate-200";
  const engagementToneClass =
    engagementScore >= 75
      ? "text-emerald-300"
      : engagementScore >= 50
        ? "text-amber-300"
        : "text-red-300";
  const hasDraft = Boolean(outputDraft.trim());
  const draftWordCount = hasDraft ? outputDraft.trim().split(/\s+/).length : 0;
  const workflowHealth = tasks.length ? Math.round((readyCount / tasks.length) * 100) : 0;
  const teacherPriorityTitle = !studentInsight
    ? "Choose a student to generate teacher priority."
    : studentInsight.riskLevel === "high"
      ? "Immediate student intervention needed."
      : studentInsight.riskLevel === "medium"
        ? "Monitor and guide this student closely."
        : "Student is stable and ready for enrichment.";
  const teacherPriorityClass = !studentInsight
    ? "border-white/15 bg-white/5 text-slate-300"
    : studentInsight.riskLevel === "high"
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : studentInsight.riskLevel === "medium"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  const classroomChecklist = [
    { label: "Task selected", done: Boolean(selectedTask), value: selectedTask?.title || "Choose a task" },
    { label: "Student selected", done: Boolean(selectedRowData), value: selectedStudentName },
    { label: "Feedback draft", done: hasDraft, value: hasDraft ? `${draftWordCount} words` : "No draft yet" },
  ];
  const detailFieldCount = detailEntries.length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background-dark text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div className="absolute right-[-8rem] top-1/3 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 flex h-screen">
        <main className="h-full w-full overflow-y-auto custom-scrollbar lg:w-3/4">
          <div className="mx-auto max-w-[1200px] space-y-5 px-4 py-6 sm:px-6">
            <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-cyan-500/10 to-transparent p-6 shadow-[0_20px_70px_-45px_rgba(0,255,136,0.85)]">
              <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full border border-cyan-300/20 bg-cyan-400/10" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full border border-primary/20 bg-primary/10" />
              <div className="grid gap-5 lg:grid-cols-3">
                <div className="space-y-3 lg:col-span-2">
                  <p className="inline-block rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                    TEACHER MODE
                  </p>
                  <p className="text-xs uppercase tracking-[0.25em] text-primary/80">English Teacher Control Panel</p>
                  <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Easy Classroom Grading Dashboard</h1>
                  <p className="max-w-2xl text-sm text-slate-200">
                    Simple and clear workspace: choose a task, pick a student, review feedback with AI, then edit and save.
                  </p>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300">
                    Quick steps: 1) Choose task  2) Select student row  3) Click Review Student with AI  4) Edit feedback and save.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        if (selectedTask) void fetchPreview(selectedTask);
                        void fetchStats();
                      }}
                      className="rounded-lg border border-primary/35 bg-primary/15 px-4 py-2 text-xs font-bold uppercase tracking-wide text-primary transition hover:bg-primary/25"
                    >
                      Refresh Student Data
                    </button>
                    <button
                      onClick={() => selectedTask && runWorkflow(selectedTask)}
                      disabled={!selectedTask}
                      className="rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-background-dark transition hover:bg-primary/90 disabled:opacity-60"
                    >
                      <FontAwesomeIcon icon={faPlay} className="mr-2" />
                      Run Selected Task
                    </button>
                    <button
                      onClick={() => setShowAdvanced((v) => !v)}
                      className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-200 transition hover:bg-white/10"
                    >
                      {showAdvanced ? "Hide Advanced Tools" : "Show Advanced Tools"}
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/15 bg-black/35 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/85">Current Classroom View</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="flex items-center justify-between">
                      <span className="text-slate-400">Selected Task</span>
                      <span className="font-semibold text-slate-200">{selectedTask?.title || "Not selected"}</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="text-slate-400">Selected Student</span>
                      <span className="font-semibold text-slate-200">{selectedStudentName}</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="text-slate-400">Task Data Source</span>
                      <span className="font-semibold text-slate-200">{selectedTask?.dataSource || "-"}</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="text-slate-400">Visible Students</span>
                      <span className="font-semibold text-slate-200">{filteredPreview.length}</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="text-slate-400">Table Coverage</span>
                      <span className="font-semibold text-primary">{filteredRatio}%</span>
                    </p>
                  </div>
                  {studentInsight?.overview && (
                    <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3">
                      <p className="text-[11px] uppercase tracking-[0.15em] text-slate-400">Student Snapshot</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${riskToneClass}`}>
                          Risk: {studentInsight.riskLevel.toUpperCase()}
                        </span>
                        <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold text-cyan-200">
                          Trend: {gradeTrendLabel}
                        </span>
                        <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-semibold text-slate-200">
                          Engagement: {engagementScore}/100
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-300">{recommendedAction}</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-black/35 to-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400"><FontAwesomeIcon icon={faTasks} className="mr-2 text-primary" />Classroom Tasks</p>
                <p className="mt-1 text-2xl font-bold">{tasks.length}</p>
                <p className="text-xs text-slate-400">{readyCount} tasks ready to run</p>
                <div className="mt-2 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-primary" style={{ width: `${tasks.length ? Math.round((readyCount / tasks.length) * 100) : 0}%` }} /></div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-black/35 to-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400"><FontAwesomeIcon icon={faDatabase} className="mr-2 text-cyan-300" />Student Rows</p>
                <p className="mt-1 text-2xl font-bold">{preview.length}</p>
                <p className="text-xs text-slate-400">{filteredPreview.length} shown after search</p>
                <div className="mt-2 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${filteredRatio}%` }} /></div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-black/35 to-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400"><FontAwesomeIcon icon={faUsers} className="mr-2 text-emerald-300" />Students</p>
                <p className="mt-1 text-2xl font-bold">{stats?.totalStudents ?? "--"}</p>
                <p className="text-xs text-slate-400">Active now: {stats?.activeSessions ?? "--"}</p>
                <div className="mt-2 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(100, Number((stats?.activeSessions ?? 0) / 5))}%` }} /></div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-black/35 to-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400"><FontAwesomeIcon icon={faGraduationCap} className="mr-2 text-amber-300" />Average Grade</p>
                <p className="mt-1 text-2xl font-bold">{stats ? `${stats.averageGrade}%` : "--"}</p>
                <p className="text-xs text-slate-400">Courses {stats?.totalCourses ?? "--"}</p>
                <div className="mt-2 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, Number(stats?.averageGrade ?? 0))}%` }} /></div>
              </div>
            </section>

            <section className="border border-white/10 bg-black/20 rounded-2xl mb-2 overflow-hidden">
              <ExtensionDataView />
            </section>

            <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Teacher Priority</p>
                <div className={`mt-2 rounded-lg border px-3 py-2 text-sm ${teacherPriorityClass}`}>
                  {teacherPriorityTitle}
                </div>
                <p className="mt-2 text-xs text-slate-300">{recommendedAction}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Classroom Checklist</p>
                <div className="mt-2 space-y-2">
                  {classroomChecklist.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded border border-white/10 bg-black/25 px-3 py-2 text-xs">
                      <span className="flex items-center gap-2 text-slate-300">
                        <FontAwesomeIcon icon={item.done ? faCheckCircle : faExclamationTriangle} className={item.done ? "text-emerald-300" : "text-amber-300"} />
                        {item.label}
                      </span>
                      <span className="font-semibold text-slate-200">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Data Clarity</p>
                <div className="mt-2 space-y-2 text-xs">
                  <div className="rounded border border-white/10 bg-black/25 px-3 py-2 text-slate-300">Workflow health: <span className="font-semibold text-slate-100">{workflowHealth}% ready</span></div>
                  <div className="rounded border border-white/10 bg-black/25 px-3 py-2 text-slate-300">Visible table columns: <span className="font-semibold text-slate-100">{cols.length}</span></div>
                  <div className="rounded border border-white/10 bg-black/25 px-3 py-2 text-slate-300">Selected student fields: <span className="font-semibold text-slate-100">{detailFieldCount}</span></div>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
              <div className="space-y-5 xl:col-span-8">
                <section className="rounded-2xl border border-white/10 bg-black/25 p-5">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-lg font-bold">
                      <FontAwesomeIcon icon={faTasks} className="mr-2 text-primary" />
                      Classroom Tasks
                    </h2>
                    <div className="relative">
                      <FontAwesomeIcon icon={faFilter} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        value={taskFilter}
                        onChange={(e) => setTaskFilter(e.target.value)}
                        placeholder="Filter tasks..."
                        className="rounded-lg border border-white/10 bg-black/35 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/40"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {filteredTasks.map((t) => {
                      const ready = registry.hasWorkflow(t.id);
                      return (
                        <div
                          key={t.id}
                          className={`rounded-xl border p-4 transition-all ${t.id === selectedTaskId
                              ? "border-primary/55 bg-gradient-to-br from-primary/15 to-transparent"
                              : "border-white/10 bg-black/20 hover:border-primary/30"
                            }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button onClick={() => setSelectedTaskId(t.id)} className="text-left">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-primary/80">{t.icon}</p>
                              <p className="font-semibold text-slate-100">{t.title}</p>
                            </button>
                            <button
                              onClick={() => toggleActive(t.id)}
                              className={`rounded px-2 py-1 text-xs font-semibold ${t.active ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}
                            >
                              {t.active ? "Active" : "Paused"}
                            </button>
                          </div>
                          <p className="mt-2 text-sm text-slate-400">{t.description}</p>
                          <p className="mt-2 text-xs text-slate-400">Source: {t.dataSource}</p>
                          <div className="mt-3 h-1.5 rounded-full bg-white/10">
                            <div className={`h-full rounded-full ${ready ? "bg-primary" : "bg-amber-400"}`} style={{ width: ready ? "100%" : "45%" }} />
                          </div>
                          <p className={`mt-2 text-[11px] ${ready ? "text-primary" : "text-amber-300"}`}>
                            {ready ? "Ready to use" : "Needs setup"}
                          </p>
                          <div className="mt-3 flex gap-2">
                            <button onClick={() => { setSelectedTaskId(t.id); void fetchPreview(t); }} className="flex-1 rounded border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10">View Data</button>
                            <button onClick={() => { setSelectedTaskId(t.id); runWorkflow(t); }} className="flex-1 rounded bg-primary px-3 py-2 text-xs font-bold text-background-dark hover:bg-primary/90">Run Task</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {filteredTasks.length === 0 && (
                    <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-200">
                      No tasks match your filter. Try another keyword.
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-white/10 bg-black/25 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-bold"><FontAwesomeIcon icon={faDatabase} className="mr-2 text-cyan-400" />Student Work Table</h2>
                    {selectedTask && (
                      <button onClick={() => void fetchPreview(selectedTask)} className="rounded border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
                        {loadingPreview ? <><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Loading</> : "Reload"}
                      </button>
                    )}
                  </div>
                  {showAdvanced ? (
                    <div className="mb-3 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300">
                        <FontAwesomeIcon icon={faSignal} className="mr-2 text-primary" />
                        Host {DB.host}:{DB.port}
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300">
                        <FontAwesomeIcon icon={faChartLine} className="mr-2 text-cyan-300" />
                        Coverage {filteredRatio}% ({filteredPreview.length}/{preview.length})
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300">
                        <FontAwesomeIcon icon={faDatabase} className="mr-2 text-emerald-300" />
                        DB {DB.database} / {cols.length} cols
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300">
                      <FontAwesomeIcon icon={faCheckCircle} className="mr-2 text-primary" />
                      {filteredPreview.length} students shown. Selected student: {selectedStudentName}
                    </div>
                  )}
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <input
                      value={previewFilter}
                      onChange={(e) => setPreviewFilter(e.target.value)}
                      placeholder="Search inside rows..."
                      className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-xs outline-none focus:border-primary/40 sm:w-64"
                    />
                    <p className="text-xs text-slate-400">
                      Showing {filteredPreview.length} of {preview.length} rows
                    </p>
                  </div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-slate-300">Columns: {cols.length}</span>
                    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-slate-300">Coverage: {filteredRatio}%</span>
                    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-slate-300">Selected fields: {detailFieldCount}</span>
                  </div>
                  <p className="mb-2 rounded border border-primary/20 bg-primary/10 px-2 py-1 text-xs text-primary">
                    Selected row: {selectedRowExcerpt}
                  </p>
                  {loadingPreview ? (
                    <div className="rounded-xl border border-white/10 bg-black/20 p-8 text-center text-slate-400"><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Loading preview...</div>
                  ) : previewError ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300"><FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />{previewError}</div>
                  ) : filteredPreview.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-black/20 p-8 text-center text-slate-400">No preview data.</div>
                  ) : (
                    <div className="overflow-auto rounded-xl border border-white/10">
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-black/70 backdrop-blur"><tr><th className="w-10 px-2 py-2 text-left text-xs text-slate-500">#</th>{cols.map((c) => <th key={c} className="px-3 py-2 text-left text-xs text-slate-400">{humanizeKey(c)}</th>)}</tr></thead>
                        <tbody>
                          {filteredPreview.map(({ row, index }) => (
                            <tr key={index} onClick={() => setSelectedRow(index)} className={`cursor-pointer border-t border-white/5 ${selectedRow === index ? "bg-primary/15" : index % 2 === 0 ? "bg-black/10 hover:bg-white/5" : "bg-white/[0.03] hover:bg-white/10"}`}>
                              <td className="px-2 py-2 text-xs text-slate-500">{selectedRow === index ? "●" : index + 1}</td>
                              {cols.map((c) => <td key={`${c}-${index}`} className="max-w-[260px] truncate px-3 py-2">{cell(row[c])}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-slate-500">Select a row to enable AI review for a specific student.</p>
                </section>

                <section className="rounded-2xl border border-white/10 bg-black/25 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-bold">
                      <FontAwesomeIcon icon={faFileCode} className="mr-2 text-indigo-300" />
                      Student Detail Sheet
                    </h2>
                    {selectedRowData && (
                      <button
                        onClick={() => {
                          if (!detailSheetText) return;
                          if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                            void navigator.clipboard.writeText(detailSheetText);
                            appendAI("Full student detail sheet copied.");
                          }
                        }}
                        className="rounded border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10"
                      >
                        Copy Details
                      </button>
                    )}
                  </div>
                  {!selectedRowData ? (
                    <p className="text-sm text-slate-400">Select a student row to show all available student fields clearly.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {detailEntries.map(([key, value]) => (
                        <div key={key} className="rounded-lg border border-white/10 bg-black/25 p-3">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{humanizeKey(key)}</p>
                          <p className="mt-1 break-words text-sm text-slate-200">{cell(value)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <div className="space-y-5 xl:col-span-4">
                <section className="glass-panel rounded-2xl border border-white/10 p-5">
                  <h2 className="mb-2 text-lg font-bold"><FontAwesomeIcon icon={faUsers} className="mr-2 text-blue-300" />Student Profile</h2>
                  {studentInsightLoading ? (
                    <p className="text-sm text-slate-400"><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Loading student details...</p>
                  ) : studentInsightError ? (
                    <p className="rounded border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-xs text-amber-300">{studentInsightError}</p>
                  ) : studentInsight?.overview ? (
                    <div className="space-y-3 text-sm">
                      <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                        <p className="font-semibold text-slate-100">{studentInsight.overview.studentName}</p>
                        <p className="text-xs text-slate-400">ID {studentInsight.overview.studentId} {studentInsight.overview.email ? `| ${studentInsight.overview.email}` : ""}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded border border-white/10 bg-black/25 p-2"><p className="text-slate-500">Average grade</p><p className="font-bold text-slate-200">{studentInsight.overview.averageGrade}%</p></div>
                        <div className="rounded border border-white/10 bg-black/25 p-2"><p className="text-slate-500">Courses</p><p className="font-bold text-slate-200">{studentInsight.overview.coursesEnrolled}</p></div>
                        <div className="rounded border border-white/10 bg-black/25 p-2"><p className="text-slate-500">Submissions</p><p className="font-bold text-slate-200">{studentInsight.overview.submissionsCount}</p></div>
                        <div className="rounded border border-white/10 bg-black/25 p-2"><p className="text-slate-500">Inactive days</p><p className="font-bold text-slate-200">{studentInsight.inactivityDays}</p></div>
                        <div className="rounded border border-white/10 bg-black/25 p-2"><p className="text-slate-500">Grade trend</p><p className={`font-bold ${trendToneClass}`}>{gradeTrendLabel}{gradeSeries.length >= 2 ? ` (${gradeTrendDelta > 0 ? "+" : ""}${gradeTrendDelta})` : ""}</p></div>
                        <div className="rounded border border-white/10 bg-black/25 p-2"><p className="text-slate-500">Engagement</p><p className={`font-bold ${engagementToneClass}`}>{engagementScore}/100</p></div>
                        <div className="col-span-2 rounded border border-white/10 bg-black/25 p-2"><p className="text-slate-500">Last activity</p><p className="font-semibold text-slate-200">{formatUnixDate(studentInsight.overview.lastAccessUnix)}</p></div>
                      </div>
                      <div className={`rounded border px-2 py-2 text-xs ${riskToneClass}`}>
                        Risk level: {studentInsight.riskLevel.toUpperCase()} (score {studentInsight.riskScore})
                      </div>
                      <div className="rounded border border-cyan-400/25 bg-cyan-500/10 px-2 py-2 text-xs text-cyan-100">
                        <p className="font-semibold uppercase tracking-[0.14em] text-cyan-200/90">Recommended teacher action</p>
                        <p className="mt-1">{recommendedAction}</p>
                      </div>
                      <div className="rounded border border-white/10 bg-black/25 p-2 text-xs text-slate-300">
                        {studentInsight.notes.map((note, idx) => (
                          <p key={idx} className="mb-1 last:mb-0">- {note}</p>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          if (!studentSummaryText) return;
                          if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                            void navigator.clipboard.writeText(studentSummaryText);
                            appendAI("Student summary copied for teacher notes.");
                          }
                        }}
                        className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10"
                      >
                        Copy Student Summary
                      </button>
                      {showAdvanced && selectedTask && wf && (
                        <div className="rounded border border-white/10 bg-black/25 p-2 text-xs text-slate-400">
                          Task: {selectedTask.title} | Nodes: {wf.workflow?.nodes?.length || 0} | Output: {wf.outputFormat}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Select a student row to see full profile details.</p>
                  )}
                </section>

                <section className="glass-panel rounded-2xl border border-white/10 p-5">
                  <h2 className="mb-2 text-lg font-bold"><FontAwesomeIcon icon={faChartLine} className="mr-2 text-cyan-300" />Recent Student Progress</h2>
                  {!studentInsight?.overview ? (
                    <p className="text-xs text-slate-400">Select a student to view recent grades and activity.</p>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Recent grades</p>
                        {studentInsight.recentGrades.length ? (
                          <div className="space-y-1 text-xs">
                            {studentInsight.recentGrades.slice(0, 4).map((g, i) => (
                              <div key={i} className="rounded border border-white/10 bg-black/25 px-2 py-1">
                                <div className="flex items-center justify-between">
                                  <span className="truncate pr-2 text-slate-300">{cell(g.assessment)}</span>
                                  <span className="font-semibold text-slate-200">{cell(g.grade)} / {cell(g.max_grade)}</span>
                                </div>
                                <div className="mt-1 h-1.5 rounded-full bg-white/10">
                                  <div
                                    className={`h-full rounded-full ${numericValue(g.max_grade) > 0 && (numericValue(g.grade) / numericValue(g.max_grade)) * 100 >= 70
                                        ? "bg-emerald-400"
                                        : "bg-amber-400"
                                      }`}
                                    style={{
                                      width: `${Math.max(
                                        0,
                                        Math.min(
                                          100,
                                          numericValue(g.max_grade) > 0
                                            ? Math.round((numericValue(g.grade) / numericValue(g.max_grade)) * 100)
                                            : 0
                                        )
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">No recent graded items found.</p>
                        )}
                      </div>
                      <div>
                        <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Recent activity</p>
                        {studentInsight.recentActivity.length ? (
                          <div className="space-y-1 text-xs">
                            {studentInsight.recentActivity.slice(0, 4).map((a, i) => (
                              <div key={i} className="rounded border border-white/10 bg-black/25 px-2 py-1 text-slate-300">
                                {cell(a.action)} {cell(a.target)} ({cell(a.activity_time)})
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">No recent activity logs found.</p>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                <section className="glass-panel rounded-2xl border border-white/10 p-5">
                  <h2 className="mb-2 text-lg font-bold"><FontAwesomeIcon icon={faCheckCircle} className="mr-2 text-green-400" />Review Selected Student</h2>
                  <p className="mb-2 text-xs text-slate-300">{selectedRowData ? selectedRowExcerpt : "No student row selected."}</p>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => setReviewPrompt("Give a short English-teacher summary with score /100, two strengths, two improvements, and one next step.")}
                      className="rounded border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-white/10"
                    >
                      Quick Summary
                    </button>
                    <button
                      onClick={() => setReviewPrompt("Provide detailed language feedback for grammar, vocabulary, coherence, and clarity. Include score /100 and practical corrections.")}
                      className="rounded border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-white/10"
                    >
                      Detailed Correction
                    </button>
                    <button
                      onClick={() => setReviewPrompt("Write supportive and motivating feedback for this student in simple English, include score /100 and one action for home practice.")}
                      className="rounded border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-white/10"
                    >
                      Motivational Tone
                    </button>
                  </div>
                  <textarea value={reviewPrompt} onChange={(e) => setReviewPrompt(e.target.value)} rows={4} className="mb-2 w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-primary/40" />
                  {reviewError && <p className="mb-2 text-xs text-red-300">{reviewError}</p>}
                  <button onClick={() => void reviewSelectedStudent()} disabled={reviewBusy || !selectedTask || !selectedRowData} className="w-full rounded bg-primary px-3 py-2 text-sm font-bold text-background-dark disabled:opacity-60">
                    {reviewBusy ? <><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Reviewing...</> : "Review Student with AI"}
                  </button>
                </section>

                <section className="glass-panel rounded-2xl border border-white/10 p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-lg font-bold"><FontAwesomeIcon icon={faCog} className="mr-2 text-amber-300" />Feedback Editor</h2>
                    {savedAt && <span className="text-xs text-slate-400">Saved {savedAt}</span>}
                  </div>
                  <div className="mb-2 flex items-center justify-between rounded border border-white/10 bg-black/25 px-3 py-2 text-xs">
                    <span className="text-slate-300">Draft length: <span className="font-semibold text-slate-100">{draftWordCount} words</span></span>
                    <span className={hasDraft ? "text-emerald-300" : "text-slate-400"}>{hasDraft ? "Ready to save" : "Draft is empty"}</span>
                  </div>
                  <textarea value={outputDraft} onChange={(e) => setOutputDraft(e.target.value)} rows={10} placeholder="Edit the final student feedback here..." className="mb-2 w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-primary/40" />
                  <button
                    onClick={() =>
                      setOutputDraft((prev) =>
                        prev
                          ? `${prev}\n\nStrengths:\n- \n- \n\nAreas to improve:\n- \n- \n\nNext step:\n- `
                          : "Strengths:\n- \n- \n\nAreas to improve:\n- \n- \n\nNext step:\n- "
                      )
                    }
                    className="mb-2 w-full rounded border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
                  >
                    Insert Teacher Feedback Template
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => { if (typeof window !== "undefined") { localStorage.setItem(OUTPUT_KEY, outputDraft); setSavedAt(now()); } }} className="flex-1 rounded border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-bold text-primary">Save Draft</button>
                    <button onClick={() => { setOutputDraft(""); if (typeof window !== "undefined") localStorage.removeItem(OUTPUT_KEY); setSavedAt(""); }} className="flex-1 rounded border border-white/15 bg-white/5 px-3 py-2 text-xs">Clear Text</button>
                  </div>
                </section>

                {showAdvanced && (
                  <section className="glass-panel rounded-2xl border border-white/10 p-5">
                    <h2 className="mb-2 text-lg font-bold"><FontAwesomeIcon icon={faPlus} className="mr-2 text-primary" />Create Custom Task (Advanced)</h2>
                    <input value={newTask.title} onChange={(e) => setNewTask((v) => ({ ...v, title: e.target.value }))} placeholder="Task title (optional)" className="mb-2 w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm" />
                    <input value={newTask.icon} onChange={(e) => setNewTask((v) => ({ ...v, icon: e.target.value }))} placeholder="Task code/icon" className="mb-2 w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm" />
                    <textarea value={newTask.description} onChange={(e) => setNewTask((v) => ({ ...v, description: e.target.value }))} rows={2} placeholder="Description (required)" className="mb-2 w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm" />
                    <textarea value={newTask.prompt} onChange={(e) => setNewTask((v) => ({ ...v, prompt: e.target.value }))} rows={3} placeholder="AI prompt (required)" className="mb-2 w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm" />
                    {createErr && <p className="mb-2 text-xs text-red-300">{createErr}</p>}
                    <button onClick={() => void createTask()} disabled={creating} className="w-full rounded bg-primary px-3 py-2 text-sm font-bold text-background-dark disabled:opacity-60">
                      {creating ? <><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Generating...</> : "Create Task + JSON Workflow"}
                    </button>
                  </section>
                )}
              </div>
            </div>

            {statsError && <section className="rounded border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-300"><FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />{statsError}</section>}

            <section className="glass-panel rounded-2xl border border-white/10 p-5 lg:hidden">
              <h2 className="mb-2 text-lg font-bold">AI Assistant</h2>
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[90%] rounded px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-background-dark" : "bg-white/5"}`}>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      <p className="text-[10px] opacity-70">{m.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void sendChat(); }} placeholder='Type "help commands" to control dashboard' className="flex-1 rounded border border-white/10 bg-black/30 px-3 py-2 text-sm" />
                <button onClick={() => void sendChat()} disabled={assistantBusy} className="rounded bg-primary px-4 py-2 text-background-dark disabled:opacity-60"><FontAwesomeIcon icon={faPaperPlane} /></button>
              </div>
            </section>
          </div>
        </main>

        <aside className="hidden h-full w-1/4 flex-col border-l border-white/10 bg-background-dark/40 lg:flex">
          <div className="border-b border-white/10 p-5">
            <p className="text-sm uppercase tracking-[0.22em] text-primary/70">AI Assistant</p>
            <p className="mt-1 text-xs text-slate-400">Full system control through chat commands.</p>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[92%] rounded px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-background-dark" : "bg-white/5"}`}>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  <p className="text-[10px] opacity-70">{m.time}</p>
                </div>
              </div>
            ))}
            {assistantBusy && <div className="text-sm text-slate-400"><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Thinking...</div>}
          </div>
          <div className="border-t border-white/10 p-4">
            <div className="flex gap-2">
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void sendChat(); }} placeholder='Type "help commands" to control dashboard' className="flex-1 rounded border border-white/10 bg-black/30 px-3 py-2 text-sm" />
              <button onClick={() => void sendChat()} disabled={assistantBusy} className="rounded bg-primary px-4 py-2 text-background-dark disabled:opacity-60"><FontAwesomeIcon icon={faPaperPlane} /></button>
            </div>
          </div>
        </aside>
      </div>

      <RealWorkflowModal isOpen={openRunModal} onClose={() => { setOpenRunModal(false); setRunTaskState(null); }} taskId={runTaskState?.id || null} />
    </div>
  );
}
