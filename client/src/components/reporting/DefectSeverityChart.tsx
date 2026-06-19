import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ReportingDefectSeverityBreakdown } from '../../api/types';

interface DefectSeverityChartProps {
  data: ReportingDefectSeverityBreakdown;
}

const COLORS = ['#90a4ae', '#4db6ac', '#ffb74d', '#ef5350'];

const DefectSeverityChart: React.FC<DefectSeverityChartProps> = ({ data }) => {
  const chartData = [
    { name: 'Low', value: data.low },
    { name: 'Medium', value: data.medium },
    { name: 'High', value: data.high },
    { name: 'Critical', value: data.critical },
  ];

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          Defect Severity
        </Typography>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={90} label>
              {chartData.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DefectSeverityChart;
