import React, { useState, useRef, useEffect } from 'react';

const CustomSelect = ({
    options = [],
    value,
    onChange,
    placeholder = "Select...",
    disabled = false,
    className = "",
    style = {}
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const timeoutRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const selectedOption = options.find(opt => {
        if (typeof opt === 'string') return opt === value;
        return opt.value === value;
    });

    const displayLabel = selectedOption
        ? (typeof selectedOption === 'string' ? selectedOption : selectedOption.label)
        : placeholder;

    const handleToggle = () => {
        if (!disabled) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setIsOpen(!isOpen);
        }
    };

    const handleMouseEnter = () => {
        if (!disabled) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setIsOpen(true);
        }
    };

    const handleMouseLeave = () => {
        // Provide a grace period (800ms) before closing
        timeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 800);
    };

    const handleSelect = (option) => {
        const newVal = typeof option === 'string' ? option : option.value;
        onChange(newVal);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsOpen(false);
    };

    return (
        <div
            className={`custom-select-container ${isOpen ? 'open' : ''} ${className}`}
            ref={containerRef}
            style={{ ...style, opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'default' }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div
                className="custom-select-trigger"
                onClick={handleToggle}
            >
                <span style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: selectedOption ? 'inherit' : 'var(--gray-400)'
                }}>
                    {displayLabel}
                </span>
                <svg
                    className="custom-select-arrow"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>

            {isOpen && (
                <div className="custom-select-dropdown">
                    {options.map((option, index) => {
                        const optValue = typeof option === 'string' ? option : option.value;
                        const optLabel = typeof option === 'string' ? option : option.label;
                        const isSelected = optValue === value;

                        return (
                            <div
                                key={index}
                                className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleSelect(option)}
                            >
                                {optLabel}
                            </div>
                        );
                    })}
                    {options.length === 0 && (
                        <div style={{ padding: '10px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '12px' }}>
                            No options available
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
