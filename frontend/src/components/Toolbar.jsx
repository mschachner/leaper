import DrawHopBar from "./DrawHopBar";

import './Toolbar.css';

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
        <button className={`btn${mode === 'pan' ? ' active' : ''}`} onClick={() => { onSetMode('pan'); setEdgeSource(null); }}>Pan</button>
        <button className={`btn${mode === 'select' ? ' active' : ''}`} onClick={() => { onSetMode('select'); setEdgeSource(null); }}>Select</button>
        <button className={`btn${mode === 'addVertex' ? ' active' : ''}`} onClick={() => onSetMode('addVertex')}>Vertex</button>
        <button className={`btn${mode === 'addEdge' ? ' active' : ''}`} onClick={() => onSetMode('addEdge')}>Edge</button>
        <button className={`btn${mode === 'delete' ? ' active' : ''}`} onClick={onDelete}>Delete</button>
        <button
          className={`btn${mode === 'drawHop' ? ' active' : ''}`}
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





        <div className="settings-button">
          <button
            onClick={onOpenSettings}
            className="btn settings-icon"
            title="Settings"
          >
            ⚙
          </button>
        </div>
      </div>
    );
}

export default Toolbar;
