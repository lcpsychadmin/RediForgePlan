import db from '../db.js';
import projectService from './projectService.js';
import programService from './programService.js';
import approvalWorkflowEngine from './approvalWorkflowEngine.js';

type StrategyRole = 'lead' | 'project_manager';

const DEFAULT_STRATEGY_SECTIONS: Record<string, string> = {
  purpose: '',
  guidingPrinciples: '',
  dataReadiness: '',
  dataConversion: '',
  conversionScope: '',
  conversionMethods: '',
  conversionDocuments: '',
  mockConversionCycles: '',
  goLiveSimulationCutover: '',
  dependencies: '',
  assumptions: '',
};

const STRATEGY_SECTION_KEYS = Object.keys(DEFAULT_STRATEGY_SECTIONS);

const normalizeSectionContent = (value: unknown) => {
  const normalized = String(value || '').trim();
  if (
    normalized === '<p><br></p>' ||
    normalized === '<div><br></div>' ||
    normalized === '<p></p>'
  ) {
    return '';
  }
  return normalized;
};

class DataMigrationStrategyService {
  private tablesReady: boolean | null = null;

  private async ensureTables() {
    if (this.tablesReady) return;

    await db.query(
      `CREATE TABLE IF NOT EXISTS project_data_migration_strategies (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
         sections JSONB NOT NULL DEFAULT '{}'::jsonb,
         lead_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
         lead_approved_at TIMESTAMP,
         project_manager_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
         project_manager_approved_at TIMESTAMP,
         created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
         updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
       )`
    );

    await db.query(
      `CREATE TABLE IF NOT EXISTS project_strategy_documents (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
         mock_cycle_id UUID REFERENCES mock_cycles(id) ON DELETE SET NULL,
         document_type VARCHAR(120) NOT NULL,
         file_name VARCHAR(255) NOT NULL,
         mime_type VARCHAR(120) NOT NULL,
         file_size INTEGER NOT NULL DEFAULT 0,
         file_content BYTEA NOT NULL,
         uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
         created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
       )`
    );

    await db.query(
      `CREATE TABLE IF NOT EXISTS project_strategy_section_history (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
         section_key VARCHAR(120) NOT NULL,
         previous_content TEXT NOT NULL DEFAULT '',
         next_content TEXT NOT NULL DEFAULT '',
         changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
         created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
       )`
    );

    await db.query('CREATE INDEX IF NOT EXISTS idx_pdms_project_id ON project_data_migration_strategies(project_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_psd_project_id ON project_strategy_documents(project_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_psd_mock_cycle_id ON project_strategy_documents(mock_cycle_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_pssh_project_section ON project_strategy_section_history(project_id, section_key, created_at DESC)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_pssh_changed_by ON project_strategy_section_history(changed_by)');

    this.tablesReady = true;
  }

  isKnownSectionKey(sectionKey: string) {
    return STRATEGY_SECTION_KEYS.includes(sectionKey);
  }

  async getStrategy(projectId: string) {
    await this.ensureTables();

    const strategyResult = await db.query(
      `SELECT project_id,
              sections,
              lead_approved_by,
              lead_approved_at,
              project_manager_approved_by,
              project_manager_approved_at,
              created_at,
              updated_at
       FROM project_data_migration_strategies
       WHERE project_id = $1`,
      [projectId]
    );

    const row = strategyResult.rows[0] || null;
    const sections = { ...DEFAULT_STRATEGY_SECTIONS, ...(row?.sections || {}) };
    const roles = await projectService.getProjectWorkflowRoles(projectId);
    const roleIds = [roles.leadUserId, roles.projectManagerUserId].filter(Boolean) as string[];
    const roleUsersById = new Map<string, string>();
    if (roleIds.length > 0) {
      const usersResult = await db.query(
        `SELECT id, email
         FROM users
         WHERE id = ANY($1::uuid[])`,
        [roleIds]
      );
      usersResult.rows.forEach((user) => roleUsersById.set(user.id, user.email));
    }

    return {
      projectId,
      sections,
      roles,
      roleUsers: {
        leadEmail: roles.leadUserId ? roleUsersById.get(roles.leadUserId) || null : null,
        projectManagerEmail: roles.projectManagerUserId ? roleUsersById.get(roles.projectManagerUserId) || null : null,
      },
      approvals: {
        leadApprovedBy: row?.lead_approved_by || null,
        leadApprovedAt: row?.lead_approved_at || null,
        projectManagerApprovedBy: row?.project_manager_approved_by || null,
        projectManagerApprovedAt: row?.project_manager_approved_at || null,
        leadApproved: Boolean(row?.lead_approved_by && row?.lead_approved_at),
        projectManagerApproved: Boolean(row?.project_manager_approved_by && row?.project_manager_approved_at),
      },
      createdAt: row?.created_at || null,
      updatedAt: row?.updated_at || null,
    };
  }

