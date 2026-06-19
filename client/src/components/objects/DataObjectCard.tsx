// client/src/components/objects/DataObjectCard.tsx

import React from 'react';
import { Card, CardContent, CardHeader, Box, Stack, Typography, IconButton, useTheme, Chip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StatusChip from '../shared/StatusChip';
import TimelineBar from '../shared/TimelineBar';
import DateRangeDisplay from '../shared/DateRangeDisplay';
import UserAvatar from '../shared/UserAvatar';
import { ProjectObject } from '../../hooks/useProjectObjects';
import { palette } from '../../theme/palette';

interface DataObjectCardProps {
  object: ProjectObject;
  invalidRecordsCount?: number;
  openDefectsCount?: number;
  onEdit?: (object: ProjectObject) => void;
  onDelete?: (objectId: string) => void;
  onClick?: () => void;
}

const DataObjectCard: React.FC<DataObjectCardProps> = ({
  object,
  invalidRecordsCount = 0,
  openDefectsCount = 0,
  onEdit,
  onDelete,
  onClick,
}) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        cursor: 'pointer',
        backgroundColor: palette.background.paper,
        backgroundImage: 'none',
        border: `1px solid ${palette.divider}`,
        transition: theme.transitions.create(['box-shadow', 'border-color', 'transform'], {
          duration: theme.transitions.duration.shorter,
        }),
        '&:hover': {
          boxShadow: theme.shadows[8],
          borderColor: `${palette.primary.main}60`,
          transform: 'translateY(-4px)',
        },
      }}
      onClick={onClick}
    >
      <CardHeader
        title={
          <Typography
            variant="h6"
            noWrap
            sx={{
              fontWeight: 700,
              color: palette.text.primary,
            }}
          >
            {object.objectId}
          </Typography>
        }
        subheader={
          <Typography
            variant="body2"
            sx={{
              color: palette.text.secondary,
              noWrap: true,
              fontWeight: 500,
            }}
          >
            {object.processArea}
          </Typography>
        }
        action={
          <Box onClick={(e) => e.stopPropagation()}>
            {onEdit && (
              <IconButton
                size="small"
                onClick={() => onEdit(object)}
                sx={{
                  color: palette.primary.main,
                  '&:hover': {
                    backgroundColor: `${palette.primary.main}12`,
                  },
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            )}
            {onDelete && (
              <IconButton
                size="small"
                onClick={() => onDelete(object.id)}
                sx={{
                  color: palette.error.main,
                  '&:hover': {
                    backgroundColor: `${palette.error.main}12`,
                  },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        }
        sx={{ pb: 1 }}
      />

      <CardContent sx={{ pt: 0 }}>
        <Stack spacing={2}>
          {/* Timeline */}
          <Box>
            <TimelineBar
              startDate={object.startDate}
              endDate={object.endDate}
              status={object.status}
            />
          </Box>

          {/* Description */}
          {object.description && (
            <Typography
              variant="body2"
              sx={{
                color: palette.text.secondary,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {object.description}
            </Typography>
          )}

          {/* Status and Complexity */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <StatusChip status={object.status} />
            {object.complexity && (
              <StatusChip
                label={object.complexity}
                variant="outlined"
              />
            )}
            {invalidRecordsCount > 0 ? (
              <Chip size="small" color="warning" label={`${invalidRecordsCount} invalid`} />
            ) : null}
            {openDefectsCount > 0 ? (
              <Chip size="small" color="error" label={`${openDefectsCount} open defects`} />
            ) : null}
          </Box>

          {/* Dates */}
          <DateRangeDisplay startDate={object.startDate} endDate={object.endDate} />

          {/* Build Type */}
          {object.buildType && (
            <Typography
              variant="caption"
              sx={{
                color: palette.text.secondary,
                fontWeight: 500,
              }}
            >
              <strong style={{ color: palette.text.primary }}>Build:</strong> {object.buildType}
            </Typography>
          )}

          {/* Assigned Users */}
          {(object.draUserId || object.developerUserId) && (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {object.draUserId && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: palette.text.secondary,
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    DRA
                  </Typography>
                  <UserAvatar userId={object.draUserId} email={object.draUserId} sx={{ width: 32, height: 32 }} />
                </Box>
              )}
              {object.developerUserId && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: palette.text.secondary,
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    DEV
                  </Typography>
                  <UserAvatar userId={object.developerUserId} email={object.developerUserId} sx={{ width: 32, height: 32 }} />
                </Box>
              )}
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default DataObjectCard;
