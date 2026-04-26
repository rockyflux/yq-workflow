export {
  getAllCommandIds,
  getWorkflowById,
  getWorkflowConfigs,
  getWorkflowPreset,
  WORKFLOW_PRESETS,
} from './installer-data'
export type { WorkflowPreset } from './installer-data'

export { injectConfigVariables } from './installer-template'

export {
  installAceTool,
  installAceToolRs,
  installContextWeaver,
  installFastContext,
  installMcpServer,
  uninstallAceTool,
  uninstallContextWeaver,
  uninstallFastContext,
  uninstallMcpServer,
} from './installer-mcp'
export type { ContextWeaverConfig } from './installer-mcp'

export {
  removeFastContextPrompt,
  writeFastContextPrompt,
} from './installer-prompt'

export {
  collectInvocableSkills,
  collectSkills,
  parseFrontmatter,
} from './skill-registry'
export type { SkillMeta } from './skill-registry'

export {
  buildPowerShellDetectionCommand,
  detectBaseEnvironmentToolStatuses,
  getBaseEnvironmentDetectionAttempts,
  getBaseEnvironmentTools,
  SCIENTIFIC_INTERNET_GUIDE_URL,
} from './installer-base-environment'
export type {
  BaseEnvironmentInstallAction,
  BaseEnvironmentToolId,
  BaseEnvironmentToolStatus,
} from './installer-base-environment'

export {
  getAgentSkillsDir,
  getCodexDir,
  listAgentSkillDirectories,
} from './installer-paths'
export type { AgentSkillDirectory } from './installer-paths'

export {
  backupFileIfExists,
  getPromptProfileDefinition,
  getPromptProfileDefinitions,
  getTimestampedBackupPath,
  listPromptBackupEntries,
  readPromptFile,
  restorePromptFileFromBackup,
  writePromptFileWithBackup,
} from './prompt-files'
export type {
  PromptBackupEntry,
  PromptProfileDefinition,
  PromptProfileId,
} from './prompt-files'

export {
  installWorkflows,
  showInstallSummary,
  uninstallWorkflows,
} from './installer-workflow'
export type { UninstallResult } from './installer-workflow'
