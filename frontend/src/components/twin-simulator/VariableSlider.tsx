import React, { useState, useEffect } from 'react';
import { C, FONT_SANS } from './twin-simulator.styles';

interface VariableSliderProps {
  variable: string;
  value: number;
  onChange: (newValue: number) => void;
  onBlur: () => void;
  min?: number;
  max?: number;
  step?: number;
}

export const VariableSlider: React.FC<VariableSliderProps> = ({
  variable,
  value,
  onChange,
  onBlur,
  min = -100,
  max = 100,
  step = 1
}) => {
  const [localValue, setLocalValue] = useState(value);

  // Sync with external value if it changes (e.g. loading a scenario)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setLocalValue(val);
    onChange(val);
  };

  const handleMouseUp = () => {
    onBlur();
  };

  const handleTouchEnd = () => {
    onBlur();
  };

  const getColor = (val: number) => {
    if (val < 0) return C.success; // reduction is good
    if (val > 0) return C.critical; // increase is bad
    return C.accent; // 0
  };

  const trackColor = getColor(localValue);
  const percent = ((localValue - min) / (max - min)) * 100;

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', fontFamily: FONT_SANS }}>
      <div style={{ width: '80px', fontSize: '0.85rem', color: C.text, fontWeight: 500 }}>
        {variable}
      </div>
      
      <div style={{ flex: 1, margin: '0 16px', position: 'relative', display: 'flex', alignItems: 'center', height: '44px' }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue}
          onChange={handleChange}
          onMouseUp={handleMouseUp}
          onTouchEnd={handleTouchEnd}
          style={{
            WebkitAppearance: 'none',
            width: '100%',
            background: 'transparent',
            outline: 'none',
            margin: 0,
            cursor: 'pointer',
            zIndex: 2,
            position: 'absolute'
          }}
        />
        {/* Custom Track */}
        <div style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '100%',
          height: '4px',
          background: C.surfaceHover,
          borderRadius: '2px',
          zIndex: 0
        }}>
          {/* Active portion of the track. If min is -100 and max is 100, 0 is at 50% */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: localValue < 0 ? `${percent}%` : '50%',
            right: localValue > 0 ? `${100 - percent}%` : '50%',
            height: '100%',
            background: trackColor,
            borderRadius: '2px',
            opacity: 0.8
          }} />
          {/* Zero marker */}
          <div style={{ position: 'absolute', top: '-4px', left: '50%', width: '2px', height: '12px', background: C.border }} />
        </div>
        
        {/* Custom Thumb - visual only, sits under the invisible native thumb */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: `${percent}%`,
          transform: 'translate(-50%, -50%)',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: trackColor,
          boxShadow: `0 0 10px ${trackColor}80`,
          zIndex: 1,
          pointerEvents: 'none'
        }} />
      </div>

      <div style={{ width: '50px', textAlign: 'right', fontSize: '0.85rem', color: trackColor, fontWeight: 600 }}>
        {localValue > 0 ? '+' : ''}{localValue}%
      </div>
    </div>
  );
};
