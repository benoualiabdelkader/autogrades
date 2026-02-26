import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faSave, faCopy } from "@fortawesome/free-solid-svg-icons";

interface FeedbackEditorProps {
  outputDraft: string;
  reviewPrompt: string;
  reviewBusy: boolean;
  reviewError: string;
  savedAt: string;
  onSetOutputDraft: (draft: string) => void;
  onSetReviewPrompt: (prompt: string) => void;
  onReviewSelected: () => void;
  onSaveDraft: () => void;
  onCopyDraft: () => void;
}

export default function FeedbackEditor({
  outputDraft,
  reviewPrompt,
  reviewBusy,
  reviewError,
  savedAt,
  onSetOutputDraft,
  onSetReviewPrompt,
  onReviewSelected,
  onSaveDraft,
  onCopyDraft,
}: FeedbackEditorProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold mb-4">Feedback Editor</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Review Prompt</label>
        <textarea
          value={reviewPrompt}
          onChange={(e) => onSetReviewPrompt(e.target.value)}
          className="w-full px-3 py-2 border rounded text-sm"
          rows={3}
          placeholder="Enter AI review instructions..."
        />
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={onReviewSelected}
          disabled={reviewBusy}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 text-sm"
        >
          {reviewBusy ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
              Reviewing...
            </>
          ) : (
            "Review Selected Student"
          )}
        </button>
      </div>

      {reviewError && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <span className="text-sm text-red-700">{reviewError}</span>
        </div>
      )}

      <div className="mb-2">
        <label className="block text-sm font-medium mb-2">Generated Feedback</label>
        <textarea
          value={outputDraft}
          onChange={(e) => onSetOutputDraft(e.target.value)}
          className="w-full px-3 py-2 border rounded text-sm font-mono"
          rows={12}
          placeholder="AI-generated feedback will appear here..."
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {savedAt && `Last saved: ${savedAt}`}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCopyDraft}
            disabled={!outputDraft.trim()}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 text-sm"
          >
            <FontAwesomeIcon icon={faCopy} className="mr-1" />
            Copy
          </button>
          <button
            onClick={onSaveDraft}
            disabled={!outputDraft.trim()}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
          >
            <FontAwesomeIcon icon={faSave} className="mr-1" />
            Save Draft
          </button>
        </div>
      </div>
    </div>
  );
}
