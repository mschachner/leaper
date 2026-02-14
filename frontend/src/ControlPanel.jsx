import { useState } from 'react';
import { createEntry } from './workspace';

function ControlPanel({ getGraphData, addEntry }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [leapN, setleapN] = useState(1);

    const computeLeapGroup = async () => {
        const graphData = getGraphData();
        if (!graphData || graphData.vertices.length == 0) {
            setError('Draw a graph first.');
            return;
        }

        setLoading(true);
        setError(null);
        const startTime = Date.now();

        try {
            const resp = await fetch(`http://localhost:8000/leap-group?n=${leapN}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json '},
                body: JSON.stringify(graphData),
            });

            if (!resp.ok) {
                const detail = await resp.json().catch(() => null);
                throw new Error(detail?.detail || `Server returned ${resp.status}`);
            }

            const data = await resp.json();
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

            const entry = createEntry('leap-group', { n: leapN }, data, elapsed);
            addEntry(entry);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            padding: '16px',
            borderBottom: '1px solid #ddd',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        }}>
            <h3 style = {{ margin: 0, fontSize: '14px' }}>Compute</h3>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <label style={{ fontSize: '14px' }}>n =</label>
                <input
                    type="number"
                    min={1}
                    value={leapN}
                    onChange={(e) => setleapN(Math.max(1, parseInt(e.target.value,10) || 1))}
                    style={{
                        width: '50px',
                        padding: '4px 8px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                    }}
                />
                <button
                    onClick={computeLeapGroup}
                    disabled={loading}
                    style={{
                        padding: '6px 14px',
                        background: loading ? '#95a5a6' : '#27ae60',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loading ? 'default' : 'pointer',
                        fontSize: '14px',
                    }}
                >
                    {loading ? 'Computing...' : 'Leap group'}
                </button>
            </div>

            {/* Error display */}
            {error && (
                <div style={{
                    padding: '10px',
                    background: '#fdecea',
                    border: '1px solid #e74c3c',
                    borderRadius: '4px',
                    color: '#c0392b',
                    fontSize: '14px',
                }}>
                    {error}
                </div>
            )}
        </div>
    );
}

export default ControlPanel;