export type MockCycleCriterionType = 'entry' | 'exit';

export interface MockCycleCriterionItem {
  key: string;
  label: string;
  completed: boolean;
  enforced: boolean;
}

export const ENTRY_CRITERIA_DEFINITIONS = [
  'Design Complete',
  'Field Mapping Documents Approved',
  'Build Complete',
  'Integration Readiness',
  'Environment Refreshed',
  'Security & Access Assigned',
  'Cycle Plan Approved',
  'No Blocking Defects',
] as const;

export const EXIT_CRITERIA_DEFINITIONS = [
  'Load Execution Complete',
  'Load Error Analysis Complete',
  'Validation Complete',
  'Defects Logged & Triaged',
  'Records of Relevant Scope Captured',
  'Invalid Records Captured',
  'Records Attempted Captured',
  'Load Errors Captured',
  'Records Loaded Captured',
  'Load Success Rate Calculated',
  'Load Coverage Rate Calculated',
  'Target Load Percentage Achieved',
  'Cycle Metrics Captured',
  'Lessons Learned Documented',
  'Next Cycle Readiness Confirmed',
] as const;

const toKey = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const buildDefaultCriteria = (
  type: MockCycleCriterionType,
  enforced = true,
): MockCycleCriterionItem[] => {
  const source = type === 'entry' ? ENTRY_CRITERIA_DEFINITIONS : EXIT_CRITERIA_DEFINITIONS;
  return source.map((label) => ({
    key: toKey(label),
    label,
    completed: false,
    enforced,
  }));
};

export const normalizeCriteria = (
  type: MockCycleCriterionType,
  input: unknown,
): MockCycleCriterionItem[] => {
  const defaults = buildDefaultCriteria(type, true);
  const defaultByKey = new Map(defaults.map((item) => [item.key, item]));

  const incoming = Array.isArray(input) ? input : [];
  const normalizedByKey = new Map<string, MockCycleCriterionItem>();

  for (const raw of incoming) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const keyRaw = String(item.key || '').trim();
    const labelRaw = String(item.label || '').trim();
    const key = keyRaw || (labelRaw ? toKey(labelRaw) : '');
    if (!key) continue;

    normalizedByKey.set(key, {
      key,
      label: labelRaw || defaultByKey.get(key)?.label || key,
      completed: Boolean(item.completed),
      enforced: item.enforced === undefined ? true : Boolean(item.enforced),
    });
  }

  for (const def of defaults) {
    if (!normalizedByKey.has(def.key)) {
      normalizedByKey.set(def.key, def);
    }
  }

  return Array.from(normalizedByKey.values());
};
