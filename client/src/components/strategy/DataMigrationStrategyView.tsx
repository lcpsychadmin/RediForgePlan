import React from 'react';
import ReactQuill from 'react-quill';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  LinearProgress,
  Paper,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import 'quill/dist/quill.snow.css';

type MockCycleWorkflow = {
  mockCycleId: string;
  workflow: any;
};

type StrategySectionHistoryEntry = {
  id: string;
  section_key: string;
  previous_content: string;
  next_content: string;
  changed_by: string | null;
  changed_by_email?: string | null;
  created_at: string;
};

type StrategyPayload = {
  project: { id: string; name: string };
  strategy: {
    sections: Record<string, string>;
    roles: { leadUserId: string | null; projectManagerUserId: string | null };
    roleUsers?: { leadEmail: string | null; projectManagerEmail: string | null };
  };
  mockCycles: Array<{ id: string; name: string; startDate?: string; endDate?: string }>;
  cycleWorkflow: MockCycleWorkflow[];
  documents: Array<{
    id: string;
    file_name: string;
    document_type: string;
    file_size: number;
    created_at: string;
    mock_cycle_name?: string | null;
    mock_cycle_id?: string | null;
    uploaded_by_email?: string | null;
  }>;
};

const SECTION_CONFIG: Array<{ key: string; label: string; rows?: number }> = [
  { key: 'purpose', label: 'Purpose', rows: 3 },
  { key: 'guidingPrinciples', label: 'Guiding Principles', rows: 4 },
  { key: 'conversionScope', label: 'Conversion Scope', rows: 4 },
  { key: 'conversionMethods', label: 'Conversion Methods', rows: 4 },
  { key: 'conversionDocuments', label: 'Conversion Documents', rows: 4 },
  { key: 'dataReadiness', label: 'Data Readiness', rows: 4 },
  { key: 'dataConversion', label: 'Data Conversion', rows: 4 },
  { key: 'mockConversionCycles', label: 'Mock Cycles', rows: 4 },
  { key: 'goLiveSimulationCutover', label: 'Go-Live Simulation & Cutover', rows: 4 },
  { key: 'dependencies', label: 'Dependencies', rows: 3 },
  { key: 'assumptions', label: 'Assumptions', rows: 3 },
];

const SECTION_EXPECTATIONS: Record<string, string[]> = {
  purpose: [
    'State the migration intent and business objective.',
    'Define the outcomes this strategy must achieve.',
    'Explain how readiness and conversion support deployment success.',
  ],
  guidingPrinciples: [
    'Capture the rules that guide migration decisions.',
    'Call out automation, repeatability, and quality expectations.',
    'Describe the collaboration model across teams.',
  ],
  conversionScope: [
    'List master and transactional data in scope.',
    'Define ownership and relevancy rules.',
    'Call out exclusions and boundaries clearly.',
  ],
  conversionMethods: [
    'Identify automated, manual, and semi-automated methods.',
    'Explain why each method is being used.',
    'Note constraints that drive the chosen approach.',
  ],
  conversionDocuments: [
    'Summarize the required conversion documents.',
    'Define the purpose and ownership of each one.',
    'Explain how documentation supports conversion accuracy.',
  ],
  dataReadiness: [
    'Describe profiling, cleansing, enrichment, and preparation activities.',
    'Identify tools, owners, and quality dimensions.',
    'Show how readiness improves over iterative cycles.',
  ],
  dataConversion: [
    'Explain the ingest, transform, and load flow.',
    'Describe how design rules drive transformation and enrichment.',
    'Clarify how data is constructed and loaded into the target system.',
  ],
  mockConversionCycles: [
    'Describe the number, purpose, and scope of each mock cycle.',
    'Explain how data supports testing in each cycle.',
    'Show how the cycles build readiness for cutover.',
    'Define, at a high level, how entry readiness will be determined before each cycle starts.',
    'Define, at a high level, how exit completion will be assessed before moving to the next cycle.',
  ],
  goLiveSimulationCutover: [
    'Describe dress rehearsal and cutover execution approach.',
    'Explain timing, sequencing, and manual construction steps.',
    'Define validation expectations and business participation.',
  ],
  dependencies: [
    'Capture upstream and downstream migration dependencies.',
    'Include systems, integrations, readiness gates, and deliverables.',
    'Highlight cross-team dependencies that can affect timing.',
  ],
  assumptions: [
    'Document assumptions behind the migration strategy.',
    'Include data availability, resources, tools, and participation.',
    'Make explicit what must remain true for the plan to work.',
  ],
};

