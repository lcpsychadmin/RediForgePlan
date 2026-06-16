// client/src/components/shared/FilterSelect.tsx

import React from 'react';
import { FormControl, InputLabel, Select, SelectProps, MenuItem } from '@mui/material';

interface FilterSelectProps extends SelectProps {
  label: string;
  options: { value: string; label: string }[];
}

const FilterSelect: React.FC<FilterSelectProps> = ({ label, options, ...props }) => {
  return (
    <FormControl size="small" sx={{ minWidth: 200 }}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} {...props}>
        <MenuItem value="">
          <em>All</em>
        </MenuItem>
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default FilterSelect;
