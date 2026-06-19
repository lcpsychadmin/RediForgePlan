import React from 'react';
import { Card, CardContent, Grid, Typography } from '@mui/material';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ReportingTrends } from '../../api/types';

interface TrendChartsProps {
  trends: ReportingTrends;
}

const TrendCharts: React.FC<TrendChartsProps> = ({ trends }) => {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          Trends Over Time
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Defects</Typography>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trends.defectsOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="open" stroke="#ef5350" strokeWidth={2} />
                <Line type="monotone" dataKey="resolved" stroke="#66bb6a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Validation Failures</Typography>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trends.validationOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="invalidRecords" stroke="#ffa726" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Load Failures</Typography>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trends.loadFailuresOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="failed" stroke="#42a5f5" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default TrendCharts;