  async upsertSections(projectId: string, sections: Record<string, string>, userId: string) {
    await this.ensureTables();

    const existingResult = await db.query(
      `SELECT sections
       FROM project_data_migration_strategies
       WHERE project_id = $1`,
      [projectId]
    );
    const existingSections = { ...DEFAULT_STRATEGY_SECTIONS, ...(existingResult.rows[0]?.sections || {}) };

    const mergedSections: Record<string, string> = { ...DEFAULT_STRATEGY_SECTIONS };
    STRATEGY_SECTION_KEYS.forEach((key) => {
      mergedSections[key] = normalizeSectionContent(sections?.[key]);
    });

    await db.query(
      `INSERT INTO project_data_migration_strategies (project_id, sections)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (project_id)
       DO UPDATE SET sections = EXCLUDED.sections,
                     updated_at = CURRENT_TIMESTAMP`,
      [projectId, JSON.stringify(mergedSections)]
    );

    const changedSections = STRATEGY_SECTION_KEYS.filter((key) => (
      normalizeSectionContent(existingSections[key]) !== normalizeSectionContent(mergedSections[key])
    ));

    if (changedSections.length > 0) {
      await Promise.all(
        changedSections.map((sectionKey) => (
          db.query(
            `INSERT INTO project_strategy_section_history (
               project_id,
               section_key,
               previous_content,
               next_content,
               changed_by
             )
             VALUES ($1, $2, $3, $4, $5)`,
            [
              projectId,
              sectionKey,
              normalizeSectionContent(existingSections[sectionKey]),
              normalizeSectionContent(mergedSections[sectionKey]),
              userId,
            ]
          )
        ))
      );
    }

    return this.getStrategy(projectId);
  }

  async listSectionHistory(projectId: string, sectionKey: string, limit = 20) {
    await this.ensureTables();

    if (!this.isKnownSectionKey(sectionKey)) {
      return [];
    }

    const result = await db.query(
      `SELECT h.id,
              h.project_id,
              h.section_key,
              h.previous_content,
              h.next_content,
              h.changed_by,
              h.created_at,
              u.email AS changed_by_email
       FROM project_strategy_section_history h
       LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.project_id = $1
         AND h.section_key = $2
       ORDER BY h.created_at DESC
       LIMIT $3`,
      [projectId, sectionKey, limit]
    );

    return result.rows;
  }

