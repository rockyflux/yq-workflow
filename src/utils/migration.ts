export interface MigrationResult {
  success: boolean
  migratedFiles: string[]
  errors: string[]
  skipped: string[]
}

/**
 * Legacy migration hooks are intentionally disabled.
 * The toolkit now writes only the `yq` namespace and does not preserve older namespace compatibility paths.
 */
export async function migrateToV1_4_0(): Promise<MigrationResult> {
  return {
    success: true,
    migratedFiles: [],
    errors: [],
    skipped: ['Legacy namespace compatibility migration is disabled.'],
  }
}

export async function needsMigration(): Promise<boolean> {
  return false
}
