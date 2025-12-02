/**
 * BigCommerce to Google Merchant Center Connector
 *
 * Complete solution for syncing products from BigCommerce to Google Merchant Center,
 * replacing paid apps with full control over the feed pipeline.
 *
 * Features:
 * - Full and incremental product sync
 * - Automatic issue detection and remediation
 * - Product optimization suggestions
 * - Supplemental feed management
 * - Comprehensive reporting
 *
 * @example
 * ```typescript
 * import { booSyncOrchestrator } from '@/shared/libs/integrations/bigcommerce-gmc'
 *
 * // Run full sync with issue remediation
 * const result = await booSyncOrchestrator.runFullSync({
 *   remediateIssues: true,
 *   onProgress: (stage, completed, total) => {
 *     console.log(`${stage}: ${completed}/${total}`)
 *   }
 * })
 *
 * // Generate health report
 * const report = await booSyncOrchestrator.generateHealthReport()
 * console.log(`Approval rate: ${report.approvedProducts / report.totalProducts * 100}%`)
 * ```
 */

// Types
export * from './types'

// Transformer
export { BCToGMCTransformer, createTransformer, booTransformer } from './transformer'

// GMC Writer
export { GMCProductWriter, createGMCWriter, gmcWriterBoo, gmcWriterTeelixir, gmcWriterRhf } from './gmc-writer'

// Issue Remediator
export {
  IssueRemediator,
  createIssueRemediator,
  IssueCategory,
  ISSUE_CATEGORIES,
  RemediationStrategy,
  RemediationContext,
  RemediationResult,
} from './issue-remediator'

// Sync Orchestrator
export { SyncOrchestrator, createSyncOrchestrator, booSyncOrchestrator } from './sync-orchestrator'

// Re-export business ID type
export type { BusinessId } from './gmc-writer'
