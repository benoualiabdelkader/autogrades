import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlus, 
    faTrash, 
    faEdit, 
    faSave, 
    faTimes,
    faChevronDown,
    faChevronRight
} from '@fortawesome/free-solid-svg-icons';

interface JsonEditorProps {
    initialData: any;
    onChange?: (data: any) => void;
    readOnly?: boolean;
}

export const JsonEditor: React.FC<JsonEditorProps> = ({ 
    initialData, 
    onChange,
    readOnly = false 
}) => {
    const [data, setData] = useState(initialData);
    const [editingPath, setEditingPath] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    useEffect(() => {
        setData(initialData);
    }, [initialData]);

    const handleUpdate = (path: string[], value: any) => {
        const newData = JSON.parse(JSON.stringify(data));
        let current = newData;
        
        for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]];
        }
        
        current[path[path.length - 1]] = value;
        setData(newData);
        onChange?.(newData);
    };

    const handleDelete = (path: string[]) => {
        const newData = JSON.parse(JSON.stringify(data));
        let current = newData;
        
        for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]];
        }
        
        if (Array.isArray(current)) {
            current.splice(Number(path[path.length - 1]), 1);
        } else {
            delete current[path[path.length - 1]];
        }
        
        setData(newData);
        onChange?.(newData);
    };

    const handleAdd = (path: string[], isArray: boolean) => {
        const newData = JSON.parse(JSON.stringify(data));
        let current = newData;
        
        for (const key of path) {
            current = current[key];
        }
        
        if (isArray) {
            current.push(null);
        } else {
            current['newKey'] = null;
        }
        
        setData(newData);
        onChange?.(newData);
    };

    const startEdit = (path: string, value: any) => {
        setEditingPath(path);
        setEditValue(JSON.stringify(value));
    };

    const saveEdit = (path: string[]) => {
        try {
            const value = JSON.parse(editValue);
            handleUpdate(path, value);
            setEditingPath(null);
        } catch (error) {
            // If not valid JSON, treat as string
            handleUpdate(path, editValue);
            setEditingPath(null);
        }
    };

    const cancelEdit = () => {
        setEditingPath(null);
        setEditValue('');
    };

    return (
        <div className="json-editor font-mono text-sm">
            <JsonNode
                data={data}
                path={[]}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onAdd={handleAdd}
                editingPath={editingPath}
                editValue={editValue}
                setEditValue={setEditValue}
                startEdit={startEdit}
                saveEdit={saveEdit}
                cancelEdit={cancelEdit}
                readOnly={readOnly}
            />
        </div>
    );
};

interface JsonNodeProps {
    data: any;
    path: string[];
    onUpdate: (path: string[], value: any) => void;
    onDelete: (path: string[]) => void;
    onAdd: (path: string[], isArray: boolean) => void;
    editingPath: string | null;
    editValue: string;
    setEditValue: (value: string) => void;
    startEdit: (path: string, value: any) => void;
    saveEdit: (path: string[]) => void;
    cancelEdit: () => void;
    readOnly: boolean;
    nodeKey?: string;
}

