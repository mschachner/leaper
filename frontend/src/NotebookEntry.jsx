import { useState } from 'react';

function NotebookEntry({ entry, onRemove, onHoverHop, onUnhoverHop, selectedHop, onPerformHop, onViewSnapshot, onPinHop }) {
    return (
        <div style={{
            padding: '10px 14px',
            borderBottom: '1px solid #eee',
            position: 'relative',
        }}>
            {/* Dismiss button */}
            <button
                onClick={() => onRemove(entry.id)}
                style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    color: '#bbb',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '0 4px',
                    lineHeight: '1',
                }}
                title="Remove this entry"
            >
                ✕
            </button>

            {/* Header */}
            <EntryHeader
                entry={entry}
                onViewSnapshot={onViewSnapshot}
            />

            {/* Body - switches on entry type */}
            <EntryBody
                entry={entry}
                onHoverHop={onHoverHop}
                onUnhoverHop={onUnhoverHop}
                selectedHop={selectedHop}
                onPerformHop={onPerformHop}
                onPinHop={onPinHop}
            />
        </div>
    );
}

function EntryHeader({ entry, onViewSnapshot }) {
    const time = new Date(entry.timestamp).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
    });

    let title;
    switch (entry.type) {
        case 'leap-group':
            title = `Leap group, n=${entry.params.n}`;
            break;
        case 'hops':
            title='Found all hops';
            break;
        case 'hop':
            title='Found one hop';
            break;
        default:
            title = entry.type;
    }

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: '6px',
            paddingRight: '20px', // leave room for ✕ button
        }}>
            <div>
                <span style={{
                    fontWeight: 'bold',
                    fontSize: '13px'
                }}>
                    {title}
                </span>
                {entry.graphSnapshot && (
                    <button
                        onClick={() => onViewSnapshot(entry.graphSnapshot)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#4a90d9',
                            cursor: 'pointer',
                            fontSize: '11px',
                            marginLeft: '6px',
                            padding: 0,
                            textDecoration: 'underline',
                        }}
                    >
                        see graph
                    </button>
                )}
            </div>
            <span style={{
                fontSize: '11px',
                color: '#aaa'
            }}>
                {time}
                {entry.elapsed && ` • ${entry.elapsed}s`}
            </span>
        </div>
    );
}

function EntryBody({ entry, onHoverHop, onUnhoverHop, selectedHop, onPerformHop, onPinHop }) {
    switch (entry.type) {
        case 'leap-group':
            return <LeapGroupBody result={entry.result} />;
        case 'hops':
        case 'hop':
            return <HopsBody
                        result={entry.result}
                        onHoverHop={onHoverHop}
                        onUnhoverHop={onUnhoverHop}
                        selectedHop={selectedHop}
                        onPerformHop={onPerformHop}
                        onPinHop={onPinHop}
            />;
        default:
            return <div style={{
                fontSize: '13px',
                color: '#888'
            }}>
                Unknown entry type
            </div>
    }
}

function LeapGroupBody({ result }) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
        }}>
            <div style={{
                padding: '6px 8px',
                background: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '13px',
            }}>
                {result.structure}
            </div>
            <div style={{
                fontSize: '12px',
                color: '#888'
            }}>
                Order: {result.order}
            </div>
        </div>
    );
}

function HopsBody({ result, onHoverHop, onUnhoverHop, selectedHop, onPerformHop, onPinHop }) {
    const [expanded, setExpanded] = useState(false);
    const PREVIEW_COUNT = 5;

    if (result.count === 0) {
        return (
            <div style={{
                fontSize: '13px',
                color: '#888',
                fontStyle: 'italic'
            }}>
                No hops found
            </div>
        );
    }

    const hopsToShow = expanded ? result.hops : result.hops.slice(0, PREVIEW_COUNT);
    const hasMore = result.hops.length > PREVIEW_COUNT;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
        }}>
            <div style={{
                fontSize: '12px',
                color: '#888'
            }}>
                {result.count} hop{result.count !== 1 ? 's' : ''} found
            </div>
            {hopsToShow.map((hop, i) => (
                <HopItem
                    key={i}
                    hop={hop}
                    selected={
                        selectedHop && selectedHop.one_line.join(',') === hop.one_line.join(',')
                    }
                    onHover={() => onHoverHop(hop)}
                    onUnhover={onUnhoverHop}
                    onPerform={onPerformHop ? () => onPerformHop(hop) : null}
                    onPin={onPinHop ? () => onPinHop(hop) : null}
                />
            ))}
            {hasMore && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    style={{
                        background: 'none',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        color: '#4a90d9',
                        cursor: 'pointer',
                        fontSize: '12px',
                    }}
                >
                    {expanded
                        ? 'Show fewer'
                        : `Show all ${result.count} hops...`
                    }
                </button>
            )}
        </div>
    );
}

function HopItem({ hop, selected, onHover, onUnhover, onPerform, onPin }) {
    return (
        <div
            onMouseEnter={() => onHover()}
            onMouseLeave={() => onUnhover()}
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 8px',
                background: selected ? '#e8f0fe' : '#fff',
                border: `1px solid ${selected ? '#4a90d9' : '#e0e0e0'}`,
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '13px',
                cursor: 'default',
                transition: 'border-color 0.15s, background 0.15s',
            }}
            title={`One-line: [${hop.one_line.join(', ')}]`}
        >
            <span style={{ flex: 1 }}>{hop.cycle}</span>
            {onPerform && (
                <button
                    onClick={(e) => { e.stopPropagation(); onPerform(); }}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#4a90d9',
                        cursor: 'pointer',
                        fontSize: '13px',
                        padding: '0 4px',
                    }}
                    title="Perform this hop"
                >
                    ▶
                </button>
            )}
            {onPin && (
                <button
                    onClick={(e) => { e.stopPropagation(); onPin(); }}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#aaa',
                        cursor: 'pointer',
                        fontSize: '11px',
                        padding: '0 4px',
                    }}
                    title="Pin to hop palette"
                >
                    pin
                </button>
            )}
        </div>
    );
}

export default NotebookEntry;