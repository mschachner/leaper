function Toolbar({
    mode, onSetMode, onDelete,
    setDrawingHop, setEdgeSource, setSelectedHop,
    onOpenSettings,
}) {
    const buttonStyle = (m) => ({
      padding: '0px 8px',
      borderRadius: '15px',
      background: mode === m ? '#4a90d9' : '#fff',
      color: mode === m ? '#fff' : '#333',
      cursor: 'pointer',
      fontWeight: mode === m ? 'bold' : 'normal',
    });

    return (
      <div style={{
        padding: '8px 12px',
        display: 'flex',
        background: 'transparent',
        gap: '8px',
        alignItems: 'center',
      }}>
        <button style={buttonStyle('pan')} onClick={() => { onSetMode('pan'); setEdgeSource(null); }}>Pan</button>
        <button style={buttonStyle('select')} onClick={() => { onSetMode('select'); setEdgeSource(null); }}>Select</button>
        <button style={buttonStyle('addVertex')} onClick={() => onSetMode('addVertex')}>Vertex</button>
        <button style={buttonStyle('addEdge')} onClick={() => onSetMode('addEdge')}>Edge</button>
        <button style={buttonStyle('delete')} onClick={onDelete}>Delete</button>
        <button
          style={buttonStyle('drawHop')}
          onClick={() => {
            onSetMode('drawHop');
            setEdgeSource(null);
            setDrawingHop({ assignments: {}, pendingSource: null });
            setSelectedHop(null);
          }}
        >
          Draw hop
        </button>

        <div style={{ flex: 1 }} />

        <button
          onClick={onOpenSettings}
          style={{
            background: 'none',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: '22px',
            color: '#666',
            lineHeight: 1,
          }}
          title="Settings"
        >
          ⚙
        </button>
      </div>
    );
}

export default Toolbar;
