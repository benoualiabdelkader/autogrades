import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSpinner } from "@fortawesome/free-solid-svg-icons";

type NewTaskForm = { title: string; description: string; prompt: string; icon: string };

interface CreateTaskFormProps {
  newTask: NewTaskForm;
  creating: boolean;
  createErr: string;
  onSetNewTask: (task: NewTaskForm) => void;
  onCreateTask: () => void;
}

export default function CreateTaskForm({
  newTask,
  creating,
  createErr,
  onSetNewTask,
  onCreateTask,
}: CreateTaskFormProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <FontAwesomeIcon icon={faPlus} />
        Create Custom Task
      </h2>

      {createErr && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <span className="text-sm text-red-700">{createErr}</span>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Task Title</label>
          <input
            type="text"
            value={newTask.title}
            onChange={(e) => onSetNewTask({ ...newTask, title: e.target.value })}
            placeholder="e.g., Analyze Essay Structure"
            className="w-full px-3 py-2 border rounded text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <input
            type="text"
            value={newTask.description}
            onChange={(e) => onSetNewTask({ ...newTask, description: e.target.value })}
            placeholder="Brief description of what this task does"
            className="w-full px-3 py-2 border rounded text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">AI Prompt</label>
          <textarea
            value={newTask.prompt}
            onChange={(e) => onSetNewTask({ ...newTask, prompt: e.target.value })}
            placeholder="Instructions for the AI model..."
            className="w-full px-3 py-2 border rounded text-sm"
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Icon Code (3 chars)</label>
          <input
            type="text"
            value={newTask.icon}
            onChange={(e) => onSetNewTask({ ...newTask, icon: e.target.value.slice(0, 3).toUpperCase() })}
            placeholder="CUS"
            maxLength={3}
            className="w-full px-3 py-2 border rounded text-sm font-mono"
          />
        </div>

        <button
          onClick={onCreateTask}
          disabled={creating || !newTask.description.trim() || !newTask.prompt.trim()}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
              Creating Task...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Create Task
            </>
          )}
        </button>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        Custom tasks will automatically generate n8n workflows and be saved to local storage.
      </div>
    </div>
  );
}
