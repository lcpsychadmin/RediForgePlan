import React from 'react';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import databricksPng from './databricks.png';

interface DatabricksIconProps {
  sx?: SxProps<Theme>;
  className?: string;
}

const DatabricksIcon: React.FC<DatabricksIconProps> = ({ sx, className }) => (
  <Box
    component="img"
    className={className}
    src={databricksPng}
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
