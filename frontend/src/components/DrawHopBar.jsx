function DrawHopBar({ drawingHop, nodeCount, onVerifyAndSave, onPerform, onCancel, onUndo}) {
    const assignedCount = Object.keys(drawingHop.assignments).length;
    const isComplete = assignedCount === nodeCount && nodeCount > 0;
    const hasPending = drawingHop.pendingSource !== null;

    return (
        <div className="draw-hop-bar">
            <span className="draw-hop-bar-label">
                Drawing hop
            </span>
            <span className="draw-hop-bar-status">
                {assignedCount}/{nodeCount} vertices assigned
                {hasPending && ' (click target vertex)'}
            </span>

            {assignedCount > 0 && (
                <button
                    onClick={onUndo}
                    className="draw-hop-bar-undo">
                    Undo last
                </button>
            )}

            {isComplete && (
                <>
                    <button
                        onClick={onVerifyAndSave}
                        className="draw-hop-bar-verify">
                        Verify & save hop
                    </button>
                    <button
                        onClick={onPerform}
                        className="draw-hop-bar-perform">
                        Perform
                    </button>
                </>
            )}
            <button
                onClick={onCancel}
                className="toolbar-button">
                Cancel
            </button>
        </div>
    );
}

export default DrawHopBar;
