function Toast({ toasts, onDismiss }) {
    if (toasts.length === 0) return null;

    const typeClass = (type) => {
        if (type === 'success') return 'toast-success';
        if (type === 'error') return 'toast-error';
        return 'toast-info';
    };

    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`toast ${typeClass(toast.type)}`}
                    onClick={() => onDismiss(toast.id)}
                >
                    {toast.message}
                </div>
            ))}
        </div>
    );
}

export default Toast;
