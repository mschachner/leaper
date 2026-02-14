function NotebookEntry({ entry, onRemove }) {
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
            <EntryHeader entry={entry} />

            {/* Body - switches on entry type */}
            <EntryBody entry={entry} />
        </div>
    );
}

function EntryHeader({ entry }) {
    const time = new Date(entry.timestamp).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
    });

    let title;
    switch (entry.type) {
        case 'leap-group':
            title = `Leap group, n=${entry.params.n}`;
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
            <span style={{
                fontWeight: 'bold',
                fontSize: '13px'
            }}>
                {title}
            </span>
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

function EntryBody({ entry }) {
    switch (entry.type) {
        case 'leap-group':
            return <LeapGroupBody result={entry.result} />;
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

export default NotebookEntry;