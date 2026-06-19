import React from 'react';
import {
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { ReportingIssueBreakdownItem } from '../../api/types';

interface IssueBreakdownTableProps {
  data: ReportingIssueBreakdownItem[];
}

const IssueBreakdownTable: React.FC<IssueBreakdownTableProps> = ({ data }) => {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          Issue Breakdown
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Issue Code</TableCell>
              <TableCell>Issue Description</TableCell>
              <TableCell>Count</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Defects Linked</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item, index) => (
              <TableRow key={`${item.taskId}-${item.issueCode}-${index}`}>
                <TableCell>{item.issueCode}</TableCell>
                <TableCell>{item.issueDescription || '—'}</TableCell>
                <TableCell>{item.count}</TableCell>
                <TableCell>
                  <Chip size="small" label={item.severity} variant="outlined" />
                </TableCell>
                <TableCell>{item.defectsLinked}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default IssueBreakdownTable;
