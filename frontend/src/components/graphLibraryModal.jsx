import { useMemo, useState } from 'react';
import graphLibrary from '../lib/graphLibrary';

const TABS = [
    { label: 'All',        family: null },
    { label: 'Complete',   family: 'Complete' },
    { label: 'Cycles',     family: 'Cycles' },
    { label: 'Paths',      family: 'Paths' },
    { label: 'Grids',      family: 'Grids' },
    { label: 'Bipartite',  family: 'Bipartite' },
    { label: 'Famous',     family: 'Famous' },
  ];

function GraphLibraryModal({ onLoad, onClose, isDirected }) {
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState(null);

    // Filter library by directed/undirected first
    const directedFiltered = useMemo(() => {
        return graphLibrary.filter((g) => {
            const graphIsDirected = g.directed === true;
            return graphIsDirected === (isDirected === true);
        });
    }, [isDirected]);

    // Filter by active tab (family)
    const tabFiltered = activeTab
    ? directedFiltered.filter((g) => g.family === activeTab)
    : directedFiltered;

    // Filter by search query
    const filtered = search.trim()
        ? tabFiltered.filter((g) =>
            g.name.toLowerCase().includes(search.trim().toLowerCase())
        )
        : tabFiltered;

    return (
        <div className="modal-overlay">
            <div className="library-modal">
                {/* Header */}
                <div className="library-header">
                    <h2 className="library-title">Graph Library</h2>
                    <button
                        onClick={onClose}
                        className="library-close"
                    >×</button>
                </div>

                {/* Tab row */}
                <div className="library-tabs">
                    {TABS.map((tab) => (
                        <button
                        key={tab.label}
                        onClick={() => setActiveTab(tab.family)}
                        className={`library-tab${activeTab === tab.family ? ' active' : ''}`}
                        >
                        {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search and filter bar */}
                <div className="library-search-bar">
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="library-search-input"
                        autoFocus
                    />
                </div>

                {/* Graph list */}
                <div className="library-grid-container">
                    {filtered.length === 0 ? (
                        <div className="library-empty">
                            No graphs match your search.
                        </div>
                    ) : (
                        <div className="library-grid">
                            {filtered.map((graph) => (
                                <GraphCard key={graph.name} graph={graph} onLoad={onLoad}/>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function GraphCard({ graph, onLoad }) {
    return (
        <div
            className="graph-card"
            onClick={() => onLoad(graph)}
        >
            {/* Mini preview */}
            <MiniPreview graph={graph} />

            {/* Info */}
            <div className="graph-card-name">
                {graph.name}
            </div>
            <div className="graph-card-info">
                {graph.vertices.length} vertices, {graph.edges.length} edges
            </div>
            {graph.tags && (
                <div className="graph-card-tags">
                    {graph.tags.map((tag) => (
                        <span key={tag} className="graph-card-tag">
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

function MiniPreview({ graph }) {
    // Compute SVG viewBox from vertex positions.
    const padding = 15;
    const xs = graph.vertices.map((v) => v.x);
    const ys = graph.vertices.map((v) => v.y);
    const minX = Math.min(...xs) - padding;
    const minY = Math.min(...ys) - padding;
    const maxX = Math.max(...xs) + padding;
    const maxY = Math.max(...ys) + padding;
    const width = maxX - minX;
    const height = maxY - minY;

    const vertexMap = {};
    graph.vertices.forEach((v) => { vertexMap[v.id] = v; });

    const isDirected = graph.directed === true;

    return (
        <svg
            viewBox={`${minX} ${minY} ${width} ${height}`}
            className="mini-preview">
            {isDirected && (
                <defs>
                    <marker
                        id="arrowhead"
                        markerWidth="8" markerHeight="6"
                        refX="8" refY="3"
                        orient="auto"
                    >
                        <polygon points="0 0, 8 3, 0 6" fill="#666" />
                    </marker>
                </defs>
            )}
            {graph.edges.map((e,i) => {
                const sx = vertexMap[e.source].x, sy = vertexMap[e.source].y;
                const tx = vertexMap[e.target].x, ty = vertexMap[e.target].y;
                // For directed edges, shorten line to stop at the node radius
                if (isDirected) {
                    const dx = tx - sx, dy = ty - sy;
                    const len = Math.sqrt(dx*dx + dy*dy) || 1;
                    const r = 8; // node radius
                    const tx2 = tx - (dx/len)*r, ty2 = ty - (dy/len)*r;
                    return (
                        <line
                            key={i}
                            x1={sx} y1={sy}
                            x2={tx2} y2={ty2}
                            stroke="#666"
                            markerEnd="url(#arrowhead)"
                        />
                    );
                }
                return (
                    <line
                        key={i}
                        x1={sx} y1={sy}
                        x2={tx} y2={ty}
                        stroke="rgb(0, 0, 0)"
                    />
                );
            })}
            {graph.vertices.map((v) => (
                <circle
                    key={v.id}
                    cx={v.x} cy={v.y} r={8}
                    fill="#4a90d9"
                />
            ))}
        </svg>
    )
}

export default GraphLibraryModal;
