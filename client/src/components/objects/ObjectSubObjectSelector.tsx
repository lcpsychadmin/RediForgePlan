import React from 'react';
import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { ObjectSubObjectRow } from './useObjectSubObjectSelection';

interface ObjectSubObjectSelectorProps {
  subObjects: ObjectSubObjectRow[];
  selectedSubObjectId: string;
  onChange: (subObjectId: string) => void;
  label?: string;
  helperText?: string;
}

const ObjectSubObjectSelector: React.FC<ObjectSubObjectSelectorProps> = ({
  subObjects,
  selectedSubObjectId,
  onChange,
  label = 'Sub-object',
  helperText,
}) => {
  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
        <TextField
          select
          size="small"
          label={label}
          value={selectedSubObjectId}
          onChange={(e) => onChange(e.target.value)}
          sx={{ minWidth: 280 }}
        >
          {subObjects.map((subObject) => (
            <MenuItem key={subObject.id} value={subObject.id}>{subObject.name}</MenuItem>
          ))}
        </TextField>
        {helperText && (
          <Typography variant="body2" color="text.secondary">
            {helperText}
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

export default ObjectSubObjectSelector;