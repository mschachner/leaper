function DrawHopBar({ drawingHop, nodeCount, onVerifyAndSave, onPerform, onCancel, onUndo}) {
    const assignedCount = Object.keys(drawingHop.assignments).length;
    const isComplete = assignedCount === nodeCount && nodeCount > 0;
    const hasPending = drawingHop.pendingSource !== null;

    return (
        <div style={{
            padding: '6px 12px',
            background: '#e8f5e9',
            borderBottom: '1px solid #66bb6a',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
        }}>
            <span style={{
                color: '#2e7d32',
                fontWeight: 'bold'
            }}>
                Drawing hop
            </span>
            <span style={{ color: '#555' }}>
                {assignedCount}/{nodeCount} vertices assigned
                {hasPending && ' (click target vertex)'}
            </span>

            {assignedCount > 0 && (
                <button
                    onClick={onUndo}
                    style = {{
                        padding: '3px 10px',
                        background: '#fff',
                        color: '#333',
                        border: '1px solid #aaa',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                    }}>
                    Undo last
                </button>
            )}

            {isComplete && (
                <>
                    <button
                        onClick={onVerifyAndSave}
                        style={{
                            padding: '3px 10px',
                            background: '#27ae60',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                        }}>
                        Verify & save hop
                    </button>
                    <button
                        onClick={onPerform}
                        style={{
                            padding: '3px 10px',
                            background: '#4a90d9',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                        }}>
                        Perform
                    </button>
                </>
            )}
            <button
                onClick={onCancel}
                style={{
                    padding: '3px 10px',
                    background: '#fff',
                    color: '#333',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    marginLeft: 'auto',
                }}>
                Cancel
            </button>
        </div>
    );
}

export default DrawHopBar;