import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";

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

interface StudentInsightProps {
  studentInsight: StudentInsight | null;
  studentInsightLoading: boolean;
  studentInsightError: string;
  onFetchInsight: () => void;
}

const formatUnixDate = (unix: number) =>
  unix > 0 ? new Date(unix * 1000).toLocaleString() : "No recent activity";

export default function StudentInsight({
  studentInsight,
  studentInsightLoading,
  studentInsightError,
  onFetchInsight,
}: StudentInsightProps) {
  const getRiskColor = (level: string) => {
    switch (level) {
      case "high": return "text-red-600 bg-red-50";
      case "medium": return "text-yellow-600 bg-yellow-50";
      case "low": return "text-green-600 bg-green-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Student Insight</h2>
        <button
          onClick={onFetchInsight}
          disabled={studentInsightLoading}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
        >
          {studentInsightLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : "Load Insight"}
        </button>
      </div>

      {studentInsightError && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 flex items-center gap-2">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500" />
          <span className="text-sm text-red-700">{studentInsightError}</span>
        </div>
      )}

      {studentInsight && studentInsight.overview && (
        <div className="space-y-4">
          <div className="border-b pb-3">
            <h3 className="font-semibold text-lg">{studentInsight.overview.studentName}</h3>
            <p className="text-sm text-gray-600">{studentInsight.overview.email}</p>
            <p className="text-xs text-gray-500 mt-1">ID: {studentInsight.overview.studentId}</p>
          </div>

          <div className={`p-3 rounded ${getRiskColor(studentInsight.riskLevel)}`}>
            <div className="font-semibold">Risk Level: {studentInsight.riskLevel.toUpperCase()}</div>
            <div className="text-sm">Risk Score: {studentInsight.riskScore}/10</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-600">Courses Enrolled</div>
              <div className="text-xl font-bold">{studentInsight.overview.coursesEnrolled}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-600">Average Grade</div>
              <div className="text-xl font-bold">{studentInsight.overview.averageGrade.toFixed(1)}%</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-600">Submissions</div>
              <div className="text-xl font-bold">{studentInsight.overview.submissionsCount}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-600">Inactive Days</div>
              <div className="text-xl font-bold">{studentInsight.inactivityDays}</div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Last Access</h4>
            <p className="text-sm text-gray-700">{formatUnixDate(studentInsight.overview.lastAccessUnix)}</p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Notes</h4>
            <ul className="list-disc list-inside space-y-1">
              {studentInsight.notes.map((note, idx) => (
                <li key={idx} className="text-sm text-gray-700">{note}</li>
              ))}
            </ul>
          </div>

          {studentInsight.recentGrades.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Recent Grades</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {studentInsight.recentGrades.map((grade, idx) => (
                  <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                    {JSON.stringify(grade)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!studentInsight && !studentInsightLoading && !studentInsightError && (
        <div className="text-center text-gray-500 py-8">
          Select a student row and click &quot;Load Insight&quot; to view detailed information.
        </div>
      )}
    </div>
  );
}
