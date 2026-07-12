export type DesignBuildTaskType = 'Design' | 'Build';

export interface DesignBuildEstimationTaskOption {
  id: string;
  label: string;
  taskType: DesignBuildTaskType;
}

export interface DesignBuildEstimationRow {
  id: string;
  buildType: string;
  factorType: string;
  complexity: string;
  taskId: string;
  taskName: string;
  hours: number;
}

type ScenarioSeed = {
  buildType: string;
  factorType: string;
  complexity: string;
  buildDocumentationHours: number;
  buildHours: number;
  buildTestingHours: number;
  designFdHours: number;
  designFmdHours: number;
  designTdHours: number;
};

const TASK_HOUR_FIELDS: Array<{ taskId: string; key: keyof ScenarioSeed }> = [
  { taskId: 'build-documentation', key: 'buildDocumentationHours' },
  { taskId: 'build', key: 'buildHours' },
  { taskId: 'build-testing', key: 'buildTestingHours' },
  { taskId: 'design-fd', key: 'designFdHours' },
  { taskId: 'design-fmd', key: 'designFmdHours' },
  { taskId: 'design-td', key: 'designTdHours' },
];

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const DEFAULT_DESIGN_BUILD_ESTIMATION_TASKS: DesignBuildEstimationTaskOption[] = [
  { id: 'build-documentation', label: 'Build Documentation', taskType: 'Build' },
  { id: 'build', label: 'Build', taskType: 'Build' },
  { id: 'build-testing', label: 'Build Testing', taskType: 'Build' },
  { id: 'design-fd', label: 'Design FD', taskType: 'Design' },
  { id: 'design-fmd', label: 'Design FMD', taskType: 'Design' },
  { id: 'design-td', label: 'Design TD', taskType: 'Design' },
];

const TASK_LABEL_BY_ID = DEFAULT_DESIGN_BUILD_ESTIMATION_TASKS.reduce<Record<string, string>>((acc, task) => {
  acc[task.id] = task.label;
  return acc;
}, {});

export const DESIGN_BUILD_TASK_ID_BY_NAME = DEFAULT_DESIGN_BUILD_ESTIMATION_TASKS.reduce<Record<string, string>>((acc, task) => {
  acc[task.label.toLowerCase()] = task.id;
  return acc;
}, {});

