export interface DesignBuildEstimationRow {
  id: string;
  buildType: string;
  factorType: string;
  complexity: string;
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

const TASK_HOUR_FIELDS: Array<{ taskName: string; key: keyof ScenarioSeed }> = [
  { taskName: 'Build Documentation', key: 'buildDocumentationHours' },
  { taskName: 'Build', key: 'buildHours' },
  { taskName: 'Build Testing', key: 'buildTestingHours' },
  { taskName: 'Design FD', key: 'designFdHours' },
  { taskName: 'Design FMD', key: 'designFmdHours' },
  { taskName: 'Design TD', key: 'designTdHours' },
];

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

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
    id: `${slug(seed.buildType)}__${slug(seed.factorType)}__${slug(seed.complexity)}__${slug(task.taskName)}`,
    buildType: seed.buildType,
    factorType: seed.factorType,
    complexity: seed.complexity,
    taskName: task.taskName,
    hours: Number(seed[task.key]) || 0,
  }));
});