  async recordApproval(params: { projectId: string; role: StrategyRole; userId: string; approved: boolean }) {
    await this.ensureTables();

    const strategy = await this.getStrategy(params.projectId);
    const roles = strategy.roles;

    if (params.role === 'lead') {
      if (!roles.leadUserId) throw new Error('Lead is not assigned for this project.');
      if (roles.leadUserId !== params.userId) throw new Error('Only the assigned Lead can approve strategy.');

      if (params.approved) {
        await db.query(
          `INSERT INTO project_data_migration_strategies (
             project_id,
             sections,
             lead_approved_by,
             lead_approved_at,
             project_manager_approved_by,
             project_manager_approved_at
           )
           VALUES ($1, $2::jsonb, $3, CURRENT_TIMESTAMP, NULL, NULL)
           ON CONFLICT (project_id)
           DO UPDATE SET lead_approved_by = EXCLUDED.lead_approved_by,
                         lead_approved_at = EXCLUDED.lead_approved_at,
                         project_manager_approved_by = NULL,
                         project_manager_approved_at = NULL,
                         updated_at = CURRENT_TIMESTAMP`,
          [params.projectId, JSON.stringify(strategy.sections), params.userId]
        );
      } else {
        await db.query(
          `UPDATE project_data_migration_strategies
           SET lead_approved_by = NULL,
               lead_approved_at = NULL,
               project_manager_approved_by = NULL,
               project_manager_approved_at = NULL,
               updated_at = CURRENT_TIMESTAMP
           WHERE project_id = $1`,
          [params.projectId]
        );
      }
    }

    if (params.role === 'project_manager') {
      if (!roles.projectManagerUserId) throw new Error('Project Manager is not assigned for this project.');
      if (roles.projectManagerUserId !== params.userId) throw new Error('Only the assigned Project Manager can approve strategy.');
      if (params.approved && !strategy.approvals.leadApproved) throw new Error('Lead approval is required before Project Manager sign-off.');

      if (params.approved) {
        await db.query(
          `INSERT INTO project_data_migration_strategies (
             project_id,
             sections,
             project_manager_approved_by,
             project_manager_approved_at
           )
           VALUES ($1, $2::jsonb, $3, CURRENT_TIMESTAMP)
           ON CONFLICT (project_id)
           DO UPDATE SET project_manager_approved_by = EXCLUDED.project_manager_approved_by,
                         project_manager_approved_at = EXCLUDED.project_manager_approved_at,
                         updated_at = CURRENT_TIMESTAMP`,
          [params.projectId, JSON.stringify(strategy.sections), params.userId]
        );
      } else {
        await db.query(
          `UPDATE project_data_migration_strategies
           SET project_manager_approved_by = NULL,
               project_manager_approved_at = NULL,
               updated_at = CURRENT_TIMESTAMP
           WHERE project_id = $1`,
          [params.projectId]
        );
      }
    }

    return this.getStrategy(params.projectId);
  }

  async uploadDocument(params: {
    projectId: string;
    mockCycleId?: string | null;
    documentType: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    fileContent: Buffer;
    uploadedBy: string;
  }) {
    await this.ensureTables();

    const result = await db.query(
      `INSERT INTO project_strategy_documents (
         project_id,
         mock_cycle_id,
         document_type,
         file_name,
         mime_type,
         file_size,
         file_content,
         uploaded_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id,
                 project_id,
                 mock_cycle_id,
                 document_type,
                 file_name,
                 mime_type,
                 file_size,
                 uploaded_by,
                 created_at`,
      [
        params.projectId,
        params.mockCycleId || null,
        params.documentType,
        params.fileName,
        params.mimeType,
        params.fileSize,
        params.fileContent,
        params.uploadedBy,
      ]
    );

    return result.rows[0];
  }

  async listDocuments(projectId: string) {
    await this.ensureTables();

    const result = await db.query(
      `SELECT d.id,
              d.project_id,
              d.mock_cycle_id,
              d.document_type,
              d.file_name,
              d.mime_type,
              d.file_size,
              d.uploaded_by,
              d.created_at,
              u.email AS uploaded_by_email,
              mc.name AS mock_cycle_name
       FROM project_strategy_documents d
       LEFT JOIN users u ON u.id = d.uploaded_by
       LEFT JOIN mock_cycles mc ON mc.id = d.mock_cycle_id
       WHERE d.project_id = $1
       ORDER BY d.created_at DESC`,
      [projectId]
    );

    return result.rows;
  }

  async getDocument(projectId: string, documentId: string) {
    await this.ensureTables();

    const result = await db.query(
      `SELECT id,
              project_id,
              mock_cycle_id,
              document_type,
              file_name,
              mime_type,
              file_size,
              file_content,
              uploaded_by,
              created_at
       FROM project_strategy_documents
       WHERE project_id = $1 AND id = $2`,
      [projectId, documentId]
    );

    return result.rows[0] || null;
  }

  async deleteDocument(projectId: string, documentId: string) {
    await this.ensureTables();
    await db.query('DELETE FROM project_strategy_documents WHERE project_id = $1 AND id = $2', [projectId, documentId]);
  }

