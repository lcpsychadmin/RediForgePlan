// client/src/components/shared/UserAvatar.tsx

import React from 'react';
import { Avatar, AvatarProps, Tooltip, useTheme } from '@mui/material';
import { palette } from '../../theme/palette';

interface UserAvatarProps extends AvatarProps {
  userId?: string;
  email?: string;
  showTooltip?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ userId, email, showTooltip = true, ...props }) => {
  const theme = useTheme();

  if (!userId && !email) {
    return (
      <Avatar
        sx={{
          bgcolor: palette.gray[600],
          color: palette.text.primary,
          fontWeight: 600,
        }}
        {...props}
      >
        ?
      </Avatar>
    );
  }

  const initials = email?.substring(0, 2).toUpperCase() || 'U';
  const avatarColors = [
    palette.primary.main,
    palette.error.main,
    palette.info.main,
    palette.success.main,
    palette.warning.main,
    palette.secondary.main,
  ];
  const colorIndex = (userId || email || '').charCodeAt(0) % avatarColors.length;

  const avatar = (
    <Avatar
      sx={{
        bgcolor: avatarColors[colorIndex],
        color: '#ffffff',
        fontWeight: 600,
        fontSize: '0.9rem',
        boxShadow: theme.shadows[1],
      }}
      {...props}
    >
      {initials}
    </Avatar>
  );

  if (showTooltip && email) {
    return <Tooltip title={email}>{avatar}</Tooltip>;
  }

  return avatar;
};

export default UserAvatar;
