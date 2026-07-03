import React from 'react';
import {
  Avatar,
  Box,
  Chip,
  FormControl,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { Defect, DefectStatus } from '../../api/types';

interface AssigneeOption {
  id: string;
  email: string;
}

interface DefectCardProps {
  defect: Defect;
  users: AssigneeOption[];
  onEdit: (defect: Defect) => void;
  onStatusChange: (defectId: string, status: DefectStatus) => void;
  onAssign: (defectId: string, assignedToUserId: string | null) => void;
}

const severityColor: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  low: 'default',
  medium: 'success',
  high: 'warning',
  critical: 'error',
};

const DefectCard: React.FC<DefectCardProps> = ({ defect, users, onEdit, onStatusChange, onAssign }) => {
  const assigneeEmail =
    defect.assignedToUserEmail || users.find((user) => user.id === defect.assignedToUserId)?.email || 'Unassigned';

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            {defect.title}
          </Typography>
          <Tooltip title="Edit defect">
            <IconButton size="small" onClick={() => onEdit(defect)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {defect.defectDetails ? (
          <Typography variant="body2" color="text.secondary">
            {defect.defectDetails}
          </Typography>
        ) : null}

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
          <Chip size="small" label={defect.severity} color={severityColor[defect.severity] || 'default'} />
          <Chip size="small" label={defect.status.replace('_', ' ')} variant="outlined" />
          {defect.issueCode ? <Chip size="small" label={`Issue: ${defect.issueCode}`} variant="outlined" /> : null}
          {defect.globalObjectId ? <Chip size="small" label={`Object: ${defect.globalObjectId}`} variant="outlined" /> : null}
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center" useFlexGap flexWrap="wrap">
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>{assigneeEmail.slice(0, 1).toUpperCase()}</Avatar>
            <Typography variant="caption">{assigneeEmail}</Typography>
          </Stack>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={defect.status}
              onChange={(e) => onStatusChange(defect.id, e.target.value as DefectStatus)}
            >
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Select
              value={defect.assignedToUserId || ''}
              displayEmpty
              onChange={(e) => onAssign(defect.id, e.target.value ? String(e.target.value) : null)}
            >
              <MenuItem value="">Unassigned</MenuItem>
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            Created {new Date(defect.createdAt).toLocaleString()}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default DefectCard;