  async exportMarkdown(projectId: string) {
    await this.ensureTables();

    const project = await projectService.getProjectById(projectId);
    if (!project) return null;

    const strategy = await this.getStrategy(projectId);
    const mockCycles = await programService.getMockCyclesByProject(projectId);
    const documents = await this.listDocuments(projectId);

    const cycleBlocks = await Promise.all(
      mockCycles.map(async (cycle: any) => {
        const workflow = await approvalWorkflowEngine.evaluateMockCycleProgression(cycle.id);
        const entry = (workflow?.criteria?.entry || []).map((c: any) => `- ${c.label}: ${c.completed ? 'Complete' : 'Incomplete'}`).join('\n') || '- None';
        const exit = (workflow?.criteria?.exit || []).map((c: any) => `- ${c.label}: ${c.completed ? 'Complete' : 'Incomplete'}`).join('\n') || '- None';

        return [
          `## Mock Cycle: ${cycle.name}`,
          '',
          '### Entry Criteria',
          entry,
          '',
          '### Exit Criteria',
          exit,
          '',
          '### Load Metrics',
          `- Total Records Scope: ${workflow?.metrics?.totalRecordsScope ?? 0}`,
          `- Invalid Records: ${workflow?.metrics?.invalidRecords ?? 0}`,
          `- Records Attempted: ${workflow?.metrics?.recordsAttempted ?? 0}`,
          `- Load Errors: ${workflow?.metrics?.loadErrors ?? 0}`,
          `- Records Loaded: ${workflow?.metrics?.recordsLoaded ?? 0}`,
          `- Effective Success Rate: ${workflow?.metrics?.effectiveSuccessRate ?? 0}%`,
          `- Effective Coverage Rate: ${workflow?.metrics?.effectiveCoverageRate ?? 0}%`,
          '',
          '### Target Load Percentages',
          `- Success Target: ${workflow?.targets?.successRate ?? 95}%`,
          `- Coverage Target: ${workflow?.targets?.coverageRate ?? 95}%`,
          '',
          '### Approval Status',
          `- Lead Approved: ${workflow?.approvals?.leadApproved ? 'Yes' : 'No'}`,
          `- Project Manager Approved: ${workflow?.approvals?.projectManagerApproved ? 'Yes' : 'No'}`,
          '',
        ].join('\n');
      })
    );

    const strategySections = [
      ['Purpose', strategy.sections.purpose],
      ['Guiding Principles', strategy.sections.guidingPrinciples],
      ['Conversion Scope', strategy.sections.conversionScope],
      ['Conversion Methods', strategy.sections.conversionMethods],
      ['Conversion Documents', strategy.sections.conversionDocuments],
      ['Data Readiness', strategy.sections.dataReadiness],
      ['Data Conversion', strategy.sections.dataConversion],
      ['Mock Cycles', strategy.sections.mockConversionCycles],
      ['Go-Live Simulation & Cutover', strategy.sections.goLiveSimulationCutover],
      ['Dependencies', strategy.sections.dependencies],
      ['Assumptions', strategy.sections.assumptions],
    ]
      .map(([title, value]) => `## ${title}\n\n${value || '_Not provided_'}\n`)
      .join('\n');

    const docsBlock = documents.length === 0
      ? '- None'
      : documents
          .map((doc: any) => `- ${doc.file_name} (${doc.document_type})${doc.mock_cycle_name ? ` [${doc.mock_cycle_name}]` : ''}`)
          .join('\n');

    const roleBlock = [
      `- Lead User ID: ${strategy.roles.leadUserId || 'Unassigned'}`,
      `- Project Manager User ID: ${strategy.roles.projectManagerUserId || 'Unassigned'}`,
    ].join('\n');

    const markdown = [
      `# Data Migration Strategy - ${project.name}`,
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Project Role Assignments',
      roleBlock,
      '',
      strategySections,
      '## Supporting Documentation',
      docsBlock,
      '',
      ...cycleBlocks,
    ].join('\n');

    return markdown;
  }
}

export default new DataMigrationStrategyService();
