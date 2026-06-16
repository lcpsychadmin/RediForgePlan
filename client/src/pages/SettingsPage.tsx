// client/src/pages/SettingsPage.tsx

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Layout from '../components/Layout';

interface Picklist {
  name: string;
  values: string[];
}

const SettingsPage: React.FC = () => {
  // Picklists state
  const [picklists, setPicklists] = useState<Record<string, Picklist>>({
    processArea: {
      name: 'Process Area',
      values: ['A2R', 'CTRM', 'GTS', 'H2R', 'I2L', 'MDM', 'P2C', 'P2D', 'PSS', 'R2R', 'S2P', 'TM'],
    },
    complexity: {
      name: 'Complexity',
      values: ['1-Complex', '2-Medium', '3-Simple'],
    },
    deploymentDisposition: {
      name: 'Deployment Disposition',
      values: ['In Scope', 'Out of Scope', 'Pending Approval', 'Pending Confirmation'],
    },
    buildType: {
      name: 'Build Type',
      values: ['New', 'Modify'],
    },
    objectType: {
      name: 'Object Type',
      values: ['Master Data', 'Transactional', 'Document'],
    },
    cutoverPhase: {
      name: 'Cutover Phase',
      values: ['Pre-Cutover', 'Blackout', 'Post Go-Live'],
    },
    ddmApproach: {
      name: 'DDM Approach',
      values: ['Not in Scope', 'Automated', 'Manual'],
    },
    riskSecurityType: {
      name: 'Risk/Security Type',
      values: ['Standard', 'Risk & Control', 'Data Masking'],
    },
    migrationType: {
      name: 'Migration Type',
      values: ['Automated', 'Manual'],
    },
    factorType: {
      name: 'Factor Type',
      values: [
        'Conversion - Extract, Transform & Load',
        'Conversion - Construct & Load',
        'Conversion - Construct, Transform & Manual Load',
        'Conversion - Construct, Transform & Load',
        'Conversion - Extract, Transform & Manual Load',
        'Manual',
      ],
    },
    loadMethod: {
      name: 'Load Method',
      values: ['LTMC', 'IDOC', 'BAPI', 'LSMW', 'BODS - IDOC', 'BODS - BAPI', 'Custom ABAP Program', 'Informatica', 'Migration Cockpit', 'SAP Standard T Code', 'Manual'],
    },
  });

  const [selectedPicklist, setSelectedPicklist] = useState<string>('processArea');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newValueInput, setNewValueInput] = useState('');

  const handleAddValue = () => {
    if (newValueInput.trim()) {
      const updated = { ...picklists };
      if (!updated[selectedPicklist].values.includes(newValueInput.trim())) {
        updated[selectedPicklist].values.push(newValueInput.trim());
        setPicklists(updated);
      }
      setNewValueInput('');
    }
  };

  const handleRemoveValue = (value: string) => {
    const updated = { ...picklists };
    updated[selectedPicklist].values = updated[selectedPicklist].values.filter((v) => v !== value);
    setPicklists(updated);
  };

  const handleSaveChanges = () => {
    // TODO: Implement API call to save picklist changes
    console.log('Saving picklists:', picklists);
    alert('Picklist changes saved (TODO: implement backend integration)');
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
          Settings
        </Typography>

        <Box sx={{ display: 'flex', gap: 3, height: 'calc(100vh - 200px)' }}>
          {/* Left Sidebar - Picklist List */}
          <Card sx={{ width: '280px', flexShrink: 0 }}>
            <CardHeader title="Picklists" />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              <List sx={{ p: 0 }}>
                {Object.entries(picklists).map(([key, picklist]) => (
                  <ListItem
                    key={key}
                    button
                    selected={selectedPicklist === key}
                    onClick={() => setSelectedPicklist(key)}
                    sx={{
                      backgroundColor: selectedPicklist === key ? 'primary.lighter' : 'transparent',
                      '&:hover': { backgroundColor: 'action.hover' },
                      borderLeft: selectedPicklist === key ? '4px solid' : 'none',
                      borderColor: 'primary.main',
                    }}
                  >
                    <ListItemText primary={picklist.name} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>

          {/* Right Panel - Edit Picklist */}
          <Card sx={{ flex: 1 }}>
            <CardHeader title={`Edit ${picklists[selectedPicklist]?.name || 'Picklist'}`} />
            <Divider />
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                Values
              </Typography>

              {/* Add New Value */}
              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Enter new value"
                  value={newValueInput}
                  onChange={(e) => setNewValueInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddValue();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                  startIcon={<AddIcon />}
                  onClick={handleAddValue}
                >
                  Add
                </Button>
              </Box>

              {/* Values List */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 4 }}>
                {picklists[selectedPicklist]?.values.map((value) => (
                  <Chip
                    key={value}
                    label={value}
                    onDelete={() => handleRemoveValue(value)}
                    deleteIcon={<DeleteIcon />}
                    variant="outlined"
                    sx={{
                      backgroundColor: 'background.paper',
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      fontWeight: 500,
                    }}
                  />
                ))}
              </Box>

              {picklists[selectedPicklist]?.values.length === 0 && (
                <Typography color="textSecondary" align="center">
                  No values in this picklist
                </Typography>
              )}

              {/* Save Button */}
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button variant="text">Reset</Button>
                <Button
                  variant="contained"
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                  onClick={handleSaveChanges}
                >
                  Save Changes
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Layout>
  );
};

export default SettingsPage;
