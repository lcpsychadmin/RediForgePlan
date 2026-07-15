import React from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';
import dbtLogo from './dbt-bit-standalone.png';

interface DbtLogoIconProps {
  size?: number;
  alt?: string;
  sx?: SxProps<Theme>;
}

const DbtLogoIcon: React.FC<DbtLogoIconProps> = ({ size = 16, alt = 'dbt logo', sx }) => (
  <Box
    component="img"
    src={dbtLogo}
    alt={alt}
    sx={{
      width: size,
      height: size,
      objectFit: 'contain',
      display: 'block',
      ...sx,
    }}
  />
);

export default DbtLogoIcon;
