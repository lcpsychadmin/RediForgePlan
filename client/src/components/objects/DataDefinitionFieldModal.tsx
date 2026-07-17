import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type {
  DataDefinitionFieldFormValues,
} from '../../types/dataDefinitions';
import {
  FIELD_TYPE_OPTIONS,
  PII_TYPE_OPTIONS,
  SECURITY_CLASSIFICATION_OPTIONS,
  createEmptyFieldFormValues,
} from '../../types/dataDefinitions';

interface DataDefinitionFieldModalProps {
  open: boolean;
  initialValues?: DataDefinitionFieldFormValues;
  onClose: () => void;
  onSave: (values: DataDefinitionFieldFormValues) => Promise<void> | void;
  saving?: boolean;
  title?: string;
}

type FieldErrors = Partial<Record<keyof DataDefinitionFieldFormValues, string>>;

const requiredMessage = 'Required';

const DataDefinitionFieldModal: React.FC<DataDefinitionFieldModalProps> = ({
  open,
  initialValues,
  onClose,
  onSave,
  saving = false,
  title,
}) => {
  const [formValues, setFormValues] = React.useState<DataDefinitionFieldFormValues>(createEmptyFieldFormValues());
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [attemptedSave, setAttemptedSave] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      return;
    }
    setFormValues(initialValues ? { ...initialValues } : createEmptyFieldFormValues());
    setErrors({});
    setAttemptedSave(false);
  }, [initialValues, open]);

  const validate = React.useCallback((values: DataDefinitionFieldFormValues) => {
    const nextErrors: FieldErrors = {};
    if (!values.fieldName.trim()) nextErrors.fieldName = requiredMessage;
    if (!values.label.trim()) nextErrors.label = requiredMessage;
    if (!values.table.trim()) nextErrors.table = requiredMessage;
    if (!values.tableName.trim()) nextErrors.tableName = requiredMessage;
    if (!values.fieldDescription.trim()) nextErrors.fieldDescription = requiredMessage;
    if (!values.applicationUsage.trim()) nextErrors.applicationUsage = requiredMessage;
    if (!values.businessDefinition.trim()) nextErrors.businessDefinition = requiredMessage;
    if (!values.fieldType.trim()) nextErrors.fieldType = requiredMessage;
    return nextErrors;
  }, []);

  const handleSave = async () => {
    setAttemptedSave(true);
    const nextErrors = validate(formValues);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await onSave({
      ...formValues,
      fieldName: formValues.fieldName.trim(),
      label: formValues.label.trim(),
      table: formValues.table.trim(),
      tableName: formValues.tableName.trim(),
      fieldDescription: formValues.fieldDescription.trim(),
      applicationUsage: formValues.applicationUsage.trim(),
      businessDefinition: formValues.businessDefinition.trim(),
      businessRules: formValues.businessRules.trim(),
      fieldType: formValues.fieldType.trim(),
      fieldLength: formValues.fieldLength.trim(),
      decimalPlaces: formValues.decimalPlaces.trim(),
      legalRegulatoryImplications: formValues.legalRegulatoryImplications.trim(),
      referenceTable: formValues.referenceTable.trim(),
      groupingTab: formValues.groupingTab.trim(),
      piiType: formValues.piiType.trim(),
      securityControls: formValues.securityControls.trim(),
      databricksTable: formValues.databricksTable.trim(),
      databricksField: formValues.databricksField.trim(),
    });
  };

  const showError = (field: keyof DataDefinitionFieldFormValues) => Boolean((attemptedSave || errors[field]) && errors[field]);
  const helperText = (field: keyof DataDefinitionFieldFormValues) => (showError(field) ? errors[field] : undefined);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>{title || (initialValues ? 'Edit Field' : 'Add Field')}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Core Metadata</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
              <TextField label="Field Name" required size="small" value={formValues.fieldName} error={showError('fieldName')} helperText={helperText('fieldName')} onChange={(e) => setFormValues((prev) => ({ ...prev, fieldName: e.target.value }))} autoFocus fullWidth />
              <TextField label="Label" required size="small" value={formValues.label} error={showError('label')} helperText={helperText('label')} onChange={(e) => setFormValues((prev) => ({ ...prev, label: e.target.value }))} fullWidth />
              <TextField label="Table" required size="small" value={formValues.table} error={showError('table')} helperText={helperText('table')} onChange={(e) => setFormValues((prev) => ({ ...prev, table: e.target.value }))} fullWidth />
              <TextField label="Table Name" required size="small" value={formValues.tableName} error={showError('tableName')} helperText={helperText('tableName')} onChange={(e) => setFormValues((prev) => ({ ...prev, tableName: e.target.value }))} fullWidth />
              <TextField label="Field Description" required size="small" multiline minRows={2} value={formValues.fieldDescription} error={showError('fieldDescription')} helperText={helperText('fieldDescription')} onChange={(e) => setFormValues((prev) => ({ ...prev, fieldDescription: e.target.value }))} fullWidth />
              <TextField label="Field Type" required select size="small" value={formValues.fieldType} error={showError('fieldType')} helperText={helperText('fieldType')} onChange={(e) => setFormValues((prev) => ({ ...prev, fieldType: e.target.value }))} fullWidth>
                {FIELD_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </TextField>
              <TextField label="Field Length" size="small" value={formValues.fieldLength} onChange={(e) => setFormValues((prev) => ({ ...prev, fieldLength: e.target.value.replace(/[^0-9]/g, '') }))} fullWidth />
              <TextField label="Decimal Places" size="small" value={formValues.decimalPlaces} onChange={(e) => setFormValues((prev) => ({ ...prev, decimalPlaces: e.target.value.replace(/[^0-9]/g, '') }))} fullWidth />
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Business Metadata</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
              <TextField label="Application Usage" required size="small" multiline minRows={2} value={formValues.applicationUsage} error={showError('applicationUsage')} helperText={helperText('applicationUsage')} onChange={(e) => setFormValues((prev) => ({ ...prev, applicationUsage: e.target.value }))} fullWidth />
              <TextField label="Business Definition" required size="small" multiline minRows={2} value={formValues.businessDefinition} error={showError('businessDefinition')} helperText={helperText('businessDefinition')} onChange={(e) => setFormValues((prev) => ({ ...prev, businessDefinition: e.target.value }))} fullWidth />
              <TextField label="Business Rules" size="small" multiline minRows={2} value={formValues.businessRules} onChange={(e) => setFormValues((prev) => ({ ...prev, businessRules: e.target.value }))} fullWidth />
              <TextField label="Legal/Regulatory Implications" size="small" multiline minRows={2} value={formValues.legalRegulatoryImplications} onChange={(e) => setFormValues((prev) => ({ ...prev, legalRegulatoryImplications: e.target.value }))} fullWidth />
              <TextField label="Reference Table" size="small" value={formValues.referenceTable} onChange={(e) => setFormValues((prev) => ({ ...prev, referenceTable: e.target.value }))} fullWidth />
              <TextField label="Grouping/Tab" size="small" value={formValues.groupingTab} onChange={(e) => setFormValues((prev) => ({ ...prev, groupingTab: e.target.value }))} fullWidth />
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Governance</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5 }}>
              <TextField label="Security Classification" select size="small" value={formValues.securityClassification} onChange={(e) => setFormValues((prev) => ({ ...prev, securityClassification: e.target.value }))} fullWidth>
                <MenuItem value=""><em>None</em></MenuItem>
                {SECURITY_CLASSIFICATION_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </TextField>
              <TextField label="PII Type" select size="small" value={formValues.piiType} onChange={(e) => setFormValues((prev) => ({ ...prev, piiType: e.target.value }))} fullWidth>
                <MenuItem value=""><em>None</em></MenuItem>
                {PII_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </TextField>
              <TextField label="Security Controls" size="small" multiline minRows={2} value={formValues.securityControls} onChange={(e) => setFormValues((prev) => ({ ...prev, securityControls: e.target.value }))} fullWidth />
            </Box>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mt: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input type="checkbox" checked={formValues.systemRequired} onChange={(e) => setFormValues((prev) => ({ ...prev, systemRequired: e.target.checked }))} />
                <Typography variant="body2">System Required</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input type="checkbox" checked={formValues.businessProcessRequired} onChange={(e) => setFormValues((prev) => ({ ...prev, businessProcessRequired: e.target.checked }))} />
                <Typography variant="body2">Business Process Required</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input type="checkbox" checked={formValues.suppressedField} onChange={(e) => setFormValues((prev) => ({ ...prev, suppressedField: e.target.checked }))} />
                <Typography variant="body2">Suppressed Field</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input type="checkbox" checked={formValues.isKey} onChange={(e) => setFormValues((prev) => ({ ...prev, isKey: e.target.checked }))} />
                <Typography variant="body2">Key</Typography>
              </Box>
            </Stack>
          </Box>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ fontWeight: 700 }}>Technical Metadata</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                <TextField label="Databricks Table" size="small" value={formValues.databricksTable} onChange={(e) => setFormValues((prev) => ({ ...prev, databricksTable: e.target.value }))} fullWidth />
                <TextField label="Databricks Field" size="small" value={formValues.databricksField} onChange={(e) => setFormValues((prev) => ({ ...prev, databricksField: e.target.value }))} fullWidth />
              </Box>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: 'none' }}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DataDefinitionFieldModal;
