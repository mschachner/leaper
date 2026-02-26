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
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
        }}>
            <div style={{
                background: 'rgb(129, 166, 174)',
                borderRadius: '8px',
                width: '640px',
                height: '80vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}>
                {/* Header */}
                <div style={{
                    color: '#000',
                    padding: '16px 20px',
                    borderBottom: '1px solid #ddd',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <h2 style = {{ margin: 0 }}>Graph Library</h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '20px',
                            cursor: 'pointer',
                            color: '#000',
                            padding: '4px 8px',
                        }}>x</button>
                </div>

                {/* Tab row */}
                <div style={{
                    display: 'flex',
                    gap: '0px',
                    borderBottom: '1px solid #ddd',
                    marginBottom: '12px',
                    minHeight: '30px',
                    overflowX: 'auto',
                    }}>
                    {TABS.map((tab) => (
                        <button
                        key={tab.label}
                        onClick={() => setActiveTab(tab.family)}
                        style={{
                            padding: '8px 14px',
                            border: 'none',
                            borderBottom: activeTab === tab.family
                            ? '2px solid #4a90d9'
                            : '2px solid transparent',
                            background: activeTab === tab.family
                            ? 'blue'
                            : 'none',
                            color: activeTab === tab.family ? '#4a90d9' : '#000',
                            fontWeight: activeTab === tab.family ? 600 : 400,
                            fontSize: '13px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'color 0.15s, border-color 0.15s',
                        }}
                        >
                        {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search and filter bar */}
                <div style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    gap: '8px'
                }}>
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '14px',
                        }}
                        autoFocus
                    />
                </div>

                {/* Graph list */}
                <div style={{
                    overflowY: 'auto',
                    padding: '12px 20px'
                }}>
                    {filtered.length === 0 ? (
                        <div style={{
                            color: '#888',
                            textAlign: 'center',
                            padding: '24px'
                        }}>
                            No graphs match your search.
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '12px'
                        }}>
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
        <div style={{
            border: '1px solid #ddd',
            background: '#fff',
            borderRadius: '6px',
            padding: '12px',
            cursor: 'pointer',
            transition: 'border-color 0.15s',
        }}
            onClick={() => onLoad(graph)}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#4a90d9'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor=  '#ddd'}
    >
        {/* Mini preview */}
        <MiniPreview graph={graph} />

        {/* Info */}
        <div style={{
            fontWeight: 'bold',
            marginTop: '8px'
        }}>
            {graph.name}
        </div>
        <div style={{
            fontSize: '13px',
            color: '#666'
        }}>
            {graph.vertices.length} vertices, {graph.edges.length} edges
        </div>
        {graph.tags && (
            <div style={{
                marginTop: '4px',
                display: 'flex',
                gap: '4px',
                flexWrap: 'wrap'
            }}>
                {graph.tags.map((tag) => (
                    <span key={tag} style={{
                        fontSize: '11px',
                        background: '#e8f0fe',
                        color: '#3367d6',
                        padding: '2px 6px',
                        borderRadius: '3px',
                    }}>
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
            style={{
                width: '100%',
                height: '80px',
                display: 'block'
            }}>
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