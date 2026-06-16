// client/src/components/inventory/InventoryTable.tsx

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Box,
  useTheme,
} from '@mui/material';
import StatusChip from '../shared/StatusChip';
import UserAvatar from '../shared/UserAvatar';
import { ProjectObject } from '../../hooks/useProjectObjects';
import { palette } from '../../theme/palette';

interface InventoryTableProps {
  objects: ProjectObject[];
  loading?: boolean;
  error?: Error | null;
}

const InventoryTable: React.FC<InventoryTableProps> = ({ objects, loading, error }) => {
  const theme = useTheme();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load inventory: {error.message}</Alert>;
  }

  return (
    <TableContainer
      component={Paper}
      sx={{
        backgroundColor: palette.background.paper,
        backgroundImage: 'none',
        borderRadius: theme.spacing(1.5),
        border: `1px solid ${palette.divider}`,
        overflow: 'hidden',
      }}
    >
      <Table stickyHeader>
        <TableHead sx={{ backgroundColor: palette.background.elevated }}>
          <TableRow>
            <TableCell
              sx={{
                fontWeight: 700,
                color: palette.text.primary,
                backgroundColor: palette.background.elevated,
                borderColor: palette.divider,
                fontSize: '0.875rem',
              }}
            >
              Object ID
            </TableCell>
            <TableCell
              sx={{
                fontWeight: 700,
                color: palette.text.primary,
                backgroundColor: palette.background.elevated,
                borderColor: palette.divider,
                fontSize: '0.875rem',
              }}
            >
              Description
            </TableCell>
            <TableCell
              sx={{
                fontWeight: 700,
                color: palette.text.primary,
                backgroundColor: palette.background.elevated,
                borderColor: palette.divider,
                fontSize: '0.875rem',
              }}
            >
              Process Area
            </TableCell>
            <TableCell
              sx={{
                fontWeight: 700,
                color: palette.text.primary,
                backgroundColor: palette.background.elevated,
                borderColor: palette.divider,
                fontSize: '0.875rem',
              }}
            >
              Complexity
            </TableCell>
            <TableCell
              sx={{
                fontWeight: 700,
                color: palette.text.primary,
                backgroundColor: palette.background.elevated,
                borderColor: palette.divider,
                fontSize: '0.875rem',
              }}
            >
              Build Type
            </TableCell>
            <TableCell
              sx={{
                fontWeight: 700,
                color: palette.text.primary,
                backgroundColor: palette.background.elevated,
                borderColor: palette.divider,
                fontSize: '0.875rem',
              }}
            >
              Status
            </TableCell>
            <TableCell
              sx={{
                fontWeight: 700,
                color: palette.text.primary,
                backgroundColor: palette.background.elevated,
                borderColor: palette.divider,
                fontSize: '0.875rem',
              }}
            >
              DRA
            </TableCell>
            <TableCell
              sx={{
                fontWeight: 700,
                color: palette.text.primary,
                backgroundColor: palette.background.elevated,
                borderColor: palette.divider,
                fontSize: '0.875rem',
              }}
            >
              Developer
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {objects.map((obj, index) => (
            <TableRow
              key={obj.id}
              sx={{
                backgroundColor: index % 2 === 0 ? 'transparent' : `${palette.background.elevated}40`,
                borderColor: palette.divider,
                '&:hover': {
                  backgroundColor: `${palette.primary.main}08`,
                },
                transition: theme.transitions.create('background-color', {
                  duration: theme.transitions.duration.shorter,
                }),
              }}
            >
              <TableCell
                sx={{
                  color: palette.text.primary,
                  fontWeight: 600,
                  borderColor: palette.divider,
                }}
              >
                {obj.objectId}
              </TableCell>
              <TableCell
                sx={{
                  color: palette.text.secondary,
                  borderColor: palette.divider,
                  maxWidth: 200,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {obj.description}
              </TableCell>
              <TableCell
                sx={{
                  color: palette.text.secondary,
                  borderColor: palette.divider,
                }}
              >
                {obj.processArea}
              </TableCell>
              <TableCell
                sx={{
                  color: palette.text.secondary,
                  borderColor: palette.divider,
                }}
              >
                {obj.complexity}
              </TableCell>
              <TableCell
                sx={{
                  color: palette.text.secondary,
                  borderColor: palette.divider,
                }}
              >
                {obj.buildType}
              </TableCell>
              <TableCell sx={{ borderColor: palette.divider }}>
                <StatusChip status={obj.status} />
              </TableCell>
              <TableCell sx={{ borderColor: palette.divider }}>
                {obj.draUserId && (
                  <UserAvatar userId={obj.draUserId} email={obj.draUserId} sx={{ width: 32, height: 32 }} />
                )}
              </TableCell>
              <TableCell sx={{ borderColor: palette.divider }}>
                {obj.developerUserId && (
                  <UserAvatar userId={obj.developerUserId} email={obj.developerUserId} sx={{ width: 32, height: 32 }} />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default InventoryTable;
