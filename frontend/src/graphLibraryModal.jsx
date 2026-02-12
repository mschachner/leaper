import { useMemo, useState } from 'react';
import graphLibrary from './graphLibrary';

function GraphLibraryModal({ onLoad, onClose }) {
    const [search, setSearch] = useState('');
    const [tagFilter, setTagFilter] = useState('all');

    const allTags = useMemo(() => {
        const tags = new Set();
        graphLibrary.forEach((g) => g.tags?.forEach((t => tags.add(t))));
        return ['all', ...Array.from(tags).sort()];
    }, []);

    const filtered = useMemo(() => {
        return graphLibrary.filter((g) => {
            const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase());
            const matchesTag = tagFilter === 'all' || g.tags?.includes(tagFilter);
            return matchesSearch && matchesTag;
        })
    }, [search, tagFilter]);

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
                maxHeight: '80vh',
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
                    <select
                        value={tagFilter}
                        onChange={(e) => setTagFilter(e.target.value)}
                        style={{
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #ccc'
                        }}>
                            {allTags.map((tag)=> (
                                <option key={tag} value={tag}>
                                    {tag === 'all' ? 'All families' : tag}
                                </option>
                            ))}
                    </select>
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

    return (
        <svg
            viewBox={`${minX} ${minY} ${width} ${height}`}
            style={{
                width: '100%',
                height: '80px',
                display: 'block'
            }}>
            {graph.edges.map((e,i) => (
                <line
                    key={i}
                    x1={vertexMap[e.source].x} y1={vertexMap[e.source].y}
                    x2={vertexMap[e.target].x} y2={vertexMap[e.target].y}
                    stroke="rgb(0, 0, 0)"
                />
            ))}
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