const SCENARIO_SEEDS: ScenarioSeed[] = [
  { buildType: 'New', factorType: 'Conversion - Extract, Transform & Load', complexity: '1-Complex', buildDocumentationHours: 40, buildHours: 128, buildTestingHours: 56, designFdHours: 31, designFmdHours: 26, designTdHours: 16 },
  { buildType: 'New', factorType: 'Conversion - Extract, Transform & Load', complexity: '2-Medium', buildDocumentationHours: 24, buildHours: 80, buildTestingHours: 40, designFdHours: 31, designFmdHours: 26, designTdHours: 16 },
  { buildType: 'New', factorType: 'Conversion - Extract, Transform & Load', complexity: '3-Simple', buildDocumentationHours: 16, buildHours: 48, buildTestingHours: 24, designFdHours: 31, designFmdHours: 26, designTdHours: 16 },
  { buildType: 'Modify', factorType: 'Conversion - Extract, Transform & Load', complexity: '1-Complex', buildDocumentationHours: 24, buildHours: 72, buildTestingHours: 56, designFdHours: 39, designFmdHours: 31, designTdHours: 16 },
  { buildType: 'Modify', factorType: 'Conversion - Extract, Transform & Load', complexity: '2-Medium', buildDocumentationHours: 16, buildHours: 56, buildTestingHours: 40, designFdHours: 22, designFmdHours: 21, designTdHours: 8 },
  { buildType: 'Modify', factorType: 'Conversion - Extract, Transform & Load', complexity: '3-Simple', buildDocumentationHours: 8, buildHours: 32, buildTestingHours: 24, designFdHours: 14, designFmdHours: 14, designTdHours: 5 },

  { buildType: 'New', factorType: 'Conversion - Construct & Load', complexity: '1-Complex', buildDocumentationHours: 24, buildHours: 96, buildTestingHours: 40, designFdHours: 31, designFmdHours: 26, designTdHours: 16 },
  { buildType: 'New', factorType: 'Conversion - Construct & Load', complexity: '2-Medium', buildDocumentationHours: 16, buildHours: 48, buildTestingHours: 24, designFdHours: 31, designFmdHours: 26, designTdHours: 16 },
  { buildType: 'New', factorType: 'Conversion - Construct & Load', complexity: '3-Simple', buildDocumentationHours: 8, buildHours: 32, buildTestingHours: 16, designFdHours: 31, designFmdHours: 26, designTdHours: 16 },
  { buildType: 'Modify', factorType: 'Conversion - Construct & Load', complexity: '1-Complex', buildDocumentationHours: 16, buildHours: 72, buildTestingHours: 32, designFdHours: 39, designFmdHours: 31, designTdHours: 16 },
  { buildType: 'Modify', factorType: 'Conversion - Construct & Load', complexity: '2-Medium', buildDocumentationHours: 8, buildHours: 40, buildTestingHours: 16, designFdHours: 22, designFmdHours: 21, designTdHours: 8 },
  { buildType: 'Modify', factorType: 'Conversion - Construct & Load', complexity: '3-Simple', buildDocumentationHours: 8, buildHours: 24, buildTestingHours: 8, designFdHours: 14, designFmdHours: 14, designTdHours: 5 },

  { buildType: 'New', factorType: 'Conversion - Construct, Transform & Manual Load', complexity: '1-Complex', buildDocumentationHours: 4, buildHours: 8, buildTestingHours: 8, designFdHours: 31, designFmdHours: 26, designTdHours: 16 },
  { buildType: 'New', factorType: 'Conversion - Construct, Transform & Manual Load', complexity: '2-Medium', buildDocumentationHours: 4, buildHours: 8, buildTestingHours: 8, designFdHours: 31, designFmdHours: 26, designTdHours: 16 },
  { buildType: 'New', factorType: 'Conversion - Construct, Transform & Manual Load', complexity: '3-Simple', buildDocumentationHours: 4, buildHours: 8, buildTestingHours: 8, designFdHours: 31, designFmdHours: 26, designTdHours: 16 },
  { buildType: 'Modify', factorType: 'Conversion - Construct, Transform & Manual Load', complexity: '1-Complex', buildDocumentationHours: 4, buildHours: 8, buildTestingHours: 8, designFdHours: 39, designFmdHours: 31, designTdHours: 16 },
  { buildType: 'Modify', factorType: 'Conversion - Construct, Transform & Manual Load', complexity: '2-Medium', buildDocumentationHours: 4, buildHours: 8, buildTestingHours: 8, designFdHours: 22, designFmdHours: 21, designTdHours: 8 },
  { buildType: 'Modify', factorType: 'Conversion - Construct, Transform & Manual Load', complexity: '3-Simple', buildDocumentationHours: 4, buildHours: 8, buildTestingHours: 8, designFdHours: 14, designFmdHours: 14, designTdHours: 5 },

  { buildType: 'New', factorType: 'Conversion - Construct, Transform & Load', complexity: '1-Complex', buildDocumentationHours: 24, buildHours: 96, buildTestingHours: 40, designFdHours: 31, designFmdHours: 26, designTdHours: 16 },
  { buildType: 'New', factorType: 'Conversion - Construct, Transform & Load', complexity: '2-Medium', buildDocumentationHours: 16, buildHours: 48, buildTestingHours: 24, designFdHours: 31, designFmdHours: 26, designTdHours: 16 },
  { buildType: 'New', factorType: 'Conversion - Construct, Transform & Load', complexity: '3-Simple', buildDocumentationHours: 8, buildHours: 32, buildTestingHours: 16, designFdHours: 31, designFmdHours: 26, designTdHours: 16 },
  { buildType: 'Modify', factorType: 'Conversion - Construct, Transform & Load', complexity: '1-Complex', buildDocumentationHours: 16, buildHours: 72, buildTestingHours: 32, designFdHours: 39, designFmdHours: 31, designTdHours: 16 },
  { buildType: 'Modify', factorType: 'Conversion - Construct, Transform & Load', complexity: '2-Medium', buildDocumentationHours: 8, buildHours: 40, buildTestingHours: 16, designFdHours: 22, designFmdHours: 21, designTdHours: 8 },
  { buildType: 'Modify', factorType: 'Conversion - Construct, Transform & Load', complexity: '3-Simple', buildDocumentationHours: 8, buildHours: 24, buildTestingHours: 8, designFdHours: 14, designFmdHours: 14, designTdHours: 5 },

  { buildType: 'New', factorType: 'Conversion - Extract, Transform & Manual Load', complexity: '1-Complex', buildDocumentationHours: 40, buildHours: 128, buildTestingHours: 56, designFdHours: 31, designFmdHours: 26, designTdHours: 16 },
  { buildType: 'New', factorType: 'Conversion - Extract, Transform & Manual Load', complexity: '2-Medium', buildDocumentationHours: 24, buildHours: 80, buildTestingHours: 40, designFdHours: 31, designFmdHours: 26, designTdHours: 16 },
  { buildType: 'New', factorType: 'Conversion - Extract, Transform & Manual Load', complexity: '3-Simple', buildDocumentationHours: 16, buildHours: 48, buildTestingHours: 24, designFdHours: 31, designFmdHours: 26, designTdHours: 16 },
  { buildType: 'Modify', factorType: 'Conversion - Extract, Transform & Manual Load', complexity: '1-Complex', buildDocumentationHours: 24, buildHours: 72, buildTestingHours: 56, designFdHours: 39, designFmdHours: 31, designTdHours: 16 },
  { buildType: 'Modify', factorType: 'Conversion - Extract, Transform & Manual Load', complexity: '2-Medium', buildDocumentationHours: 16, buildHours: 56, buildTestingHours: 40, designFdHours: 22, designFmdHours: 21, designTdHours: 8 },
  { buildType: 'Modify', factorType: 'Conversion - Extract, Transform & Manual Load', complexity: '3-Simple', buildDocumentationHours: 8, buildHours: 32, buildTestingHours: 24, designFdHours: 14, designFmdHours: 14, designTdHours: 5 },
];

export const DEFAULT_DESIGN_BUILD_ESTIMATION_ROWS: DesignBuildEstimationRow[] = SCENARIO_SEEDS.flatMap((seed) => {
  return TASK_HOUR_FIELDS.map((task) => ({
    id: `${slug(seed.buildType)}__${slug(seed.factorType)}__${slug(seed.complexity)}__${slug(task.taskId)}`,
    buildType: seed.buildType,
    factorType: seed.factorType,
    complexity: seed.complexity,
    taskId: task.taskId,
    taskName: TASK_LABEL_BY_ID[task.taskId] || task.taskId,
    hours: Number(seed[task.key]) || 0,
  }));
});
