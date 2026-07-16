import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import type { CdmAttributeFormValues } from '../../types/commonDataModel';

interface AddEditCdmAttributeModalProps {
  open: boolean;
  initialValues?: CdmAttributeFormValues;
  onClose: () => void;
  onSave: (values: CdmAttributeFormValues) => Promise<void> | void;
  saving?: boolean;
  title?: string;
}

const emptyValues: CdmAttributeFormValues = {
  attributeName: '',
  attributeDescription: '',
  dataType: '',
  length: '',
  businessRules: '',
};

const AddEditCdmAttributeModal: React.FC<AddEditCdmAttributeModalProps> = ({
  open,
  initialValues,
  onClose,
  onSave,
  saving = false,
  title,
}) => {
  const [formValues, setFormValues] = React.useState<CdmAttributeFormValues>(emptyValues);

  React.useEffect(() => {
    if (!open) {
      return;
    }
    setFormValues(initialValues ? { ...initialValues } : emptyValues);
  }, [open, initialValues]);

  const handleSave = async () => {
    await onSave({
      ...formValues,
      attributeName: formValues.attributeName.trim(),
      attributeDescription: formValues.attributeDescription.trim(),
      dataType: formValues.dataType.trim(),
      length: formValues.length.trim(),
      businessRules: formValues.businessRules.trim(),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title || (initialValues ? 'Edit Attribute' : 'Add Attribute')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 2 }}>
        <TextField
          label="Attribute Name"
          size="small"
          value={formValues.attributeName}
          onChange={(e) => setFormValues((prev) => ({ ...prev, attributeName: e.target.value }))}
          autoFocus
          fullWidth
        />
        <TextField
          label="Description"
          size="small"
          value={formValues.attributeDescription}
          onChange={(e) => setFormValues((prev) => ({ ...prev, attributeDescription: e.target.value }))}
          fullWidth
        />
        <TextField
          label="Data Type"
          size="small"
          value={formValues.dataType}
          onChange={(e) => setFormValues((prev) => ({ ...prev, dataType: e.target.value }))}
          fullWidth
        />
        <TextField
          label="Length"
          size="small"
          value={formValues.length}
          onChange={(e) => setFormValues((prev) => ({ ...prev, length: e.target.value.replace(/[^0-9]/g, '') }))}
          fullWidth
        />
        <TextField
          label="Business Rules"
          size="small"
          value={formValues.businessRules}
          onChange={(e) => setFormValues((prev) => ({ ...prev, businessRules: e.target.value }))}
          multiline
          minRows={3}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !formValues.attributeName.trim()} sx={{ textTransform: 'none' }}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddEditCdmAttributeModal;