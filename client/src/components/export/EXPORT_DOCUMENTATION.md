# Export UI Module Documentation

## Overview

The Export UI module provides a complete, enterprise-grade export solution for the RediForge planning app. Users can export project data in three formats:

- **Excel (XLSX)** - Comprehensive project data with formatting
- **CSV** - Comma-separated values for spreadsheets and data tools
- **Microsoft Project XML** - Compatible with Microsoft Project and other PM tools

## Architecture

### File Structure

```
client/src/
├── components/export/
│   ├── ExportMenu.tsx          # Main menu component with download triggers
│   ├── ExportDialog.tsx        # Progress dialog
│   ├── ExportProgress.tsx      # Status display component
│   └── index.ts                # Barrel exports
├── utils/
│   └── downloadFile.ts         # Download utility with retry logic
├── pages/
│   ├── PlanPage.tsx            # ✅ Integrated with ExportMenu
│   ├── InventoryPage.tsx       # ✅ Integrated with ExportMenu
│   └── SchedulePage.tsx        # ✅ Integrated with ExportMenu
└── layout/
    └── ContentHeader.tsx       # ✅ Updated with `actions` prop
```

## Components

### ExportMenu

Main component that provides the export interface.

**Props:**
```typescript
interface ExportMenuProps {
  projectId: string;          // Required: Project ID to export
  variant?: 'icon' | 'button'; // Button style (default: 'icon')
  label?: string;              // Button label (default: 'Export')
}
```

**Features:**
- Icon or button variant
- Dropdown menu with 3 export options
- Automatic download with retry logic (3 attempts)
- Success/error snackbar notifications
- Progress dialog during export

**Usage:**
```typescript
import { ExportMenu } from '../components/export';

function MyPage() {
  return (
    <ExportMenu 
      projectId={projectId} 
      variant="icon"
      label="Export Project"
    />
  );
}
```

### ExportDialog

Modal dialog showing export progress and status.

**Props:**
```typescript
interface ExportDialogProps {
  open: boolean;                          // Dialog open state
  onClose: () => void;                    // Called to close dialog
  exportType: 'excel' | 'csv' | 'projectXml'; // Export format
  isLoading?: boolean;                    // Is export in progress
  error?: string | null;                  // Error message if failed
  onRetry?: () => void;                   // Called when retry clicked
}
```

**Features:**
- Shows description of what's being exported
- Linear progress bar during export
- Success message with download confirmation
- Error display with retry button
- Auto-closes on success after 1.5 seconds

### ExportProgress

Simple component to display progress status.

**Props:**
```typescript
interface ExportProgressProps {
  status: 'loading' | 'success' | 'error';
  message?: string;
  progress?: number;              // 0-100
  variant?: 'linear' | 'circular';
}
```

**Features:**
- Three distinct status states
- Optional progress percentage
- Loading and circular progress indicators
- Color-coded status display (green success, red error)

## Utilities

### downloadFile

Core utility for downloading files from API endpoints.

**API:**
```typescript
// Basic download
await downloadFile('/projects/123/export/excel', {
  filename: 'project-123-export.xlsx',
});

// With content type override
await downloadFile('/projects/123/export/csv', {
  filename: 'project-123-export.csv',
  contentType: 'text/csv',
});

// With automatic retry (3 attempts)
await downloadFileWithRetry('/projects/123/export/excel', {
  filename: 'project-123-export.xlsx',
});
```

**Implementation Details:**
- Uses Axios `apiClient` with JWT auth
- Requests response as blob
- Creates temporary object URL
- Triggers browser download
- Cleans up resources after download
- Exponential backoff on retry (1s, 2s, 3s)
- Includes error parsing with `parseApiError`

## Backend Integration

### Expected Endpoints

All endpoints are project-scoped and return file blobs:

```
GET /api/projects/:projectId/export/excel
GET /api/projects/:projectId/export/csv
GET /api/projects/:projectId/export/project-xml
```

**Response Format:**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
                (or text/csv, application/xml)
Content-Disposition: attachment; filename="project-123-export.xlsx"
```

**Export Data:**

- **Excel**: Complete project context including:
  - Program → Mock Cycle → Project hierarchy
  - Project objects with all metadata
  - Task groups and all tasks
  - Dependencies and relationships
  - Schedule items
  - Formatted as professional spreadsheet with headers

- **CSV**: Inventory focus including:
  - Project-based object inventory
  - All visible table columns
  - One row per object
  - Comma-separated with proper escaping

- **Project XML**: Microsoft Project compatible including:
  - Project structure and hierarchy
  - Task list with durations
  - Task relationships (dependencies)
  - Resource assignments
  - Schedule information

## Page Integration

### PlanPage

```typescript
<ContentHeader
  title="Plan"
  stats={[...]}
  actions={projectId ? <ExportMenu projectId={projectId} variant="icon" /> : null}
>
  {/* Content */}
</ContentHeader>
```

**Export includes:**
- All data objects
- All task groups
- All tasks and their relationships
- Schedule context
- Dependencies graph

### InventoryPage

```typescript
<ContentHeader
  title="Inventory"
  stats={[...]}
  actions={projectId ? <ExportMenu projectId={projectId} variant="icon" /> : null}
