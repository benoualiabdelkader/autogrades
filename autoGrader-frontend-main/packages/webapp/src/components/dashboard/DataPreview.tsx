import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDatabase, faExclamationTriangle, faFilter, faSpinner } from "@fortawesome/free-solid-svg-icons";

type PreviewRow = Record<string, unknown>;

interface DataPreviewProps {
  preview: PreviewRow[];
  selectedRow: number | null;
  previewFilter: string;
  loadingPreview: boolean;
  previewError: string;
  onSelectRow: (index: number) => void;
  onSetPreviewFilter: (filter: string) => void;
  onFetchPreview: () => void;
}

const cell = (v: unknown) => (v === null || v === undefined ? "-" : typeof v === "object" ? JSON.stringify(v) : String(v));

export default function DataPreview({
  preview,
  selectedRow,
  previewFilter,
  loadingPreview,
  previewError,
  onSelectRow,
  onSetPreviewFilter,
  onFetchPreview,
}: DataPreviewProps) {
  const normalize = (v: string) => v.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

  const filteredPreview = React.useMemo(() => {
    const q = normalize(previewFilter);
    const indexed = preview.map((row, index) => ({ row, index }));
    if (!q) return indexed;
    return indexed.filter(({ row }) =>
      Object.values(row).some((value) => normalize(cell(value)).includes(q))
    );
  }, [preview, previewFilter]);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FontAwesomeIcon icon={faDatabase} />
          Data Preview ({preview.length} rows)
        </h2>
        <button
          onClick={onFetchPreview}
          disabled={loadingPreview}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
        >
          {loadingPreview ? <FontAwesomeIcon icon={faSpinner} spin /> : "Refresh"}
        </button>
      </div>

      <input
        type="text"
        placeholder="Filter rows..."
        value={previewFilter}
        onChange={(e) => onSetPreviewFilter(e.target.value)}
        className="w-full px-3 py-2 border rounded mb-3 text-sm"
      />

      {previewError && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-3 flex items-center gap-2">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500" />
          <span className="text-sm text-red-700">{previewError}</span>
        </div>
      )}

      <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded">
        {filteredPreview.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {preview.length === 0 ? "No data available. Click Refresh to load." : "No rows match your filter."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-medium">#</th>
                {Object.keys(filteredPreview[0].row).map((key) => (
                  <th key={key} className="px-3 py-2 text-left font-medium">
                    {key.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPreview.map(({ row, index }) => (
                <tr
                  key={index}
                  onClick={() => onSelectRow(index)}
                  className={`cursor-pointer transition ${
                    selectedRow === index ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-3 py-2 border-t">{index + 1}</td>
                  {Object.values(row).map((value, i) => (
                    <td key={i} className="px-3 py-2 border-t">
                      {cell(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
