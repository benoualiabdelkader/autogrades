import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faPaperPlane, faSpinner } from "@fortawesome/free-solid-svg-icons";

type Task = {
  id: number;
  title: string;
  description: string;
  active: boolean;
  isCustom?: boolean;
};

interface TaskListProps {
  tasks: Task[];
  selectedTaskId: number;
  taskFilter: string;
  readyCount: number;
  hasWorkflow: (id: number) => boolean;
  onSelectTask: (id: number) => void;
  onToggleActive: (id: number) => void;
  onSetTaskFilter: (filter: string) => void;
}

export default function TaskList({
  tasks,
  selectedTaskId,
  taskFilter,
  readyCount,
  hasWorkflow,
  onSelectTask,
  onToggleActive,
  onSetTaskFilter,
}: TaskListProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Tasks ({readyCount}/{tasks.length} ready)</h2>
      </div>

      <input
        type="text"
        placeholder="Filter tasks..."
        value={taskFilter}
        onChange={(e) => onSetTaskFilter(e.target.value)}
        className="w-full px-3 py-2 border rounded mb-3 text-sm"
      />

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {tasks.map((task) => {
          const ready = hasWorkflow(task.id);
          const selected = task.id === selectedTaskId;

          return (
            <div
              key={task.id}
              onClick={() => onSelectTask(task.id)}
              className={`p-3 rounded cursor-pointer transition ${
                selected ? "bg-blue-50 border-2 border-blue-500" : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">{task.icon || "TSK"}</span>
                    <span className="font-medium text-sm">{task.title}</span>
                    {task.isCustom && <span className="text-xs text-purple-600">(custom)</span>}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                </div>

                <div className="flex items-center gap-2 ml-2">
                  {ready ? (
                    <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />
                  ) : (
                    <FontAwesomeIcon icon={faSpinner} className="text-gray-400" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleActive(task.id);
                    }}
                    className={`px-2 py-1 text-xs rounded ${
                      task.active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {task.active ? "Active" : "Paused"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
