import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ReportingSummary } from '../../api/types';

interface ValidationStatsChartProps {
  data: ReportingSummary['validation'];
}

const ValidationStatsChart: React.FC<ValidationStatsChartProps> = ({ data }) => {
  const chartData = [
    {
      name: 'Preload',
      valid: data.preload.validRecords,
      invalid: data.preload.invalidRecords,
    },
    {
      name: 'Postload',
      valid: data.postload.validRecords,
      invalid: data.postload.invalidRecords,
    },
  ];

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          Validation Stats
        </Typography>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="valid" fill="#4db6ac" radius={[6, 6, 0, 0]} />
            <Bar dataKey="invalid" fill="#ef5350" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ValidationStatsChart;
