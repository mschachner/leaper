import { useCallback, useEffect, useRef, useState } from 'react';

function Sidebar({ children, width, onWidthChange }) {
  const isDragging = useRef(false);

  const onDragStart = useCallback((e) => {
    isDragging.current = true;
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      const newWidth = window.innerWidth - e.clientX;
      onWidthChange(Math.max(275, Math.min(600, newWidth)));
    };
    const onMouseUp = () => { isDragging.current = false; };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onWidthChange]);

  return (
    <div style={{
      width: `${width}px`,
      flexShrink: 0,
      borderLeft: '1px solid #ddd',
      display: 'flex',
      flexDirection: 'column',
      background: '#fafafa',
      color: '#000',
      position: 'relative',
    }}>
      {/* Drag handle */}
      <div
        onMouseDown={onDragStart}
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: '8px', cursor: 'col-resize', zIndex: 10,
        }}
      />
      {children}
    </div>
  );
}

export default Sidebar;