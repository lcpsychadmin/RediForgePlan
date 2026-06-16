import React from 'react';
import { Chip } from '@mui/material';

export interface StatusChipProps {
  label: string;
  variant?: 'filled' | 'outlined';
  status?: string;
  [key: string]: any;
}

export const StatusChip: React.FC<StatusChipProps> = ({ label, variant = 'filled', ...props }) => {
  return <Chip label={label} variant={variant} {...props} />;
};

export default StatusChip;