/>
```

**Export includes:**
- Inventory table data
- All visible columns
- Applied filters
- Object metadata

### SchedulePage

```typescript
<ContentHeader
  title="Schedule"
  actions={projectId ? <ExportMenu projectId={projectId} variant="icon" /> : null}
/>
```

**Export includes:**
- Schedule items for project
- Related tasks
- Related objects
- Date ranges and durations

## UX Behavior

### Export Flow

1. User clicks Export button/icon
2. Menu appears with 3 format options
3. User selects format
4. Menu closes, progress dialog opens
5. Download initiates in background
6. Dialog shows "Preparing export..."
7. On success:
   - Shows "Export ready! Download starting..."
   - Toast: "Export completed! Your file has been downloaded."
   - Dialog auto-closes after 1.5 seconds
8. On error:
   - Shows error message in dialog
   - Toast: Error description
   - Retry button available
   - Auto-retry with exponential backoff

### Notifications

**Success Snackbar:**
- Message: "Export completed! Your file has been downloaded."
- Severity: Success (green)
- Duration: 6 seconds
- Position: Bottom-left

**Error Snackbar:**
- Message: Error description from server/network
- Severity: Error (red)
- Duration: 6 seconds (until dismissed)
- Position: Bottom-left

## Styling

All components use Material-UI theme system:

- **Primary Color**: Export button and icons
- **Divider**: Section separators
- **Elevated Background**: Dialog content box
- **Text Colors**: Following theme semantic hierarchy
- **Shadows**: MUI theme shadow levels for depth
- **Border Radius**: 8px (theme.spacing(1)) for consistency

## Error Handling

The export system handles multiple error scenarios:

1. **Network Errors** - Automatic retry with exponential backoff
2. **API Errors** - Parsed and displayed in dialog + snackbar
3. **Blob Creation Failures** - Caught and shown to user
4. **Download Failures** - Retry button available in dialog

Error messages are normalized through `parseApiError` utility for consistency.

## Performance Considerations

- **Lazy Loading**: Export components only render when needed
- **No Polling**: Download uses native browser mechanism
- **Efficient Memory**: Blobs cleaned up after download
- **Timeout Handling**: 30-second timeout on API requests
- **Retry Logic**: Prevents flaky network issues
- **No UI Blocking**: Download happens in background

## Accessibility

- Export button has tooltip with aria-label
- Dialog is properly labeled with title
- Progress indicators follow ARIA patterns
- Color not sole indicator (icons + text for status)
- Keyboard navigation support through MUI components

## Browser Compatibility

Works on all modern browsers (Chrome, Firefox, Safari, Edge):
- Uses Blob API
- Uses Object URL creation
- Dynamic anchor element for downloads
- Fallback error messages for older browsers

## Testing Recommendations

### Unit Tests
- downloadFile utility with mock axios
- ExportMenu menu opening/closing
- Dialog status transitions
- Error handling and retry logic

### Integration Tests
- Full export flow from button click to download
- Snackbar notifications display
- Dialog auto-close on success
- Retry button functionality

### E2E Tests
- User exports from each page
- Verifies file download
- Checks file contents (for Excel/CSV)
- Error recovery scenarios

## Future Enhancements

1. **Custom Export Fields**: Let users select which columns to export
2. **Export Scheduling**: Schedule exports to run at specific times
3. **Export History**: Track past exports for audit trail
4. **Batch Exports**: Export multiple projects at once
5. **Export Templates**: Save and reuse export configurations
6. **Advanced Filtering**: Pre-filter data before export
7. **Compression**: Zip multiple files for download
8. **Cloud Storage**: Direct upload to S3, OneDrive, Google Drive

## Troubleshooting

### Export Button Not Showing
- Verify `projectId` is available from route params
- Check ExportMenu import is correct
- Ensure ContentHeader has `actions` prop

### Download Not Starting
- Check browser console for errors
- Verify backend endpoints are implemented
- Check CORS configuration
- Verify file size isn't too large

### Snackbar Not Showing
- Verify Snackbar component renders
- Check z-index conflicts with other modals
- Verify Alert component is imported from MUI

### Retry Not Working
- Check network connectivity
- Verify backend endpoint is responding
- Check logs for server errors

## Code Examples

### Adding Export to Custom Page

```typescript
import { ExportMenu } from '../components/export';

function CustomPage() {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <ContentHeader
      title="My Page"
      actions={projectId && <ExportMenu projectId={projectId} />}
    />
  );
}
```

### Custom Download Handler

```typescript
import { downloadFileWithRetry } from '../utils/downloadFile';

async function handleCustomExport() {
  try {
    await downloadFileWithRetry(`/projects/${projectId}/export/custom`, {
      filename: `project-${projectId}-custom.xlsx`,
    });
  } catch (error) {
    console.error('Export failed:', error);
  }
}
```

## Related Documentation

- [Material-UI Button](https://mui.com/material-ui/api/button/)
- [Material-UI Menu](https://mui.com/material-ui/api/menu/)
- [Material-UI Dialog](https://mui.com/material-ui/api/dialog/)
- [Material-UI Snackbar](https://mui.com/material-ui/api/snackbar/)
- [Axios](https://axios-http.com/)
- [Blob API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
