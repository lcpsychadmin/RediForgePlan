export type UnifiedRoleKey =
  | 'process_owner'
  | 'data_steward'
  | 'data_analyst'
  | 'functional_analyst'
  | 'technical_sme'
  | 'approver'
  | 'contributor';

export interface UnifiedRoleDefinition {
  key: UnifiedRoleKey;
  name: string;
  definition: string;
}

export const UNIFIED_ROLE_MODEL: UnifiedRoleDefinition[] = [
  {
    key: 'process_owner',
    name: 'Process Owner',
    definition:
      'Accountable business owner of the process area. Provides final approval on decisions, mapping changes, and governance standards.',
  },
  {
    key: 'data_steward',
    name: 'Data Steward',
    definition:
      'Responsible for maintaining data definitions, quality rules, and governance policies for the process area. Ensures consistency across projects and long-term operations.',
  },
  {
    key: 'data_analyst',
    name: 'Data Analyst',
    definition:
      'Executes profiling, mapping, transformation logic, validation, and cycle readiness tasks. Supports both project execution and ongoing data quality activities.',
  },
  {
    key: 'functional_analyst',
    name: 'Functional Analyst',
    definition:
      'Owns functional system behavior for the process area. Defines configuration, field behavior, and functional constraints that impact mapping and data quality.',
  },
  {
    key: 'technical_sme',
    name: 'Technical SME',
    definition:
      'Owns technical system behavior, integrations, APIs, and load constraints. Ensures data flows, technical rules, and system interactions are correct.',
  },
  {
    key: 'approver',
    name: 'Approver',
    definition: 'Provides formal sign-off for workflow steps within this process area.',
  },
  {
    key: 'contributor',
    name: 'Contributor',
    definition: 'Performs workflow tasks but does not provide approval.',
  },
];

export const UNIFIED_ROLE_KEYS = UNIFIED_ROLE_MODEL.map((role) => role.key);
