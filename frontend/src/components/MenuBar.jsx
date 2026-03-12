import { useState, useEffect } from "react";
import Randomizer from "./Randomizer";

const SUN_SVG = (
    <svg fill="#ffffff" width="24px" height="24px" viewBox="0 0 36 36" version="1.1"  preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <title>sun-solid</title>
    <path d="M18,6.42a1,1,0,0,0,1-1V1.91a1,1,0,0,0-2,0V5.42A1,1,0,0,0,18,6.42Z" class="clr-i-solid clr-i-solid-path-1"></path><path d="M18,29.58a1,1,0,0,0-1,1v3.51a1,1,0,0,0,2,0V30.58A1,1,0,0,0,18,29.58Z" class="clr-i-solid clr-i-solid-path-2"></path><path d="M8.4,9.81A1,1,0,0,0,9.81,8.4L7.33,5.92A1,1,0,0,0,5.92,7.33Z" class="clr-i-solid clr-i-solid-path-3"></path><path d="M27.6,26.19a1,1,0,0,0-1.41,1.41l2.48,2.48a1,1,0,0,0,1.41-1.41Z" class="clr-i-solid clr-i-solid-path-4"></path><path d="M6.42,18a1,1,0,0,0-1-1H1.91a1,1,0,0,0,0,2H5.42A1,1,0,0,0,6.42,18Z" class="clr-i-solid clr-i-solid-path-5"></path><path d="M34.09,17H30.58a1,1,0,0,0,0,2h3.51a1,1,0,0,0,0-2Z" class="clr-i-solid clr-i-solid-path-6"></path><path d="M8.4,26.19,5.92,28.67a1,1,0,0,0,1.41,1.41L9.81,27.6A1,1,0,0,0,8.4,26.19Z" class="clr-i-solid clr-i-solid-path-7"></path><path d="M27.6,9.81l2.48-2.48a1,1,0,0,0-1.41-1.41L26.19,8.4A1,1,0,0,0,27.6,9.81Z" class="clr-i-solid clr-i-solid-path-8"></path><circle cx="18" cy="18" r="10" class="clr-i-solid clr-i-solid-path-9"></circle>
    <rect x="0" y="0" width="36" height="36" fill-opacity="0"/>
</svg>
)

const MOON_SVG = (
    <svg fill="#000000" width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z"/></svg>
)

function MenuBar({
    onNew,
    onOpen,
    onSave,
    onSaveAs,
    onLibrary,
    randomizerOpen, setRandomizerOpen,
    randomValues, setRandomValues,
    onGenerate,
    setHelpOpen,
    darkMode, setDarkMode,
    sidebarOpen, setSidebarOpen,
    fileName, isDirty,
}) {
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const handleClick = (e) => {
            const dropdown = document.getElementById("fileops");
            const hamburger = document.querySelector(".menu-bar-hamburger");
            if (dropdown && !dropdown.contains(e.target) &&
                hamburger && !hamburger.contains(e.target)) {
                setMenuOpen(false);
            }
        }

        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [])



    return (
        <div className="menu-bar">
            <div className="menu-bar-left">
                <button
                    className="menu-bar-hamburger"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    ☰
                </button>

                {/* File operations. Stored in dropdown on mobile.*/}
                <div 
                    id="fileops"
                    className={`menu-bar-file-ops${menuOpen ? ' menu-open' : ''}`}
                >
                    <span className="menu-bar-filename">
                        {fileName ? fileName : 'Untitled.leap'}{isDirty ? ' •' : ''}
                    </span>
                    <button onClick={onNew}        className="menu-bar-button">New</button>
                    <button onClick={onOpen}       className="menu-bar-button">Open</button>
                    <button onClick={onSave}       className="menu-bar-button">Save</button>
                    <button onClick={onSaveAs}     className="menu-bar-button">Save as...</button>
                </div>

                {/* Always open */}
                <button 
                    onClick={onLibrary}    
                    className="menu-bar-button">Library</button>
                <button onClick={() => setRandomizerOpen(true)} className="menu-bar-button">Random graph....</button>
                {randomizerOpen && (
                    <Randomizer
                    randomValues={randomValues}
                    setRandomValues={setRandomValues}
                    onClose={() => setRandomizerOpen(false)}
                    onGenerate={onGenerate}
                />
                )}
                <button onClick={() => setHelpOpen(true)}     className="menu-bar-button">Help</button>
            </div>
            <div className="menu-bar-right">
                <button
                    className="menu-bar-button sidebar-button"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                    ◀︎
                </button>
                <button
                    className="theme-button"
                    onClick={() => setDarkMode(!darkMode)}
                >
                    <div className="theme-icon">
                        {darkMode ? SUN_SVG : MOON_SVG}
                    </div>
                </button>
            </div>
        </div>
    );
}

export default MenuBar;
