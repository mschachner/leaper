function HopPalette({ hops, onHover, onUnhover, selectedHop, onRemove, onPerform }) {
  if (hops.length === 0) return null;

  return (
    <div style={{
      padding: '8px 16px',
      borderBottom: '1px solid #ddd',
    }}>
      <div style={{
        fontSize: '12px',
        color: '#888',
        textTransform: 'uppercase',
        marginBottom: '6px',
      }}>
        Hop Palette
      </div>
      {hops.map((hop, i) => {
        const isSelected = selectedHop &&
          selectedHop.one_line.join(',') === hop.one_line.join(',');

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              background: isSelected ? '#e8f0fe' : '#fff',
              border: `1px solid ${isSelected ? '#4a90d9' : '#e0e0e0'}`,
              borderRadius: '4px',
              marginBottom: '3px',
              fontSize: '12px',
              cursor: 'default',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={() => onHover(hop)}
            onMouseLeave={() => onUnhover()}
          >
            <span style={{
              fontFamily: 'monospace',
              flex: 1,
            }}>
              {hop.cycle}
            </span>
            <span style={{
              fontSize: '10px',
              color: '#aaa',
              fontStyle: 'italic',
            }}>
              {hop.source}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onPerform(hop); }}
              style={{
                background: 'none',
                border: '1px solid #4a90d9',
                color: '#4a90d9',
                borderRadius: '3px',
                padding: '1px 6px',
                cursor: 'pointer',
                fontSize: '10px',
              }}
              title="Perform this hop"
            >
              ▶
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(i); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#ccc',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '0 2px',
              }}
              title="Remove from palette"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default HopPalette;
