import { useState } from 'react';
import { shiftCycleNotation } from '../lib/permUtils';
import { formatOrder } from '../lib/format';

import './NotebookEntry.css';

function NotebookEntry({ entry, onRemove, onHoverHop, onUnhoverHop, selectedHop, onPerformHop, onViewSnapshot, onPinHop, indexBase = 1 }) {
    return (
        <div className="notebook-entry">
            {/* Dismiss button */}
            <button
                onClick={() => onRemove(entry.id)}
                className="notebook-entry-dismiss"
                title="Remove this entry"
            >
                ✕
            </button>

            {/* Header */}
            <EntryHeader
                entry={entry}
                onViewSnapshot={onViewSnapshot}
            />

            {/* Body - switches on entry type */}
            <EntryBody
                entry={entry}
                onHoverHop={onHoverHop}
                onUnhoverHop={onUnhoverHop}
                selectedHop={selectedHop}
                onPerformHop={onPerformHop}
                onPinHop={onPinHop}
                indexBase={indexBase}
            />
        </div>
    );
}

function EntryHeader({ entry, onViewSnapshot }) {
    const time = new Date(entry.timestamp).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
    });

    let title;
    switch (entry.type) {
        case 'leap-group':
            title = `Leap group, n=${entry.params.n}`;
            break;
        case 'hops':
            title='Found all hops';
            break;
        case 'hop':
            title='Found one hop';
            break;
        default:
            title = entry.type;
    }

    return (
        <div className="entry-header">
            <div>
                <span className="entry-header-title">
                    {title}
                </span>
                {entry.graphSnapshot && (
                    <button
                        onClick={() => onViewSnapshot(entry.graphSnapshot)}
                        className="entry-header-see-graph"
                    >
                        see graph
                    </button>
                )}
            </div>
            <span className="entry-header-meta">
                {time}
                {entry.elapsed && ` • ${entry.elapsed}s`}
            </span>
        </div>
    );
}

function EntryBody({ entry, onHoverHop, onUnhoverHop, selectedHop, onPerformHop, onPinHop, indexBase }) {
    switch (entry.type) {
        case 'leap-group':
            return <LeapGroupBody result={entry.result} />;
        case 'hops':
        case 'hop':
            return <HopsBody
                        result={entry.result}
                        onHoverHop={onHoverHop}
                        onUnhoverHop={onUnhoverHop}
                        selectedHop={selectedHop}
                        onPerformHop={onPerformHop}
                        onPinHop={onPinHop}
                        indexBase={indexBase}
            />;
        default:
            return <div className="entry-body-unknown">
                Unknown entry type
            </div>
    }
}

function LeapGroupBody({ result }) {
    // order_str is exact; older saved entries only have the number.
    const order = formatOrder(result.order_str ?? result.order);

    return (
        <div className="leap-group-body">
            {result.structure ? (
                <div className="leap-group-structure">
                    {result.structure}
                </div>
            ) : (
                // The server ran out of time describing the group.
                <div className="leap-group-structure leap-group-structure-missing">
                    structure unavailable
                </div>
            )}
            <div className="leap-group-order">
                Order:{' '}
                {order.text ?? (
                    <span title={order.exact}>
                        ≈ {order.mantissa} × 10<sup>{order.exponent}</sup>
                    </span>
                )}
            </div>
        </div>
    );
}

function HopsBody({ result, onHoverHop, onUnhoverHop, selectedHop, onPerformHop, onPinHop, indexBase }) {
    const PREVIEW_COUNT = 5;
    const PAGE_SIZE = 200;
    const [limit, setLimit] = useState(PREVIEW_COUNT);

    if (result.count === 0) {
        return (
            <div className="hops-body-empty">
                No hops found
            </div>
        );
    }

    // The server lists at most a fixed number of hops, and stops counting
    // at some point: `count` can exceed the list, and `more` marks a count
    // that is only a lower bound.
    const listed = result.hops.length;
    const total = `${result.count.toLocaleString('en-US')}${result.more ? '+' : ''}`;
    const hopsToShow = result.hops.slice(0, limit);
    const remaining = listed - hopsToShow.length;

    return (
        <div className="hops-body">
            <div className="hops-body-count">
                {total} hop{result.count !== 1 ? 's' : ''} found
                {listed < result.count && ` (first ${listed.toLocaleString('en-US')} listed)`}
            </div>
            {hopsToShow.map((hop, i) => (
                <HopItem
                    key={i}
                    hop={hop}
                    selected={
                        selectedHop && selectedHop.one_line.join(',') === hop.one_line.join(',')
                    }
                    onHover={() => onHoverHop(hop)}
                    onUnhover={onUnhoverHop}
                    onPerform={onPerformHop ? () => onPerformHop(hop) : null}
                    onPin={onPinHop ? () => onPinHop(hop) : null}
                    indexBase={indexBase}
                />
            ))}
            {remaining > 0 && (
                <button
                    onClick={() => setLimit(limit === PREVIEW_COUNT ? PAGE_SIZE : limit + PAGE_SIZE)}
                    className="hops-body-toggle"
                >
                    {limit === PREVIEW_COUNT && listed <= PAGE_SIZE
                        ? `Show all ${listed} hops...`
                        : `Show more (${remaining.toLocaleString('en-US')} remaining)`
                    }
                </button>
            )}
            {limit > PREVIEW_COUNT && listed > PREVIEW_COUNT && (
                <button
                    onClick={() => setLimit(PREVIEW_COUNT)}
                    className="hops-body-toggle"
                >
                    Show fewer
                </button>
            )}
        </div>
    );
}

function HopItem({ hop, selected, onHover, onUnhover, onPerform, onPin, indexBase = 1 }) {
    // Backend cycles/one_line are always 1-indexed; shift for 0-indexed display
    const displayCycle = indexBase === 0 ? shiftCycleNotation(hop.cycle, -1) : hop.cycle;
    const displayOneLine = indexBase === 0
        ? hop.one_line.map((v) => v - 1)
        : hop.one_line;

    return (
        <div
            onMouseEnter={() => onHover()}
            onMouseLeave={() => onUnhover()}
            className={`hop-item${selected ? ' selected' : ''}`}
            title={`One-line: [${displayOneLine.join(', ')}]`}
        >
            <span className="hop-item-cycle">{displayCycle}</span>
            {onPerform && (
                <button
                    onClick={(e) => { e.stopPropagation(); onPerform(); }}
                    className="hop-item-perform"
                    title="Perform this hop"
                >
                    ▶
                </button>
            )}
            {onPin && (
                <button
                    onClick={(e) => { e.stopPropagation(); onPin(); }}
                    className="hop-item-pin"
                    title="Pin to hop palette"
                >
                    pin
                </button>
            )}
        </div>
    );
}

export default NotebookEntry;
