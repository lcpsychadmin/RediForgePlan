import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { DbtIntegrationSettings } from '../constants/integrationSettings.js';

const execAsync = promisify(exec);

class DbtService {
  async validatePaths(settings: DbtIntegrationSettings) {
    const projectRoot = String(settings.dbtProjectRootPath || '').trim();
    const profilesPath = String(settings.dbtProfilesPath || '').trim();

    if (!projectRoot || !profilesPath) {
      return {
        valid: false,
        errors: ['dbt Project Root Path and dbt Profiles Path are required.'],
      };
    }

    const errors: string[] = [];

    try {
      await fs.access(projectRoot);
    } catch {
      errors.push(`Project root not found: ${projectRoot}`);
    }

    try {
      await fs.access(profilesPath);
    } catch {
      errors.push(`Profiles path not found: ${profilesPath}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private async readModelFilesRecursively(dirPath: string, baseDir: string, models: string[]): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await this.readModelFilesRecursively(absolutePath, baseDir, models);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.sql')) {
        const relativePath = path.relative(baseDir, absolutePath).replace(/\\/g, '/');
        models.push(relativePath);
      }
    }
  }

  async listModels(settings: DbtIntegrationSettings): Promise<string[]> {
    const projectRoot = String(settings.dbtProjectRootPath || '').trim();
    if (!projectRoot) return [];

    const modelsDir = path.join(projectRoot, 'models');
    const models: string[] = [];

    try {
      await this.readModelFilesRecursively(modelsDir, projectRoot, models);
      return models.sort((a, b) => a.localeCompare(b));
    } catch {
      return [];
    }
  }

  async runDbtCommand(settings: DbtIntegrationSettings, command: string) {
    const projectRoot = String(settings.dbtProjectRootPath || '').trim();
    const profilesPath = String(settings.dbtProfilesPath || '').trim();
    const targetProfileName = String(settings.targetProfileName || '').trim();

    if (!projectRoot) {
      throw new Error('dbt Project Root Path is required.');
    }

    const normalizedCommand = String(command || '').trim();
    if (!normalizedCommand) {
      throw new Error('dbt command is required.');
    }

    const allowedCommands = ['parse', 'ls', 'run', 'test', 'compile', 'debug'];
    const commandName = normalizedCommand.split(/\s+/)[0];
    if (!allowedCommands.includes(commandName)) {
      throw new Error(`Unsupported dbt command: ${commandName}`);
    }

    const pieces = [`dbt ${normalizedCommand}`];
    if (profilesPath) {
      pieces.push(`--profiles-dir "${profilesPath}"`);
    }
    if (targetProfileName) {
      pieces.push(`--target "${targetProfileName}"`);
    }

    const fullCommand = pieces.join(' ');
    const { stdout, stderr } = await execAsync(fullCommand, { cwd: projectRoot, maxBuffer: 1024 * 1024 * 5 });

    return {
      command: fullCommand,
      stdout,
      stderr,
    };
  }

  async getDbtManifest(settings: DbtIntegrationSettings) {
    const projectRoot = String(settings.dbtProjectRootPath || '').trim();
    if (!projectRoot) {
      throw new Error('dbt Project Root Path is required.');
    }

    const manifestPath = path.join(projectRoot, 'target', 'manifest.json');
    const rawManifest = await fs.readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(rawManifest);

    return {
      metadata: parsed?.metadata || null,
      nodes: parsed?.nodes || {},
      sources: parsed?.sources || {},
      exposures: parsed?.exposures || {},
      metrics: parsed?.metrics || {},
    };
  }
}

const dbtService = new DbtService();
export default dbtService;
