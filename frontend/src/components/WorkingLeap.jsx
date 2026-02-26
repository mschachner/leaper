import { toCycleNotation, shiftCycleNotation } from "../lib/permUtils";

/**
 * Displays the current working leap; the composed permutation in cycle notation, the number of hops composed, and the composition history.
 * Also provides Reset and Save buttons.
 */

function WorkingLeap({
    labelPerm,
    hopHistory,
    onReset,
    onSave,
    savedLeaps,
    onRecall,
    onDelete,
    indexBase = 1,
}) {
    // Convert to cycle notation
    const cycleStr = labelPerm ? toCycleNotation(labelPerm, indexBase) : '()';
    const hopCount = hopHistory.length;

    return (
        <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #ddd',
            background: '#f0f4f8',
        }}>
            {/* Header row */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
            }}>
                <span style={{
                    fontSize: '12px',
                    color: '#888',
                    textTransform: 'uppercase',
                }}>
                    Working Leap
                </span>
                <div style={{
                    display: 'flex',
                    gap: '6px'
                }}>
                    {labelPerm && (
                        <button
                            onClick= {onSave}
                            style={{
                                background: 'none',
                                border: '1px solid #4a90d9',
                                color: '#4a90d9',
                                borderRadius: '4px',
                                padding: '2px 8px',
                                cursor: 'pointer',
                                fontSize: '11px',
                            }}
                        >
                            Save
                        </button>
                    )}
                    {labelPerm && (
                        <button
                            onClick={onReset}
                            style={{
                                background: 'none',
                                border: '1px solid #aaa',
                                color: '#888',
                                borderRadius: '4px',
                                padding: '2px 8px',
                                cursor: 'pointer',
                                fontSize: '11px',
                            }}
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Current permutation */}
            <div style={{
                fontFamily: 'monospace',
                fontSize: '15px',
                padding: '6px 8px',
                background: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                marginBottom: '4px',
            }}>
                {cycleStr}
            </div>

            {/* Hop count + composition history */}
            {hopCount > 0 && (
                <div style={{
                    fontSize: '12px',
                    color: '#666',
                    marginTop: '4px'
                }}>
                    {hopCount} hop{hopCount !== 1 ? 's' : ''} composed
                    {hopCount <= 8 && (
                        <span style={{
                            marginLeft: '6px',
                            fontFamily: 'monospace'
                        }}>
                            {hopHistory.map((h) => indexBase === 0 ? shiftCycleNotation(h.cycle, -1) : h.cycle).join(' ∘ ')}
                        </span>
                    )}
                </div>
            )}

            {!labelPerm && (
                <div style={{
                    fontSize: '12px',
                    color: '#aaa',
                    fontStyle: 'italic'
                }}>
                    Select and perform hops to build up a permutation.
                </div>
            )}

            {/* Saved leaps */}
            {savedLeaps.length >0 && (
                <div style={{ marginTop: '8px'}}>
                    <div style={{
                        fontSize: '11px',
                        color: '#888',
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                    }}>
                        Saved
                    </div>
                    {savedLeaps.map((saved, i) => (
                        <div
                            key={i}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '4px 8px',
                                background: '#fff',
                                border: '1px solid #e0e0e0',
                                borderRadius: '4px',
                                marginBottom: '3px',
                                fontSize: '12px',
                            }}
                        >
                            <span
                                onClick={() => onRecall(saved)}
                                style={{
                                    cursor: 'pointer',
                                    color: '#4a90d9',
                                    flex: 1,
                                }}
                                title={
                                    `Recall: ${toCycleNotation(saved.permutation, indexBase)}`
                                }
                            >
                                {saved.name}
                            </span>
                            <span style={{
                                fontFamily: 'monospace',
                                color: '#888',
                                fontSize: '11px',
                                marginRight: '8px',
                            }}>
                                {toCycleNotation(saved.permutation, indexBase)}
                            </span>
                            <button
                                onClick={() => onDelete(i)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#ccc',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    padding: '0 2px',
                                }}
                                title="Delete saved leap"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}  
        </div>
    );
}

export default WorkingLeap;