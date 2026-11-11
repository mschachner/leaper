import './Randomizer.css';

/**
 * Randomizer: popover for generating a random graph.
 */

// The server's limit on graph size (LEAPER_MAX_VERTICES).
const MAX_VERTICES = 100;

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

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
                    max={MAX_VERTICES}
                    value={n}
                    onChange={(e) => setRandomValues([clamp(Math.round(Number(e.target.value)) || 1, 1, MAX_VERTICES), p])}
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
                    onChange={(e) => setRandomValues([n, clamp(Number(e.target.value) || 0, 0, 1)])}
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