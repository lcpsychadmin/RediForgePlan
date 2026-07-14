import React from 'react';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';

interface DatabricksIconProps {
  sx?: SxProps<Theme>;
  className?: string;
}

const DatabricksIcon: React.FC<DatabricksIconProps> = ({ sx, className }) => (
  <Box
    component="img"
    className={className}
    src="/assets/icons/databricks-icon.png"
    alt="Databricks"
    sx={{
      width: '1em',
      height: '1em',
      display: 'inline-block',
      objectFit: 'contain',
      verticalAlign: 'middle',
      ...sx,
    }}
  />
);

export default DatabricksIcon;
