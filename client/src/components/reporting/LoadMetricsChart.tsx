import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ReportingSummary } from '../../api/types';

interface LoadMetricsChartProps {
  data: ReportingSummary['loadMetrics'];
}

const LoadMetricsChart: React.FC<LoadMetricsChartProps> = ({ data }) => {
  const chartData = [
    { name: 'Attempted', value: data.attempted },
    { name: 'Succeeded', value: data.succeeded },
    { name: 'Failed', value: data.failed },
  ];

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          Load Metrics
        </Typography>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#42a5f5" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default LoadMetricsChart;
