function Toast({ toasts, onDismiss }) {
    if (toasts.length === 0) return null;

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none',
        }}>
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    style={{
                        margin: '8px',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 500,
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        animation: 'slideDown 0.2s ease-out',
                        background: toast.type === 'success' ? '#d4edda'
                                  : toast.type === 'error'   ? '#f8d7da'
                                  :                            '#d1ecf1',
                        color: toast.type === 'success' ? '#155724'
                             : toast.type === 'error'   ? '#721c24'
                             :                            '#0c5460',
                        border: `1px solid ${
                            toast.type === 'success' ? '#c3e6cb'
                          : toast.type === 'error'   ? '#f5c6cb'
                          :                            '#bee5eb'
                        }`,
                    }}
                    onClick={() => onDismiss(toast.id)}
                >
                    {toast.message}
                </div>
            ))}
        </div>
    );
}

export default Toast;