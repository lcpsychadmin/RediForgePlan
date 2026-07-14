import React from 'react';
import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';

const DatabricksIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon
    {...props}
    viewBox="0 0 512 512"
    fill="none"
    sx={{
      color: '#FF3621',
      ...props.sx,
    }}
  >
    <path
      d="M32 145 L256 24 L480 145"
      stroke="currentColor"
      strokeWidth="24"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M48 145 L256 262 L464 145"
      stroke="currentColor"
      strokeWidth="24"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M48 218 L48 280 L256 397 L464 280 L464 218"
      stroke="currentColor"
      strokeWidth="24"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M48 364 L256 481 L464 364"
      stroke="currentColor"
      strokeWidth="24"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

export default DatabricksIcon;
