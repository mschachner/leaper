import { useEffect, useRef, useState } from 'react';
import { createEntry } from '../lib/workspace';
import { API_URL } from '../lib/api';

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
        <div className="control-panel">
            <h3 className="control-panel-title">Compute</h3>

            {/* Leap group row */}

            <div className="control-panel-row">
                <div className="control-panel-row">
                <label className="control-panel-label">n =</label>
                <input
                    type="number"
                    min={1}
                    value={leapN}
                    onChange={(e) => setleapN(Math.max(1, parseInt(e.target.value,10) || 1))}
                    disabled={loading}
                    className="control-panel-input"
                />
                </div>
                <ComputeButton
                    label="Leap group"
                    loading={loading}
                    onClick={() => runComputation(
                        `${API_URL}/leap-group?n=${leapN}`,
                        'leap-group',
                        { n: leapN },
                    )}
                />
                <ComputeButton
                    label="All hops"
                    loading={loading}
                    onClick={() => runComputation(
                        `${API_URL}/hops`,
                        'hops',
                        {},
                    )}
                />
                <ComputeButton
                    label="One hop"
                    loading={loading}
                    onClick={() => runComputation(
                        `${API_URL}/hop`,
                        'hop',
                        {},
                    )}
                />
            </div>

            {/* Live timer + cancel */}

            {loading && (
                <div className="control-panel-row">
                    <span className="control-panel-elapsed">
                        {liveElapsed}s
                    </span>
                    <button
                        onClick={cancelComputation}
                        className="control-panel-cancel"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {error && (
                <div className="control-panel-error">
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
            className="compute-button"
        >
            {label}
        </button>
    );
}

export default ControlPanel;
