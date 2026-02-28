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
        <div className="working-leap">
            {/* Header row */}
            <div className="working-leap-header">
                <span className="working-leap-title">
                    Working leap
                </span>
                <div className="working-leap-actions">
                    {labelPerm && (
                        <button
                            onClick= {onSave}
                            className="working-leap-save"
                        >
                            Save
                        </button>
                    )}
                    {labelPerm && (
                        <button
                            onClick={onReset}
                            className="working-leap-reset"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Current permutation */}
            <div className="working-leap-perm">
                {cycleStr}
            </div>

            {/* Hop count + composition history */}
            {hopCount > 0 && (
                <div className="working-leap-count">
                    {hopCount} hop{hopCount !== 1 ? 's' : ''} composed
                    {hopCount <= 8 && (
                        <span className="working-leap-history">
                            {hopHistory.map((h) => indexBase === 0 ? shiftCycleNotation(h.cycle, -1) : h.cycle).join(' ∘ ')}
                        </span>
                    )}
                </div>
            )}

            {!labelPerm && (
                <div className="working-leap-empty">
                    Select and perform hops to build up a permutation.
                </div>
            )}

            {/* Saved leaps */}
            {savedLeaps.length >0 && (
                <div className="saved-leaps">
                    <div className="saved-leaps-title">
                        Saved
                    </div>
                    {savedLeaps.map((saved, i) => (
                        <div
                            key={i}
                            className="saved-leap-item"
                        >
                            <span
                                onClick={() => onRecall(saved)}
                                className="saved-leap-name"
                                title={
                                    `Recall: ${toCycleNotation(saved.permutation, indexBase)}`
                                }
                            >
                                {saved.name}
                            </span>
                            <span className="saved-leap-cycle">
                                {toCycleNotation(saved.permutation, indexBase)}
                            </span>
                            <button
                                onClick={() => onDelete(i)}
                                className="saved-leap-delete"
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
