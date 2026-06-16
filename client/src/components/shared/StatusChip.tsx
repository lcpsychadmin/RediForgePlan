// client/src/components/shared/StatusChip.tsx

import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { palette } from '../../theme/palette';

interface StatusChipProps extends ChipProps {
  status: string;
}

const StatusChip: React.FC<StatusChipProps> = ({ status, ...props }) => {
  let backgroundColor = `${palette.gray[400]}20`;
  let color = palette.text.primary;

  switch (status) {
    case 'not_started':
      backgroundColor = `${palette.status.notStarted}20`;
      color = palette.status.notStarted;
      break;
    case 'in_progress':
      backgroundColor = `${palette.status.inProgress}20`;
      color = palette.status.inProgress;
      break;
    case 'blocked':
      backgroundColor = `${palette.status.blocked}20`;
      color = palette.status.blocked;
      break;
    case 'complete':
      backgroundColor = `${palette.status.complete}20`;
      color = palette.status.complete;
      break;
    default:
      backgroundColor = `${palette.gray[500]}20`;
      color = palette.text.secondary;
  }

  return (
    <Chip
      label={status.replace(/_/g, ' ').toUpperCase()}
      size="small"
      sx={{
        backgroundColor,
        color,
        fontWeight: 600,
        fontSize: '0.75rem',
        borderRadius: 0.75,
      }}
      {...props}
    />
  );
};

export default StatusChip;
