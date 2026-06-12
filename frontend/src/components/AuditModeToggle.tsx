import React from 'react';

interface AuditModeToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
}

const AuditModeToggle: React.FC<AuditModeToggleProps> = ({ checked, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <label style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        style={{ marginRight: '4px' }}
      />
      Audit Mode
    </label>
  );
};

export default AuditModeToggle;
