import { useEffect, useRef, useState } from 'react';
import { createEntry } from '../lib/workspace';

function ControlPanel({ getGraphData, getGraphSnapshot, addEntry }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [leapN, setleapN] = useState(1);
    const [liveElapsed, setLiveElapsed] = useState(null);
    const timerRef = useRef(null);
    const startTimeRef = useRef(null);
    const abortRef = useRef(null);


    const startTimer = () => {
        startTimeRef.current = Date.now();
        setLiveElapsed('0.00');
        timerRef.current = setInterval(() => {
            const seconds = ((Date.now() - startTimeRef.current) / 1000).toFixed(2);
            setLiveElapsed(seconds);
        }, 100);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setLiveElapsed(null);
    };

    /**
     * Generic compute helper.
     * @param {string} url      - the API endpoint.
     * @param {string} type     - Workspace entry type
     * @param {object} params   - Entry params for display.
     */
    
    const runComputation = async (url, type, params) => {
        const graphData = getGraphData();
        if (!graphData || graphData.vertices.length == 0) {
            setError('Draw a graph first.');
            return;
        }

        // Abort controller
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError(null);
        startTimer();

        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json '},
                body: JSON.stringify(graphData),
                signal: controller.signal,
            });

            if (!resp.ok) {
                const detail = await resp.json().catch(() => null);
                throw new Error(detail?.detail || `Server returned ${resp.status}`);
            }

            const data = await resp.json();
            const elapsed = ((Date.now() - startTimeRef.current) / 1000).toFixed(2);

            const entry = createEntry(type, params, data, elapsed, getGraphSnapshot());
            addEntry(entry);
        } catch (err) {
            if (err.name !== 'AbortError') {
                setError(err.message);
            }
        } finally {
            stopTimer();
            setLoading(false);
            abortRef.current = null;
        }
    };

    const cancelComputation = () => {
        if (abortRef.current) {
            abortRef.current.abort();
        }
    }

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        }
    }, []);

    return (
        <div style={{
            padding: '16px',
            borderBottom: '1px solid #ddd',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        }}>
            <h3 style = {{ margin: 0, fontSize: '14px' }}>Compute</h3>

            {/* Leap group row */}

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
                    disabled={loading}
                    style={{
                        width: '50px',
                        padding: '4px 8px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                    }}
                />
                <ComputeButton
                    label="Leap group"
                    loading={loading}
                    onClick={() => runComputation(
                        `http://localhost:8000/leap-group?n=${leapN}`,
                        'leap-group',
                        { n: leapN },
                    )}
                />
            </div>

            {/* Hops row */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <ComputeButton
                    label="Find all hops"
                    loading={loading}
                    onClick={() => runComputation(
                        'http://localhost:8000/hops',
                        'hops',
                        {},
                    )}
                />
                <ComputeButton
                    label="Find one hop"
                    loading={loading}
                    onClick={() => runComputation(
                        'http://localhost:8000/hop',
                        'hop',
                        {},
                    )}
                />
            </div>

            {/* Live timer + cancel */}

            {loading && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span style={{
                        fontSize: '13px',
                        color: '#888'
                    }}>
                        {liveElapsed}s
                    </span>
                    <button
                        onClick={cancelComputation}
                        style={{
                            padding: '3px 10px',
                            background: '#e74c3c',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        Cancel
                    </button>
                </div>
            )}

            {error && (
                <div style={{
                    padding: '8px',
                    background: '#fdecea',
                    border: '1px solid #e74c3c',
                    borderRadius: '4px',
                    color: '#c0392b',
                    fontSize: '13px',
                }}>
                    {error}
                </div>
                )}
            </div>
        );
}


/**
 * A small reusable button that disables itself when any computation is running.
 */

function ComputeButton({ label, loading, onClick }) {
    return (
        <button
            onClick={onClick}
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
            {label}
        </button>
    );
}

export default ControlPanel;
