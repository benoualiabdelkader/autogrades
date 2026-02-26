import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faGraduationCap, faSignal, faChartLine } from "@fortawesome/free-solid-svg-icons";

type Stats = {
  totalStudents: number;
  totalCourses: number;
  activeSessions: number;
  averageGrade: number;
  simulated?: boolean;
};

interface StatsPanelProps {
  stats: Stats | null;
  statsError: string;
  onRefreshStats: () => void;
}

export default function StatsPanel({ stats, statsError, onRefreshStats }: StatsPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">System Statistics</h2>
        <button
          onClick={onRefreshStats}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      {statsError && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <span className="text-sm text-red-700">{statsError}</span>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded p-3">
            <div className="flex items-center gap-2 mb-1">
              <FontAwesomeIcon icon={faUsers} className="text-blue-500" />
              <span className="text-sm font-medium">Total Students</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
          </div>

          <div className="bg-green-50 rounded p-3">
            <div className="flex items-center gap-2 mb-1">
              <FontAwesomeIcon icon={faGraduationCap} className="text-green-500" />
              <span className="text-sm font-medium">Total Courses</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalCourses}</div>
          </div>

          <div className="bg-purple-50 rounded p-3">
            <div className="flex items-center gap-2 mb-1">
              <FontAwesomeIcon icon={faSignal} className="text-purple-500" />
              <span className="text-sm font-medium">Active Sessions</span>
            </div>
            <div className="text-2xl font-bold">{stats.activeSessions}</div>
          </div>

          <div className="bg-yellow-50 rounded p-3">
            <div className="flex items-center gap-2 mb-1">
              <FontAwesomeIcon icon={faChartLine} className="text-yellow-500" />
              <span className="text-sm font-medium">Average Grade</span>
            </div>
            <div className="text-2xl font-bold">{stats.averageGrade.toFixed(1)}%</div>
          </div>
        </div>
      )}

      {stats?.simulated && (
        <div className="mt-3 text-xs text-gray-500 text-center">
          * Simulated data (database not connected)
        </div>
      )}
    </div>
  );
}
