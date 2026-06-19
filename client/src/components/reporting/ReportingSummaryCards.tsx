import React from 'react';
import { Card, CardContent, Grid, Typography } from '@mui/material';
import { ReportingSummary } from '../../api/types';

interface ReportingSummaryCardsProps {
  summary: ReportingSummary;
  title?: string;
}

const ReportingSummaryCards: React.FC<ReportingSummaryCardsProps> = ({ summary, title }) => {
  const cards = [
    { label: 'Total Defects', value: summary.defects.total },
    { label: 'Open Defects', value: summary.defects.open },
    { label: 'Preload Invalid', value: summary.validation.preload.invalidRecords },
    { label: 'Postload Invalid', value: summary.validation.postload.invalidRecords },
    { label: 'Load Failure Rate', value: `${summary.loadMetrics.failureRate}%` },
  ];

  return (
    <>
      {title ? (
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          {title}
        </Typography>
      ) : null}
      <Grid container spacing={2}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={2.4 as any} key={card.label}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  {card.label}
                </Typography>
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 700 }}>
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
};

export default ReportingSummaryCards;
