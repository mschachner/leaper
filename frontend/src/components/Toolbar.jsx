import DrawHopBar from "./DrawHopBar";

function Toolbar({
    mode, onSetMode, onDelete,
    drawingHop, setDrawingHop, 
    onVerifyHop, onPerformDrawnHop,
    onUndoDrawAssignment,
    setEdgeSource, setSelectedHop,
    onOpenSettings, 
    cyRef
}) {
    return (
      <div className="toolbar">
        <button className={`toolbar-button${mode === 'pan' ? ' active' : ''}`} onClick={() => { onSetMode('pan'); setEdgeSource(null); }}>Pan</button>
        <button className={`toolbar-button${mode === 'select' ? ' active' : ''}`} onClick={() => { onSetMode('select'); setEdgeSource(null); }}>Select</button>
        <button className={`toolbar-button${mode === 'addVertex' ? ' active' : ''}`} onClick={() => onSetMode('addVertex')}>Vertex</button>
        <button className={`toolbar-button${mode === 'addEdge' ? ' active' : ''}`} onClick={() => onSetMode('addEdge')}>Edge</button>
        <button className={`toolbar-button${mode === 'delete' ? ' active' : ''}`} onClick={onDelete}>Delete</button>
        <button
          className={`toolbar-button${mode === 'drawHop' ? ' active' : ''}`}
          onClick={() => {
            onSetMode('drawHop');
            setEdgeSource(null);
            setDrawingHop({ assignments: {}, pendingSource: null });
            setSelectedHop(null);
          }}
        >
          Draw hop
        </button>

        {/* Draw hop status bar */}
        {mode === 'drawHop' && drawingHop && (
          <DrawHopBar
            drawingHop={drawingHop}
            nodeCount={cyRef.current ? cyRef.current.nodes().length : 0}
            onVerifyAndSave={onVerifyHop}
            onPerform={onPerformDrawnHop}
            onCancel={() => {
              onSetMode('select');
            }}
            onUndo={onUndoDrawAssignment}
          />
        )}




        <div className="toolbar-spacer" />

        <button
          onClick={onOpenSettings}
          className="toolbar-button settings-button"
          title="Settings"
        >
          ⚙
        </button>
      </div>
    );
}

export default Toolbar;