const JsonNode: React.FC<JsonNodeProps> = ({
    data,
    path,
    onUpdate,
    onDelete,
    onAdd,
    editingPath,
    editValue,
    setEditValue,
    startEdit,
    saveEdit,
    cancelEdit,
    readOnly,
    nodeKey
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const currentPath = nodeKey ? [...path, nodeKey] : path;
    const pathString = currentPath.join('.');

    if (data === null || typeof data !== 'object') {
        const isEditing = editingPath === pathString;

        return (
            <div className="flex items-center gap-2 py-1 hover:bg-white/5 rounded px-2 group">
                {nodeKey && (
                    <span className="text-yellow-400">{nodeKey}: </span>
                )}
                
                {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                        <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 bg-black/40 border border-primary/50 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                            autoFocus
                        />
                        <button
                            onClick={() => saveEdit(currentPath)}
                            className="text-green-500 hover:text-green-400"
                        >
                            <FontAwesomeIcon icon={faSave as any} className="w-3 h-3" />
                        </button>
                        <button
                            onClick={cancelEdit}
                            className="text-red-500 hover:text-red-400"
                        >
                            <FontAwesomeIcon icon={faTimes as any} className="w-3 h-3" />
                        </button>
                    </div>
                ) : (
                    <>
                        <span className={getValueColor(data)}>
                            {JSON.stringify(data)}
                        </span>
                        {!readOnly && (
                            <div className="opacity-0 group-hover:opacity-100 flex gap-2 ml-auto">
                                <button
                                    onClick={() => startEdit(pathString, data)}
                                    className="text-blue-400 hover:text-blue-300"
                                >
                                    <FontAwesomeIcon icon={faEdit as any} className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={() => onDelete(currentPath)}
                                    className="text-red-400 hover:text-red-300"
                                >
                                    <FontAwesomeIcon icon={faTrash as any} className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    }

    const isArray = Array.isArray(data);
    const entries = isArray ? data : Object.entries(data);

    return (
        <div className="json-node">
            <div className="flex items-center gap-2 py-1 hover:bg-white/5 rounded px-2 group">
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="text-gray-400 hover:text-white"
                >
                    <FontAwesomeIcon
                        icon={isCollapsed ? faChevronRight : faChevronDown as any}
                        className="w-3 h-3"
                    />
                </button>
                
                {nodeKey && (
                    <span className="text-yellow-400">{nodeKey}: </span>
                )}
                
                <span className="text-gray-500">
                    {isArray ? '[' : '{'}
                    {isCollapsed && (
                        <span className="text-gray-600 text-xs ml-1">
                            {isArray ? data.length : Object.keys(data).length} items
                        </span>
                    )}
                </span>

                {!readOnly && !isCollapsed && (
                    <button
                        onClick={() => onAdd(currentPath, isArray)}
                        className="opacity-0 group-hover:opacity-100 text-green-400 hover:text-green-300 ml-auto"
                    >
                        <FontAwesomeIcon icon={faPlus as any} className="w-3 h-3" />
                    </button>
                )}
            </div>

            {!isCollapsed && (
                <div className="ml-6 border-l border-white/10 pl-4">
                    {isArray ? (
                        data.map((item: any, index: number) => (
                            <JsonNode
                                key={index}
                                data={item}
                                path={currentPath}
                                nodeKey={String(index)}
                                onUpdate={onUpdate}
                                onDelete={onDelete}
                                onAdd={onAdd}
                                editingPath={editingPath}
                                editValue={editValue}
                                setEditValue={setEditValue}
                                startEdit={startEdit}
                                saveEdit={saveEdit}
                                cancelEdit={cancelEdit}
                                readOnly={readOnly}
                            />
                        ))
                    ) : (
                        Object.entries(data).map(([key, value]) => (
                            <JsonNode
                                key={key}
                                data={value}
                                path={currentPath}
                                nodeKey={key}
                                onUpdate={onUpdate}
                                onDelete={onDelete}
                                onAdd={onAdd}
                                editingPath={editingPath}
                                editValue={editValue}
                                setEditValue={setEditValue}
                                startEdit={startEdit}
                                saveEdit={saveEdit}
                                cancelEdit={cancelEdit}
                                readOnly={readOnly}
                            />
                        ))
                    )}
                </div>
            )}

            <span className="text-gray-500 ml-6">{isArray ? ']' : '}'}</span>
        </div>
    );
};

const getValueColor = (value: any): string => {
    if (value === null) return 'text-gray-500';
    if (typeof value === 'boolean') return 'text-purple-400';
    if (typeof value === 'number') return 'text-blue-400';
    if (typeof value === 'string') return 'text-green-400';
    return 'text-white';
};

export default JsonEditor;
