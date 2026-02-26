import React, { useState } from 'react';
import { JsonProcessor } from '@/lib/json/JsonProcessor';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMinus, faEdit, faEquals } from '@fortawesome/free-solid-svg-icons';

interface JsonDiffProps {
    json1: string;
    json2: string;
    title1?: string;
    title2?: string;
}

export const JsonDiff: React.FC<JsonDiffProps> = ({ 
    json1, 
    json2, 
    title1 = 'Original', 
    title2 = 'Modified' 
}) => {
    const [error, setError] = useState<string | null>(null);
    const [comparison, setComparison] = useState<any>(null);

    React.useEffect(() => {
        try {
            const obj1 = JSON.parse(json1);
            const obj2 = JSON.parse(json2);
            const result = JsonProcessor.compare(obj1, obj2);
            setComparison(result);
            setError(null);
        } catch (err: any) {
            setError('Invalid JSON: ' + err.message);
            setComparison(null);
        }
    }, [json1, json2]);

    if (error) {
        return (
            <div className="glass-card p-6 text-red-500">
                <p>{error}</p>
            </div>
        );
    }

    if (!comparison) {
        return (
            <div className="glass-card p-6 text-gray-400">
                <p>Enter JSON in both fields to compare...</p>
            </div>
        );
    }

    return (
        <div className="glass-card p-6">
            <div className="mb-4">
                {comparison.equal ? (
                    <div className="flex items-center gap-2 text-green-500">
                        <FontAwesomeIcon icon={faEquals as any} />
                        <span className="font-bold">JSON objects are identical</span>
                    </div>
                ) : (
                    <div className="text-yellow-500">
                        <span className="font-bold">{comparison.differences.length} differences found</span>
                    </div>
                )}
            </div>

            {!comparison.equal && (
                <div className="space-y-2">
                    {comparison.differences.map((diff: any, index: number) => (
                        <div
                            key={index}
                            className={`p-3 rounded-lg border ${
                                diff.type === 'added'
                                    ? 'bg-green-500/10 border-green-500/30'
                                    : diff.type === 'removed'
                                    ? 'bg-red-500/10 border-red-500/30'
                                    : 'bg-yellow-500/10 border-yellow-500/30'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <FontAwesomeIcon
                                    icon={
                                        diff.type === 'added'
                                            ? faPlus
                                            : diff.type === 'removed'
                                            ? faMinus
                                            : (faEdit as any)
                                    }
                                    className={`mt-1 ${
                                        diff.type === 'added'
                                            ? 'text-green-500'
                                            : diff.type === 'removed'
                                            ? 'text-red-500'
                                            : 'text-yellow-500'
                                    }`}
                                />
                                <div className="flex-1">
                                    <div className="font-mono text-sm text-blue-400 mb-1">
                                        {diff.path}
                                    </div>
                                    <div className="text-xs space-y-1">
                                        {diff.type === 'added' && (
                                            <div className="text-green-400">
                                                + {JSON.stringify(diff.newValue)}
                                            </div>
                                        )}
                                        {diff.type === 'removed' && (
                                            <div className="text-red-400">
                                                - {JSON.stringify(diff.oldValue)}
                                            </div>
                                        )}
                                        {diff.type === 'modified' && (
                                            <>
                                                <div className="text-red-400">
                                                    - {JSON.stringify(diff.oldValue)}
                                                </div>
                                                <div className="text-green-400">
                                                    + {JSON.stringify(diff.newValue)}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default JsonDiff;
