import { useEffect, useState } from 'react';

function ControlPanel({ getGraphData, cyRef }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const [elapsed, setElapsed] = useState(null);
    const [leapN, setleapN] = useState(1);

    useEffect(() => {
        const cy = cyRef.current;
        if (!cy) return;

        const clearResults = () => {
            setError(null);
            setResult(null);
            setElapsed(null);
        }

        cy.on('add remove', clearResults);
        return () => cy.off('add remove', clearResults);
    }, [cyRef]);

    const computeLeapGroup = async () => {
        const graphData = getGraphData();
        if (!graphData || graphData.vertices.length == 0) {
            setError('Draw a graph first.');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);
        setElapsed(null);
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
            setResult(data);
            setElapsed(((Date.now() - startTime) / 1000).toFixed(2));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
        }}>
            <h3 style = {{ margin: 0 }}>Compute</h3>

            {/* Leap group controls */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                <label style={{ fontSize: '14px '}}>n =</label>
                <input
                    type="number"
                    min={1}
                    value={leapN}
                    onChange={(e)=>
                        setleapN(Math.max(1, parseInt(e.target.value,10) || 1))
                    }
                    style = {{
                        width: '50px',
                        padding: '4px 8px',
                        border: '1px solid #ccc',
                        borderRadius: '4px'
                    }}/>
                </div>

                <button
                    onClick={computeLeapGroup}
                    disabled={loading}
                    style={{
                        padding: '10px 16px',
                        background: loading ? ' #95a5a6' : ' #27ae60',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loading? 'default' : 'pointer',
                        fontSize: '14px',
                    }}>
                    {loading ? 'Computing...' : 'Compute leap group'}
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

            {/* Results display */}
            {result && (
                <ResultsDisplay result={result} n={leapN} elapsed={elapsed}/>
            )}
        </div>
    );
}

function ResultsDisplay({ result, n, elapsed }) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
        }}>
            <h3 style={{
                margin: 0,
                borderBottom: '1px solid #ddd',
                paddingBottom: '8px'
            }}>
                Results
                {elapsed && (
                    <span style={{
                        fontSize: '12px',
                        fontWeight: 'normal',
                        color: ' #888',
                        marginLeft: '8px'
                    }}>
                        ({elapsed}s)
                    </span>
                )}
            </h3>

            <div>
                <div style={{
                    fontSize: '12px',
                    color: '#888',
                    textTransform: 'uppercase',
                    marginBottom: '4px'
                }}>
                    Leap group (n = {n})
                </div>
                <div style={{
                    padding: '10px',
                    background: ' #ffffff',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                }}>
                    {result.structure}
                </div>
            </div>

            <div>
                <div style={{
                    fontSize: '12px',
                    color: '#888',
                    textTransform: 'uppercase',
                    marginBottom: '4px'
                }}>
                    Order
                </div>
                <div style={{
                    padding: '10px',
                    background: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                }}>
                    {result.order}
                </div>
            </div>
        </div>
    );
}

export default ControlPanel;