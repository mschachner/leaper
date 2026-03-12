import { useCallback, useEffect, useRef, useState } from 'react';

function Sidebar({ children, width, onWidthChange, sidebarOpen, setSidebarOpen }) {
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
    <div 
      className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`} 
      style={{ width: `${width}px` }}>
      {/* Drag handle */}
      <div
        className="sidebar-drag-handle"
        onMouseDown={onDragStart}
      />
      <button
        className='sidebar-close-button modal-close'
        onClick={() => setSidebarOpen(false)}
      >
        ⨉
      </button>
      {children}
    </div>
  );
}

export default Sidebar;
