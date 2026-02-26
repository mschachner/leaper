function MenuBar({
    onNew, onOpen, onSave, onSaveAs, onLibrary,
    fileName, isDirty,
    isDirected, onToggleDirected,
}) {
    const buttonStyle = {
        padding: '0px 8px',
        borderRight: '1px solid #333',
        borderRadius: '0px',
        background: '#fff',
        color: '#333',
        cursor: 'pointer',
    };

    const segmentStyle = (active) => ({
        padding: '2px 10px',
        border: '1px solid #999',
        background: active ? '#4a90d9' : '#fff',
        color: active ? '#fff' : '#555',
        cursor: active ? 'default' : 'pointer',
        fontSize: '12px',
        fontWeight: active ? 'bold' : 'normal',
    });

    return (
        <div style={{
            padding: '6px 0px',
            display: 'flex',
            alignItems: 'center',
            background: '#fff',
        }}>
            <button onClick={onNew}     style={buttonStyle}>New</button>
            <button onClick={onOpen}    style={buttonStyle}>Open</button>
            <button onClick={onSave}    style={buttonStyle}>Save</button>
            <button onClick={onSaveAs}  style={buttonStyle}>Save As</button>
            <button onClick={onLibrary} style={buttonStyle}>Library</button>
            <span style={{
                marginLeft: '12px',
                color: '#666',
                fontSize: '14px'
            }}>
                {fileName ? fileName : 'Untitled.leap'}{isDirty ? ' •' : ''}
            </span>

            {/* Directed/Undirected toggle */}
            <div style={{ marginLeft: '16px', display: 'flex' }}>
                <button
                    onClick={isDirected ? onToggleDirected : undefined}
                    style={{
                        ...segmentStyle(!isDirected),
                        borderRadius: '4px 0 0 4px',
                        borderRight: 'none',
                    }}
                >
                    Undirected
                </button>
                <button
                    onClick={!isDirected ? onToggleDirected : undefined}
                    style={{
                        ...segmentStyle(isDirected),
                        borderRadius: '0 4px 4px 0',
                    }}
                >
                    Directed
                </button>
            </div>
        </div>
    );
}

export default MenuBar;
