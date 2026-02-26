import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronRight, faCopy } from '@fortawesome/free-solid-svg-icons';

interface JsonViewerProps {
    data: any;
    name?: string;
    collapsed?: boolean;
    theme?: 'dark' | 'light';
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ 
    data, 
    name = 'root', 
    collapsed = false,
    theme = 'dark' 
}) => {
    const [isCollapsed, setIsCollapsed] = useState(collapsed);
    const [copiedPath, setCopiedPath] = useState<string | null>(null);

    const handleCopy = (value: any, path: string) => {
        navigator.clipboard.writeText(JSON.stringify(value, null, 2));
        setCopiedPath(path);
        setTimeout(() => setCopiedPath(null), 1500);
    };

    const renderValue = (value: any, key: string, path: string): JSX.Element => {
        const fullPath = path ? `${path}.${key}` : key;

        if (value === null) {
            return <span className="text-gray-500">null</span>;
        }

        if (typeof value === 'boolean') {
            return <span className="text-purple-400">{value.toString()}</span>;
        }

        if (typeof value === 'number') {
            return <span className="text-blue-400">{value}</span>;
        }

        if (typeof value === 'string') {
            return <span className="text-green-400">&quot;{value}&quot;</span>;
        }

        if (Array.isArray(value)) {
            return (
                <JsonNode
                    data={value}
                    name={key}
                    path={fullPath}
                    isArray={true}
                    onCopy={handleCopy}
                    copiedPath={copiedPath}
                />
            );
        }

        if (typeof value === 'object') {
            return (
                <JsonNode
                    data={value}
                    name={key}
                    path={fullPath}
                    isArray={false}
                    onCopy={handleCopy}
                    copiedPath={copiedPath}
                />
            );
        }

        return <span>{String(value)}</span>;
    };

    return (
        <div className={`json-viewer font-mono text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
            {renderValue(data, name, '')}
        </div>
    );
};

interface JsonNodeProps {
    data: any;
    name: string;
    path: string;
    isArray: boolean;
    onCopy: (value: any, path: string) => void;
    copiedPath: string | null;
}

const JsonNode: React.FC<JsonNodeProps> = ({ data, name, path, isArray, onCopy, copiedPath }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const entries = isArray ? data : Object.entries(data);
    const length = isArray ? data.length : Object.keys(data).length;

    return (
        <div className="json-node">
            <div className="flex items-center gap-2 hover:bg-white/5 rounded px-1 group">
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    <FontAwesomeIcon 
                        icon={isCollapsed ? faChevronRight : faChevronDown as any} 
                        className="w-3 h-3"
                    />
                </button>
                <span className="text-yellow-400">{name}</span>
                <span className="text-gray-500">
                    {isArray ? '[' : '{'}
                    {isCollapsed && (
                        <span className="text-gray-600 text-xs ml-1">
                            {length} {isArray ? 'items' : 'keys'}
                        </span>
                    )}
                </span>
                <button
                    onClick={() => onCopy(data, path)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-primary transition-all ml-auto"
                    title="Copy to clipboard"
                >
                    <FontAwesomeIcon icon={faCopy as any} className="w-3 h-3" />
                    {copiedPath === path && (
                        <span className="text-xs text-green-400 ml-1">✓</span>
                    )}
                </button>
            </div>

            {!isCollapsed && (
                <div className="ml-6 border-l border-white/10 pl-4 mt-1">
                    {isArray ? (
                        data.map((item: any, index: number) => (
                            <div key={index} className="my-1">
                                <span className="text-gray-500">{index}: </span>
                                {renderNestedValue(item, String(index), `${path}[${index}]`, onCopy, copiedPath)}
                            </div>
                        ))
                    ) : (
                        Object.entries(data).map(([key, value]) => (
                            <div key={key} className="my-1">
                                <span className="text-yellow-400">{key}</span>
                                <span className="text-gray-500">: </span>
                                {renderNestedValue(value, key, `${path}.${key}`, onCopy, copiedPath)}
                            </div>
                        ))
                    )}
                </div>
            )}

            <span className="text-gray-500">{isArray ? ']' : '}'}</span>
        </div>
    );
};

const renderNestedValue = (
    value: any, 
    key: string, 
    path: string, 
    onCopy: (value: any, path: string) => void,
    copiedPath: string | null
): JSX.Element => {
    if (value === null) {
        return <span className="text-gray-500">null</span>;
    }

    if (typeof value === 'boolean') {
        return <span className="text-purple-400">{value.toString()}</span>;
    }

    if (typeof value === 'number') {
        return <span className="text-blue-400">{value}</span>;
    }

    if (typeof value === 'string') {
        return <span className="text-green-400">&quot;{value}&quot;</span>;
    }

    if (Array.isArray(value)) {
        return (
            <JsonNode
                data={value}
                name={key}
                path={path}
                isArray={true}
                onCopy={onCopy}
                copiedPath={copiedPath}
            />
        );
    }

    if (typeof value === 'object') {
        return (
            <JsonNode
                data={value}
                name={key}
                path={path}
                isArray={false}
                onCopy={onCopy}
                copiedPath={copiedPath}
            />
        );
    }

    return <span>{String(value)}</span>;
};

export default JsonViewer;
