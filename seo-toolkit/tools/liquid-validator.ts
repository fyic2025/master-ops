/**
 * Liquid Template Validator
 * Validates Shopify Liquid templates before deployment using Theme Check CLI
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface LiquidError {
  file: string;
  line: number;
  column: number;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'suggestion';
  check: string;
}

export interface LiquidValidationResult {
  passed: boolean;
  errors: LiquidError[];
  warnings: LiquidError[];
  suggestions: LiquidError[];
  summary: {
    totalFiles: number;
    filesWithErrors: number;
    errorCount: number;
    warningCount: number;
    suggestionCount: number;
  };
}

export interface LiquidValidatorOptions {
  themePath: string;
  failOnWarnings?: boolean;
  excludePatterns?: string[];
  onlyChecks?: string[];
  skipChecks?: string[];
}

/**
 * Liquid Template Validator using Shopify Theme Check
 * Requires: npm install -g @shopify/cli @shopify/theme
 */
export class LiquidValidator {
  private defaultExcludePatterns = [
    'node_modules/**',
    '.git/**',
    'vendor/**'
  ];

  /**
   * Validate Liquid templates in a theme directory
   */
  async validate(options: LiquidValidatorOptions): Promise<LiquidValidationResult> {
    const {
      themePath,
      failOnWarnings = false,
      excludePatterns = [],
      skipChecks = []
    } = options;

    // Verify theme path exists
    if (!fs.existsSync(themePath)) {
      throw new Error(`Theme path does not exist: ${themePath}`);
    }

    // Check for Liquid files
    const hasLiquidFiles = await this.hasLiquidFiles(themePath);
    if (!hasLiquidFiles) {
      return {
        passed: true,
        errors: [],
        warnings: [],
        suggestions: [],
        summary: {
          totalFiles: 0,
          filesWithErrors: 0,
          errorCount: 0,
          warningCount: 0,
          suggestionCount: 0
        }
      };
    }

    try {
      // Build theme check command
      const excludeArgs = [...this.defaultExcludePatterns, ...excludePatterns]
        .map(p => `--exclude "${p}"`)
        .join(' ');

      const skipArgs = skipChecks.length > 0
        ? `--skip ${skipChecks.join(',')}`
        : '';

      const cmd = `cd "${themePath}" && shopify theme check --output json ${excludeArgs} ${skipArgs}`;

      const { stdout, stderr } = await execAsync(cmd, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large themes
        timeout: 120000 // 2 minute timeout
      });

      return this.parseThemeCheckOutput(stdout, failOnWarnings);

    } catch (error: any) {
      // Theme check returns non-zero exit code when issues found
      if (error.stdout) {
        return this.parseThemeCheckOutput(error.stdout, failOnWarnings);
      }

      // Check if theme check is not installed
      if (error.message?.includes('command not found') || error.message?.includes('is not recognized')) {
        console.warn('⚠️  Shopify CLI not installed. Falling back to basic Liquid syntax check.');
        return this.fallbackValidation(themePath, failOnWarnings);
      }

      throw new Error(`Liquid validation failed: ${error.message}`);
    }
  }

  /**
   * Parse Shopify Theme Check JSON output
   */
  private parseThemeCheckOutput(output: string, failOnWarnings: boolean): LiquidValidationResult {
    const errors: LiquidError[] = [];
    const warnings: LiquidError[] = [];
    const suggestions: LiquidError[] = [];
    const filesWithIssues = new Set<string>();

    try {
      const results = JSON.parse(output);

      // Theme check outputs an array of offenses
      for (const offense of results) {
        const issue: LiquidError = {
          file: offense.path || offense.file || 'unknown',
          line: offense.start_line || offense.line || 0,
          column: offense.start_column || offense.column || 0,
          message: offense.message || '',
          code: offense.code || offense.check || '',
          severity: this.mapSeverity(offense.severity),
          check: offense.check || offense.code || ''
        };

        filesWithIssues.add(issue.file);

        switch (issue.severity) {
          case 'error':
            errors.push(issue);
            break;
          case 'warning':
            warnings.push(issue);
            break;
          case 'suggestion':
            suggestions.push(issue);
            break;
        }
      }
    } catch (parseError) {
      // If JSON parsing fails, try line-by-line parsing
      const lines = output.split('\n').filter(l => l.trim());
      for (const line of lines) {
        if (line.includes('error') || line.includes('Error')) {
          errors.push({
            file: 'unknown',
            line: 0,
            column: 0,
            message: line,
            code: 'parse_error',
            severity: 'error',
            check: 'unknown'
          });
        }
      }
    }

    const passed = errors.length === 0 && (!failOnWarnings || warnings.length === 0);

    return {
      passed,
      errors,
      warnings,
      suggestions,
      summary: {
        totalFiles: filesWithIssues.size,
        filesWithErrors: errors.length > 0 ? new Set(errors.map(e => e.file)).size : 0,
        errorCount: errors.length,
        warningCount: warnings.length,
        suggestionCount: suggestions.length
      }
    };
  }

  /**
   * Map severity string to our severity type
   */
  private mapSeverity(severity: string): 'error' | 'warning' | 'suggestion' {
    const s = severity?.toLowerCase() || '';
    if (s.includes('error') || s === '0' || s === 'fatal') return 'error';
    if (s.includes('warning') || s === '1') return 'warning';
    return 'suggestion';
  }

  /**
   * Check if directory contains Liquid files
   */
  private async hasLiquidFiles(dirPath: string): Promise<boolean> {
    const checkDirs = ['templates', 'sections', 'snippets', 'layout', 'blocks'];

    for (const dir of checkDirs) {
      const fullPath = path.join(dirPath, dir);
      if (fs.existsSync(fullPath)) {
        const files = fs.readdirSync(fullPath);
        if (files.some(f => f.endsWith('.liquid'))) {
          return true;
        }
      }
    }

    // Also check root for any .liquid files
    const rootFiles = fs.readdirSync(dirPath);
    return rootFiles.some(f => f.endsWith('.liquid'));
  }

  /**
   * Fallback validation when Shopify CLI is not available
   * Performs basic syntax checks
   */
  private async fallbackValidation(themePath: string, failOnWarnings: boolean): Promise<LiquidValidationResult> {
    const errors: LiquidError[] = [];
    const warnings: LiquidError[] = [];
    const liquidDirs = ['templates', 'sections', 'snippets', 'layout', 'blocks'];

    for (const dir of liquidDirs) {
      const fullPath = path.join(themePath, dir);
      if (!fs.existsSync(fullPath)) continue;

      const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.liquid'));

      for (const file of files) {
        const filePath = path.join(fullPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const issues = this.basicLiquidCheck(content, path.join(dir, file));
        errors.push(...issues.filter(i => i.severity === 'error'));
        warnings.push(...issues.filter(i => i.severity === 'warning'));
      }
    }

    const passed = errors.length === 0 && (!failOnWarnings || warnings.length === 0);

    return {
      passed,
      errors,
      warnings,
      suggestions: [],
      summary: {
        totalFiles: errors.length + warnings.length > 0 ? new Set([...errors, ...warnings].map(i => i.file)).size : 0,
        filesWithErrors: new Set(errors.map(e => e.file)).size,
        errorCount: errors.length,
        warningCount: warnings.length,
        suggestionCount: 0
      }
    };
  }

  /**
   * Basic Liquid syntax checks
   */
  private basicLiquidCheck(content: string, filePath: string): LiquidError[] {
    const issues: LiquidError[] = [];
    const lines = content.split('\n');

    // Track open tags
    const tagStack: { tag: string; line: number }[] = [];
    // Block tags that require closing (e.g., {% if %}...{% endif %})
    const blockTags = [
      // Standard Liquid
      'if', 'unless', 'case', 'for', 'capture', 'tablerow', 'comment', 'raw',
      // Shopify-specific
      'form', 'paginate', 'style', 'javascript', 'stylesheet', 'schema'
    ];

    lines.forEach((line, lineIndex) => {
      const lineNum = lineIndex + 1;

      // Check for unclosed Liquid tags {{ or {%
      const openBraces = (line.match(/\{\{(?!\{)/g) || []).length;
      const closeBraces = (line.match(/(?<!\})\}\}/g) || []).length;
      const openPercent = (line.match(/\{%(?!%)/g) || []).length;
      const closePercent = (line.match(/(?<!%)%\}/g) || []).length;

      if (openBraces !== closeBraces) {
        issues.push({
          file: filePath,
          line: lineNum,
          column: 0,
          message: 'Unclosed Liquid output tag {{ }}',
          code: 'SyntaxError',
          severity: 'error',
          check: 'basic_syntax'
        });
      }

      if (openPercent !== closePercent) {
        issues.push({
          file: filePath,
          line: lineNum,
          column: 0,
          message: 'Unclosed Liquid tag {% %}',
          code: 'SyntaxError',
          severity: 'error',
          check: 'basic_syntax'
        });
      }

      // Check for block tags
      const tagMatch = line.match(/\{%\s*(\w+)/g);
      if (tagMatch) {
        for (const match of tagMatch) {
          const tag = match.replace(/\{%\s*/, '');

          if (blockTags.includes(tag)) {
            tagStack.push({ tag, line: lineNum });
          } else if (tag.startsWith('end')) {
            const expectedTag = tag.slice(3);
            const lastTag = tagStack.pop();

            if (!lastTag) {
              issues.push({
                file: filePath,
                line: lineNum,
                column: 0,
                message: `Unexpected closing tag: ${tag}`,
                code: 'SyntaxError',
                severity: 'error',
                check: 'block_matching'
              });
            } else if (lastTag.tag !== expectedTag) {
              issues.push({
                file: filePath,
                line: lineNum,
                column: 0,
                message: `Mismatched tags: expected end${lastTag.tag} but found ${tag}`,
                code: 'SyntaxError',
                severity: 'error',
                check: 'block_matching'
              });
            }
          }
        }
      }

      // Check for deprecated filters
      const deprecatedFilters = ['json', 'escape_once'];
      for (const filter of deprecatedFilters) {
        if (line.includes(`| ${filter}`) || line.includes(`|${filter}`)) {
          issues.push({
            file: filePath,
            line: lineNum,
            column: 0,
            message: `Consider using updated filter instead of '${filter}'`,
            code: 'DeprecatedFilter',
            severity: 'warning',
            check: 'deprecated_filter'
          });
        }
      }
    });

    // Check for unclosed block tags at end of file
    for (const unclosed of tagStack) {
      issues.push({
        file: filePath,
        line: unclosed.line,
        column: 0,
        message: `Unclosed block tag: ${unclosed.tag}`,
        code: 'SyntaxError',
        severity: 'error',
        check: 'block_matching'
      });
    }

    return issues;
  }

  /**
   * Format validation results for console output
   */
  formatResults(result: LiquidValidationResult): string[] {
    const output: string[] = [];

    if (result.passed) {
      output.push(`✅ Liquid validation passed`);
      if (result.warnings.length > 0) {
        output.push(`   ${result.warnings.length} warning(s) (non-blocking)`);
      }
      if (result.suggestions.length > 0) {
        output.push(`   ${result.suggestions.length} suggestion(s)`);
      }
    } else {
      output.push(`❌ Liquid validation failed`);
      output.push(`   ${result.errors.length} error(s) found`);

      // Show first 5 errors
      const errorsToShow = result.errors.slice(0, 5);
      for (const error of errorsToShow) {
        output.push(`   • ${error.file}:${error.line} - ${error.message}`);
      }

      if (result.errors.length > 5) {
        output.push(`   ... and ${result.errors.length - 5} more error(s)`);
      }
    }

    return output;
  }
}

export default LiquidValidator;