const SPECIAL_SECTION_KEYS = new Set<string>([]);
const SPECIAL_ACCENT = '#90CAF9';
const SPECIAL_SURFACE = {
  backgroundColor: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 2,
};
const NAV_SURFACE = {
  background: 'linear-gradient(180deg, rgba(144,202,249,0.12) 0%, rgba(255,255,255,0.035) 24%, rgba(255,255,255,0.02) 100%)',
  border: '1px solid rgba(144,202,249,0.18)',
  borderRadius: 2.5,
  boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
};
const SECTION_ACCENTS: Record<string, string> = {
  purpose: '#7CC7FF',
  guidingPrinciples: '#8FE3CF',
  conversionScope: '#A5B4FC',
  conversionMethods: '#63C7B2',
  conversionDocuments: '#F4A261',
  dataReadiness: '#F7C873',
  dataConversion: '#F4978E',
  mockConversionCycles: '#F1B96B',
  goLiveSimulationCutover: '#F59E9E',
  dependencies: '#C4B5FD',
  assumptions: '#A7F3D0',
};
const quillFormats = [
  'header',
  'bold',
  'italic',
  'underline',
  'blockquote',
  'list',
  'indent',
  'bullet',
  'link',
  'image',
];

const normalizeEditorValue = (value: string) => {
  const normalized = String(value || '').trim();
  if (normalized === '<p><br></p>' || normalized === '<div><br></div>' || normalized === '<p></p>') {
    return '';
  }
  return normalized;
};

const hasMeaningfulContent = (value: string) => {
  const normalized = normalizeEditorValue(value);
  if (!normalized) return false;
  const withoutImages = normalized.replace(/<img[^>]*>/gi, ' image ');
  const plainText = withoutImages
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plainText.length > 0;
};

