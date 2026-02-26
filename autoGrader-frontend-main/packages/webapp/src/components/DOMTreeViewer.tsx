import { useState } from 'react';

interface DOMNode {
  tag: string;
  id?: string;
  classes?: string[];
  attributes?: Record<string, string>;
  text?: string;
  children?: DOMNode[];
  xpath?: string;
  cssPath?: string;
  depth: number;
  index: number;
}

interface DOMTreeViewerProps {
  tree: DOMNode;
  statistics?: any;
  structure?: any;
}

export default function DOMTreeViewer({ tree, statistics, structure }: DOMTreeViewerProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set([0]));
  const [selectedNode, setSelectedNode] = useState<DOMNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [activeTab, setActiveTab] = useState<'tree' | 'stats' | 'structure'>('tree');

  const toggleNode = (index: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allIndices = new Set<number>();
    const collect = (node: DOMNode) => {
      allIndices.add(node.index);
      node.children?.forEach(collect);
    };
    collect(tree);
    setExpandedNodes(allIndices);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set([0]));
  };

  const matchesFilter = (node: DOMNode): boolean => {
    if (filterTag && node.tag !== filterTag.toLowerCase()) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        node.tag.includes(query) ||
        node.id?.includes(query) ||
        node.classes?.some(c => c.includes(query)) ||
        node.text?.toLowerCase().includes(query) ||
        false
      );
    }
    return true;
  };

  const renderNode = (node: DOMNode): JSX.Element => {
    const isExpanded = expandedNodes.has(node.index);
    const hasChildren = node.children && node.children.length > 0;
    const matches = matchesFilter(node);
    const isSelected = selectedNode?.index === node.index;

    if (!matches && !hasChildren) {
      return <></>;
    }

    return (
      <div key={node.index} className="select-none">
        <div
          className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-100 cursor-pointer ${
            isSelected ? 'bg-blue-100 border-l-2 border-blue-500' : ''
          } ${!matches ? 'opacity-50' : ''}`}
          style={{ paddingLeft: `${node.depth * 20 + 8}px` }}
          onClick={() => setSelectedNode(node)}
        >
          {/* Expand/Collapse */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.index);
              }}
              className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <span className="w-4" />}

          {/* Tag */}
          <span className="text-blue-600 font-mono text-sm">
            &lt;{node.tag}&gt;
          </span>

          {/* ID */}
          {node.id && (
            <span className="text-purple-600 text-xs font-mono">
              #{node.id}
            </span>
          )}

          {/* Classes */}
          {node.classes && node.classes.length > 0 && (
            <span className="text-xs text-gray-500">
              .{node.classes.join('.')}
            </span>
          )}

          {/* Text preview */}
          {node.text && (
            <span className="text-xs text-gray-600 truncate max-w-xs">
              {node.text.slice(0, 80)}
            </span>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children?.map((child) => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  if (!tree) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No DOM tree data available.
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Tree panel */}
      <div className="w-2/3 border rounded-lg p-3 overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="px-3 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-3 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100"
            >
              Collapse all
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              placeholder="Filter by tag (e.g. div)"
              className="px-2 py-1 text-xs border rounded"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search text, id, class..."
              className="px-2 py-1 text-xs border rounded"
            />
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-2">
          DOM tree{filterTag || searchQuery ? ' (filtered)' : ''}.
        </div>

        <div className="text-sm">
          {renderNode(tree)}
        </div>
      </div>

      {/* Details / stats panel */}
      <div className="w-1/3 flex flex-col">
        <div className="flex border-b mb-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('tree')}
            className={`flex-1 px-2 py-1 border-b-2 ${
              activeTab === 'tree'
                ? 'border-blue-500 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500'
            }`}
          >
            Node details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`flex-1 px-2 py-1 border-b-2 ${
              activeTab === 'stats'
                ? 'border-blue-500 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500'
            }`}
          >
            Stats
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('structure')}
            className={`flex-1 px-2 py-1 border-b-2 ${
              activeTab === 'structure'
                ? 'border-blue-500 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500'
            }`}
          >
            Structure
          </button>
        </div>

        <div className="flex-1 border rounded-lg p-3 overflow-auto text-xs">
          {activeTab === 'tree' && (
            <div>
              {selectedNode ? (
                <div className="space-y-2">
                  <div>
                    <div className="font-semibold mb-1">Selected node</div>
                    <div className="font-mono text-sm">
                      &lt;{selectedNode.tag}
                      {selectedNode.id && <> id=&quot;{selectedNode.id}&quot;</>}
                      {selectedNode.classes && selectedNode.classes.length > 0 && (
                        <> class=&quot;{selectedNode.classes.join(' ')}&quot;</>
                      )}
                      &gt;
                    </div>
                  </div>

                  {selectedNode.attributes && (
                    <div>
                      <div className="font-semibold mb-1">Attributes</div>
                      <ul className="list-disc list-inside space-y-1">
                        {Object.entries(selectedNode.attributes).map(([key, value]) => (
                          <li key={key}>
                            <span className="font-mono">{key}</span>: {String(value)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedNode.text && (
                    <div>
                      <div className="font-semibold mb-1">Text</div>
                      <p className="whitespace-pre-wrap">
                        {selectedNode.text}
                      </p>
                    </div>
                  )}

                  {(selectedNode.xpath || selectedNode.cssPath) && (
                    <div>
                      <div className="font-semibold mb-1">Selectors</div>
                      {selectedNode.xpath && (
                        <div className="mb-1">
                          <span className="font-mono text-purple-700">XPath:</span>{' '}
                          <span className="font-mono break-all">{selectedNode.xpath}</span>
                        </div>
                      )}
                      {selectedNode.cssPath && (
                        <div>
                          <span className="font-mono text-blue-700">CSS:</span>{' '}
                          <span className="font-mono break-all">{selectedNode.cssPath}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500">
                  Select a node in the tree to view details.
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div>
              {statistics ? (
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(statistics, null, 2)}
                </pre>
              ) : (
                <div className="text-gray-500">No statistics available.</div>
              )}
            </div>
          )}

          {activeTab === 'structure' && (
            <div>
              {structure ? (
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(structure, null, 2)}
                </pre>
              ) : (
                <div className="text-gray-500">No structure data available.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}