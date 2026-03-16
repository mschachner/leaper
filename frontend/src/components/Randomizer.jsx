import './Randomizer.css';

/**
 * Randomizer: popover for generating a random graph.
 */

function Randomizer({ randomValues, setRandomValues, onClose, onGenerate }) {
    const [n,p] = randomValues;

    return (
        <div className="randomizer">
            <div className="randomizer-header">
                <h4>Randomizer</h4>
                <button onClick={onClose} className="modal-close">✕</button>
            </div>
            <div className="randomizer-item">
                <label className="randomizer-label">Vertices</label>
                <input
                    type="number"
                    min={1}
                    value={n}
                    onChange={(e) => setRandomValues([Number(e.target.value),p])}
                    className="randomizer-input"
                />
            </div>
            <div className="randomizer-item">
                <label className="randomizer-label">Density</label>
                <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={p}
                    onChange={(e) => setRandomValues([n,Number(e.target.value)])}
                    className="randomizer-input"
                />
            </div>
            <div className="randomizer-buttons">
                <button
                    onClick={onGenerate}
                    className="btn randomizer-button"
                    title="Generate"
                    >
                    Generate
                </button>
            </div>
        </div>
    );
}

export default Randomizer;