const summarizeHtml = (value: string) => {
  const normalized = normalizeEditorValue(value);
  if (!normalized) return 'No content';
  const text = normalized
    .replace(/<img[^>]*>/gi, ' [image] ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text || 'Image-only update';
};

const looksLikeImageUrl = (value: string) => {
  const trimmed = String(value || '').trim();
  return /^(https?:\/\/|data:image\/)/i.test(trimmed) && /(data:image\/|\.(png|jpe?g|gif|webp|svg)(\?|#|$))/i.test(trimmed);
};

const buildMarkdownTable = (rows: number, columns: number) => {
  const clampedRows = Math.min(Math.max(rows, 1), 20);
  const clampedColumns = Math.min(Math.max(columns, 1), 10);
  const header = `| ${Array.from({ length: clampedColumns }, (_, index) => `Column ${index + 1}`).join(' | ')} |`;
  const divider = `| ${Array.from({ length: clampedColumns }, () => '---').join(' | ')} |`;
  const bodyRows = Array.from({ length: clampedRows }, () => `| ${Array.from({ length: clampedColumns }, () => ' ').join(' | ')} |`);
  return [header, divider, ...bodyRows].join('\n');
};

interface Props {
  projectId: string;
  projectName?: string;
  userId?: string;
  userRole?: string;
  onEditProject: () => void;
  onEditCycle: (cycleId: string) => void;
}

const DataMigrationStrategyView: React.FC<Props> = ({
  projectId,
  projectName,
  userId,
  userRole,
  onEditProject,
  onEditCycle,
}) => {
  const queryClient = useQueryClient();
  const canEditSections = userRole === 'admin';
  const quillRef = React.useRef<ReactQuill | null>(null);
  const toolbarId = React.useMemo(() => `strategy-editor-toolbar-${projectId}`, [projectId]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['projectDataMigrationStrategy', projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/projects/${projectId}/data-migration-strategy`);
      return (res.data?.data || {}) as StrategyPayload;
    },
    enabled: !!projectId,
  });

  const [sectionsDraft, setSectionsDraft] = React.useState<Record<string, string>>({});
  const [isSavingSections, setIsSavingSections] = React.useState(false);
  const [activeSectionKey, setActiveSectionKey] = React.useState(SECTION_CONFIG[0].key);
  const activeSection = SECTION_CONFIG.find((section) => section.key === activeSectionKey) || SECTION_CONFIG[0];
  const isHistoryTrackedSection = !SPECIAL_SECTION_KEYS.has(activeSection.key);
  const [isHistoryExpanded, setIsHistoryExpanded] = React.useState(false);
  const [restoringHistoryId, setRestoringHistoryId] = React.useState<string | null>(null);

  const { data: sectionHistory = [], isLoading: isLoadingSectionHistory } = useQuery({
    queryKey: ['projectStrategySectionHistory', projectId, activeSection.key],
    queryFn: async () => {
      const res = await apiClient.get(`/api/projects/${projectId}/data-migration-strategy/history/${activeSection.key}`);
      return (res.data?.data || []) as StrategySectionHistoryEntry[];
    },
    enabled: !!projectId && isHistoryTrackedSection,
  });

  React.useEffect(() => {
    if (data?.strategy?.sections) {
      setSectionsDraft(data.strategy.sections);
    }
  }, [data]);

  React.useEffect(() => {
    if (!SECTION_CONFIG.some((section) => section.key === activeSectionKey)) {
      setActiveSectionKey(SECTION_CONFIG[0].key);
    }
  }, [activeSectionKey]);

  React.useEffect(() => {
    setIsHistoryExpanded(false);
  }, [activeSection.key]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['projectDataMigrationStrategy', projectId] });
    await queryClient.invalidateQueries({ queryKey: ['projectStrategySectionHistory', projectId, activeSection.key] });
  };

  const insertImageAtCursor = React.useCallback((src: string) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const selection = editor.getSelection(true);
    const index = selection?.index ?? editor.getLength();
    editor.insertEmbed(index, 'image', src, 'user');
    editor.setSelection(index + 1, 0);
  }, []);

  const readImageFile = React.useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        insertImageAtCursor(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }, [insertImageAtCursor]);

  const extractImageSrcFromHtml = React.useCallback((html: string) => {
    if (!html) return null;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const img = doc.querySelector('img');
    return img?.getAttribute('src') || null;
  }, []);

  const handleInsertImage = React.useCallback(() => {
    if (!canEditSections) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        readImageFile(file);
      }
    };
    input.click();
  }, [canEditSections, readImageFile]);

  const handleInsertTable = React.useCallback(() => {
    if (!canEditSections) return;

    const rowsInput = window.prompt('Number of data rows?', '3');
    if (rowsInput === null) return;
    const columnsInput = window.prompt('Number of columns?', '3');
    if (columnsInput === null) return;

    const rows = Number.parseInt(rowsInput, 10);
    const columns = Number.parseInt(columnsInput, 10);
    if (!Number.isFinite(rows) || !Number.isFinite(columns)) {
      alert('Please enter valid numbers for rows and columns.');
      return;
    }

    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const selection = editor.getSelection(true);
    const index = selection?.index ?? editor.getLength();
    const tableMarkdown = `${buildMarkdownTable(rows, columns)}\n`;
    editor.insertText(index, tableMarkdown, 'user');
    editor.setSelection(index + tableMarkdown.length, 0, 'user');
  }, [canEditSections]);

  const handlePasteImage = React.useCallback((clipboardData: DataTransfer | null) => {
    if (!clipboardData || !canEditSections || SPECIAL_SECTION_KEYS.has(activeSection.key)) {
      return false;
    }

    const files = Array.from(clipboardData.files || []).filter((file) => file.type.startsWith('image/'));
    if (files.length > 0) {
      files.forEach((file) => readImageFile(file));
      return true;
    }

    const items = Array.from(clipboardData.items || []);
    const imageItems = items.filter((item) => item.type.startsWith('image/'));
    if (imageItems.length > 0) {
      imageItems.forEach((item) => {
        const file = item.getAsFile();
        if (file) {
          readImageFile(file);
        }
      });
      return true;
    }

    const html = clipboardData.getData('text/html') || '';
    const imageSrc = extractImageSrcFromHtml(html);
    if (imageSrc) {
      insertImageAtCursor(imageSrc);
      return true;
    }

    const uriList = clipboardData.getData('text/uri-list') || clipboardData.getData('text/plain') || '';
    if (looksLikeImageUrl(uriList)) {
      insertImageAtCursor(uriList.trim());
      return true;
    }

    return false;
  }, [activeSection.key, canEditSections, extractImageSrcFromHtml, insertImageAtCursor, readImageFile]);

  const quillModules = React.useMemo(() => {
    if (!canEditSections) {
      return { toolbar: false };
    }

    return {
      toolbar: {
        container: `#${toolbarId}`,
        handlers: {
          image: handleInsertImage,
          insertTable: handleInsertTable,
        },
      },
      keyboard: {
        bindings: {
          indentListOnTab: {
            key: 9,
            shiftKey: false,
            handler(range: any, context: any) {
              if (context.format.list) {
                this.quill.format('indent', '+1', 'user');
                return false;
              }
              return true;
            },
          },
          outdentListOnShiftTab: {
            key: 9,
            shiftKey: true,
            handler(range: any, context: any) {
              if (context.format.list) {
                this.quill.format('indent', '-1', 'user');
                return false;
              }
              return true;
            },
          },
        },
      },
    };
  }, [canEditSections, handleInsertImage, handleInsertTable, toolbarId]);

  React.useEffect(() => {
    if (!canEditSections || SPECIAL_SECTION_KEYS.has(activeSection.key)) {
      return;
    }

    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const handlePaste = (event: ClipboardEvent) => {
      if (handlePasteImage(event.clipboardData || null)) {
        event.preventDefault();
      }
    };

    editor.root.addEventListener('paste', handlePaste);
    return () => {
      editor.root.removeEventListener('paste', handlePaste);
    };
  }, [activeSection.key, canEditSections, handlePasteImage]);

  const handleSaveSections = async () => {
    try {
      setIsSavingSections(true);
      const response = await apiClient.put(`/api/projects/${projectId}/data-migration-strategy`, {
        sections: sectionsDraft,
      });
      const savedSections = response.data?.data?.sections;
      if (savedSections) {
        setSectionsDraft((prev) => ({ ...prev, ...savedSections }));
      }
      await refresh();
    } catch (error) {
      alert('Failed to save Data Migration Strategy sections.');
    } finally {
      setIsSavingSections(false);
    }
  };

  const handleRestoreHistoryEntry = async (entry: StrategySectionHistoryEntry) => {
    if (!canEditSections || !isHistoryTrackedSection) return;

    const confirmed = window.confirm('Restore this section to the selected revision?');
    if (!confirmed) return;

    const restoredContent = normalizeEditorValue(entry.next_content || '');
    const updatedSections = {
      ...sectionsDraft,
      [activeSection.key]: restoredContent,
    };

    try {
      setRestoringHistoryId(entry.id);
      setSectionsDraft(updatedSections);

      const response = await apiClient.put(`/api/projects/${projectId}/data-migration-strategy`, {
        sections: updatedSections,
      });

      const savedSections = response.data?.data?.sections;
      if (savedSections) {
        setSectionsDraft((prev) => ({ ...prev, ...savedSections }));
      }

      await refresh();
    } catch (error) {
      alert('Failed to restore this revision.');
    } finally {
      setRestoringHistoryId(null);
    }
  };

  const handleExport = async () => {
    try {
      const response = await apiClient.get(`/api/projects/${projectId}/data-migration-strategy/export`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `data-migration-strategy-${projectId}.md`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export strategy document.');
    }
  };

  if (isLoading) {
    return <Alert severity="info">Loading Data Migration Strategy...</Alert>;
  }

  if (isError || !data) {
    return <Alert severity="error">Unable to load Data Migration Strategy.</Alert>;
  }

  const cycleWorkflowById = new Map(data.cycleWorkflow.map((entry) => [entry.mockCycleId, entry.workflow]));
  const strategy = data.strategy;
  const activeAccent = SECTION_ACCENTS[activeSection.key] || SPECIAL_ACCENT;
  const activeSectionIndex = SECTION_CONFIG.findIndex((section) => section.key === activeSection.key);
  const editableSectionCount = SECTION_CONFIG.filter((section) => !SPECIAL_SECTION_KEYS.has(section.key)).length;
  const completedSectionCount = SECTION_CONFIG.filter((section) => {
    if (SPECIAL_SECTION_KEYS.has(section.key)) return false;
    const value = sectionsDraft[section.key] || '';
    return hasMeaningfulContent(value);
  }).length;
  const completionPct = editableSectionCount > 0
    ? Math.round((completedSectionCount / editableSectionCount) * 100)
    : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper sx={{ p: 1.25, ...NAV_SURFACE }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontWeight: 700, letterSpacing: '0.25px', color: SPECIAL_ACCENT }}>
          Section Navigator
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap', overflowX: 'auto', pb: 0.25 }}>
          {SECTION_CONFIG.map((section) => (
            <Chip
              key={section.key}
              label={`${section.label}${hasMeaningfulContent(sectionsDraft[section.key] || '') ? ' • Done' : ''}`}
              clickable
              variant={section.key === activeSection.key ? 'filled' : 'outlined'}
              onClick={() => setActiveSectionKey(section.key)}
              sx={{
                flexShrink: 0,
                fontWeight: section.key === activeSection.key ? 700 : 500,
                color: section.key === activeSection.key ? '#0D1933' : '#EAF2FF',
                backgroundColor: section.key === activeSection.key ? SECTION_ACCENTS[section.key] || SPECIAL_ACCENT : 'rgba(255,255,255,0.03)',
                borderColor: section.key === activeSection.key ? 'transparent' : 'rgba(255,255,255,0.14)',
              }}
            />
          ))}
        </Box>
      </Paper>

      <Box sx={{ display: 'grid', gap: 2 }}>
      <Paper
        sx={{
          p: 2,
          background: `linear-gradient(180deg, ${activeAccent}18 0%, rgba(255,255,255,0.03) 22%, rgba(255,255,255,0.02) 100%)`,
          border: `1px solid ${activeAccent}33`,
          borderRadius: 2.5,
          boxShadow: '0 10px 30px rgba(0,0,0,0.14)',
          overflow: 'visible',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
              <Chip
                label={activeSection.label}
                size="small"
                sx={{ backgroundColor: `${activeAccent}26`, color: activeAccent, fontWeight: 700 }}
              />
              <Typography variant="caption" sx={{ color: activeAccent, fontWeight: 700, letterSpacing: '0.25px' }}>
                Data Migration Strategy
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">Project: {projectName || data.project?.name || projectId}</Typography>
            <Typography variant="caption" color="text.secondary">Completed Sections: {completedSectionCount} / {editableSectionCount}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined" onClick={onEditProject} sx={{ borderColor: `${activeAccent}55`, color: activeAccent }}>Manage Roles</Button>
            <Button variant="outlined" onClick={handleExport} sx={{ borderColor: `${activeAccent}55`, color: activeAccent }}>Export Strategy</Button>
          </Box>
        </Box>

        <LinearProgress variant="determinate" value={completionPct} sx={{ mb: 1.5, borderRadius: 999, height: 7 }} />

        <Divider sx={{ mb: 2 }} />

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mb: 1, color: SPECIAL_SECTION_KEYS.has(activeSection.key) ? SPECIAL_ACCENT : undefined, fontWeight: SPECIAL_SECTION_KEYS.has(activeSection.key) ? 700 : 500 }}
        >
          Section {activeSectionIndex + 1} of {SECTION_CONFIG.length}
        </Typography>

        <Box
          sx={{
            mb: 2,
            px: 1.5,
            py: 1.25,
            borderLeft: `3px solid ${activeAccent}`,
            backgroundColor: 'rgba(255,255,255,0.045)',
            borderRadius: 1.5,
          }}
        >
          <Typography sx={{ color: activeAccent, fontWeight: 700, fontSize: '0.88rem', mb: 0.5 }}>
            What This Section Should Cover
          </Typography>
          <Box sx={{ display: 'grid', gap: 0.45 }}>
            {SECTION_EXPECTATIONS[activeSection.key].map((expectation) => (
              <Typography key={expectation} variant="body2" sx={{ color: 'rgba(234,242,255,0.88)', lineHeight: 1.6 }}>
                • {expectation}
              </Typography>
            ))}
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gap: 1.25 }}>
          <Box
            onPasteCapture={(event) => {
              if (handlePasteImage(event.clipboardData)) {
                event.preventDefault();
              }
            }}
            sx={{
              border: `1px solid ${activeAccent}3d`,
              borderRadius: 2,
              overflow: 'auto',
              maxHeight: { xs: '52vh', md: '62vh' },
              overscrollBehavior: 'contain',
              backgroundColor: 'rgba(255,255,255,0.05)',
              '& .ql-toolbar.ql-snow': {
                border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.14)',
                backgroundColor: 'rgba(255,255,255,0.04)',
                position: 'sticky',
                top: 0,
                zIndex: 3,
                backdropFilter: 'blur(6px)',
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
              },
              '& .strategy-editor-toolbar': {
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                rowGap: 6,
                columnGap: 4,
                padding: '6px 8px',
              },
              '& .strategy-editor-toolbar .ql-formats': {
                marginRight: 8,
              },
              '& .strategy-editor-toolbar button.ql-insertTable': {
                width: 'auto',
                minWidth: 54,
                padding: '0 8px',
                color: '#D7E6FF',
                fontSize: '12px',
                fontWeight: 700,
              },
              '& .ql-container.ql-snow': {
                border: 'none',
                fontFamily: 'inherit',
                minHeight: 240,
                borderBottomLeftRadius: 8,
                borderBottomRightRadius: 8,
              },
              '& .ql-editor': {
                minHeight: 240,
                color: '#EAF2FF',
                fontSize: '0.98rem',
                lineHeight: 1.65,
              },
              '& .ql-editor.ql-blank::before': {
                color: 'rgba(234,242,255,0.45)',
                fontStyle: 'normal',
              },
              '& .ql-editor img': {
                maxWidth: '100%',
                borderRadius: 8,
                margin: '8px 0',
                border: '1px solid rgba(255,255,255,0.14)',
              },
              '& .ql-editor table': {
                width: '100%',
                borderCollapse: 'collapse',
                margin: '10px 0',
              },
              '& .ql-editor table td, & .ql-editor table th': {
                border: '1px solid rgba(215,230,255,0.35)',
                padding: '8px',
                verticalAlign: 'top',
              },
              '& .ql-editor table th': {
                backgroundColor: 'rgba(127, 209, 174, 0.2)',
                fontWeight: 700,
              },
              '& .ql-editor .ql-indent-1': { paddingLeft: '3em' },
              '& .ql-editor .ql-indent-2': { paddingLeft: '6em' },
              '& .ql-editor .ql-indent-3': { paddingLeft: '9em' },
              '& .ql-snow .ql-stroke': { stroke: '#D7E6FF' },
              '& .ql-snow .ql-fill': { fill: '#D7E6FF' },
              '& .ql-snow .ql-picker': { color: '#D7E6FF' },
            }}
          >
            {canEditSections && (
              <div id={toolbarId} className="ql-toolbar ql-snow strategy-editor-toolbar">
                <span className="ql-formats">
                  <select className="ql-header" defaultValue="">
                    <option value="">Normal</option>
                    <option value="1">Heading 1</option>
                    <option value="2">Heading 2</option>
                    <option value="3">Heading 3</option>
                  </select>
                </span>
                <span className="ql-formats">
                  <button className="ql-bold" type="button" aria-label="Bold" />
                  <button className="ql-italic" type="button" aria-label="Italic" />
                  <button className="ql-underline" type="button" aria-label="Underline" />
                  <button className="ql-blockquote" type="button" aria-label="Block quote" />
                </span>
                <span className="ql-formats">
                  <button className="ql-list" value="ordered" type="button" aria-label="Ordered list" />
                  <button className="ql-list" value="bullet" type="button" aria-label="Bullet list" />
                  <button className="ql-indent" value="-1" type="button" aria-label="Outdent" />
                  <button className="ql-indent" value="+1" type="button" aria-label="Indent" />
                </span>
                <span className="ql-formats">
                  <button className="ql-insertTable" type="button" aria-label="Insert table">Table</button>
                </span>
                <span className="ql-formats">
                  <button className="ql-link" type="button" aria-label="Insert link" />
                  <button className="ql-image" type="button" aria-label="Insert image" />
                  <button className="ql-clean" type="button" aria-label="Clear formatting" />
                </span>
              </div>
            )}
            <ReactQuill
              key={activeSection.key}
              ref={quillRef}
              theme="snow"
              value={sectionsDraft[activeSection.key] || ''}
              onChange={(value) => setSectionsDraft((prev) => ({ ...prev, [activeSection.key]: normalizeEditorValue(value) }))}
              modules={quillModules}
              formats={quillFormats}
              readOnly={!canEditSections}
              placeholder={(SECTION_EXPECTATIONS[activeSection.key] || []).join(' ')}
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5, gap: 1 }}>
          <Button
            variant="outlined"
            disabled={activeSectionIndex <= 0}
            onClick={() => setActiveSectionKey(SECTION_CONFIG[Math.max(activeSectionIndex - 1, 0)].key)}
          >
            Previous Section
          </Button>
          <Button
            variant="outlined"
            disabled={activeSectionIndex >= SECTION_CONFIG.length - 1}
            onClick={() => setActiveSectionKey(SECTION_CONFIG[Math.min(activeSectionIndex + 1, SECTION_CONFIG.length - 1)].key)}
          >
            Next Section
          </Button>
        </Box>

        {canEditSections && !SPECIAL_SECTION_KEYS.has(activeSection.key) ? (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
            <Button variant="contained" onClick={handleSaveSections} disabled={isSavingSections} sx={{ backgroundColor: activeAccent, color: '#0D1933', '&:hover': { backgroundColor: activeAccent } }}>
              {isSavingSections ? 'Saving...' : 'Save Data Migration Strategy'}
            </Button>
          </Box>
        ) : !SPECIAL_SECTION_KEYS.has(activeSection.key) ? (
          <Alert severity="info" sx={{ mt: 1.5 }}>Only admins can edit strategy sections.</Alert>
        ) : null}

        <Box sx={{ mt: 2, ...SPECIAL_SURFACE, p: 1.5, backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <Button
            variant="text"
            onClick={() => setIsHistoryExpanded((prev) => !prev)}
            endIcon={<ExpandMoreIcon sx={{ transform: isHistoryExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />}
            sx={{
              p: 0,
              minWidth: 0,
              textTransform: 'none',
              color: activeAccent,
              fontWeight: 700,
              justifyContent: 'space-between',
              width: '100%',
              '&:hover': { backgroundColor: 'transparent' },
            }}
          >
            Section Change History
          </Button>
          {isHistoryExpanded && (
            <Box sx={{ mt: 1.25 }}>
              {!isHistoryTrackedSection ? (
                <Typography variant="body2" color="text.secondary">
                  This section is driven by workflow or approval state rather than saved narrative content. Its changes are tracked in the related source records.
                </Typography>
              ) : isLoadingSectionHistory ? (
                <Typography variant="body2" color="text.secondary">Loading section history...</Typography>
              ) : sectionHistory.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No saved changes yet for this section.</Typography>
              ) : (
                <Box sx={{ display: 'grid', gap: 1 }}>
                  {sectionHistory.map((entry, index) => (
                    <Box
                      key={entry.id}
                      sx={{
                        p: 1.25,
                        borderRadius: 1.5,
                        backgroundColor: 'rgba(255,255,255,0.035)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start', mb: 0.75, flexWrap: 'wrap' }}>
                        <Typography variant="caption" sx={{ display: 'block', color: activeAccent, fontWeight: 700 }}>
                          Revision {sectionHistory.length - index} • {entry.changed_by_email || 'Unknown user'} • {new Date(entry.created_at).toLocaleString()}
                        </Typography>
                        {canEditSections && (
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={restoringHistoryId === entry.id || isSavingSections}
                            onClick={() => handleRestoreHistoryEntry(entry)}
                            sx={{ borderColor: `${activeAccent}55`, color: activeAccent, textTransform: 'none' }}
                          >
                            {restoringHistoryId === entry.id ? 'Restoring...' : 'Restore This Version'}
                          </Button>
                        )}
                      </Box>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Previous</Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(234,242,255,0.88)' }}>{summarizeHtml(entry.previous_content)}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Updated</Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(234,242,255,0.88)' }}>{summarizeHtml(entry.next_content)}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Paper>
      </Box>
    </Box>
  );
};

export default DataMigrationStrategyView;
