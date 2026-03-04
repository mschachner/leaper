/**
 * Randomizer: popover for generating a random graph.
 */

function Randomizer({ randomValues, setRandomValues, onClose, onGenerate }) {
    const [n,p] = randomValues;

    return (
        <div className="randomizer">Randomizer
            <div className="randomizer-item">
                <label className="randomizer-label">n =</label>
                <input
                    type="number"
                    min={1}
                    value={n}
                    onChange={(e) => setRandomValues([e.target.value,p])}
                    className="randomizer-input"
                />
            </div>
            <div className="randomizer-item">
                <label className="randomizer-label">p =</label>
                <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={p}
                    onChange={(e) => setRandomValues([n,e.target.value])}
                    className="randomizer-input"
                />
            </div>
            <div className="randomizer-buttons">
                <button
                    onClick={onGenerate}
                    className="toolbar-button randomizer-button"
                    title="Generate"
                    >
                    Generate
                </button>
                <button
                    onClick={onClose}
                    className="toolbar-button randomizer-button"
                    title="Close"
                    >
                    Close
                </button>
            </div>
        </div>
    );
}

export default Randomizer;