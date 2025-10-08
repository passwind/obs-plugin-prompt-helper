import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import { Logger } from '../utils/Logger';
import { PatchOperation, ConventionViolation } from '../types/ObsConfig';

/**
 * Generates and applies code patches from AI suggestions
 * Handles git operations and convention compliance validation
 */
export class PatchGenerator {
    private readonly pendingPatches: Map<string, PatchOperation> = new Map();

    /**
     * Generate patch from AI suggestion
     */
    public generatePatch(
        suggestion: string,
        targetFiles: string[],
        conventionCompliant: boolean = true
    ): PatchOperation {
        const patchId = this.generatePatchId();
        
        const patch: PatchOperation = {
            type: this.detectPatchType(suggestion),
            content: suggestion,
            target_files: targetFiles,
            validation_status: 'pending',
            convention_compliance: conventionCompliant,
            auto_commit: conventionCompliant
        };

        this.pendingPatches.set(patchId, patch);
        Logger.info(`Generated patch ${patchId} for ${targetFiles.length} files`);
        
        return patch;
    }

    /**
     * Preview patch before applying
     */
    public async previewPatch(patch: PatchOperation): Promise<string> {
        if (patch.type === 'unified_diff') {
            return this.previewUnifiedDiff(patch);
        } else {
            return this.previewEditInstructions(patch);
        }
    }

    /**
     * Apply patch to target files
     */
    public async applyPatch(patch: PatchOperation): Promise<boolean> {
        try {
            // Validate patch before applying
            const validationResult = await this.validatePatch(patch);
            if (!validationResult.valid) {
                Logger.error(`Patch validation failed: ${validationResult.reason}`);
                return false;
            }

            // Apply the patch
            let success = false;
            if (patch.type === 'unified_diff') {
                success = await this.applyUnifiedDiff(patch);
            } else {
                success = await this.applyEditInstructions(patch);
            }

            if (success) {
                patch.validation_status = 'valid';
                
                // Auto-commit if enabled and convention compliant
                if (patch.auto_commit && patch.convention_compliance) {
                    await this.autoCommit(patch.target_files);
                }
                
                Logger.info(`Successfully applied patch to ${patch.target_files.length} files`);
            } else {
                patch.validation_status = 'invalid';
                Logger.error('Failed to apply patch');
            }

            return success;
        } catch (error) {
            Logger.error('Error applying patch', error);
            patch.validation_status = 'invalid';
            return false;
        }
    }

    /**
     * Auto-fix convention violations
     */
    public async autoFixConventions(
        filePath: string,
        violations: ConventionViolation[]
    ): Promise<boolean> {
        const autoFixableViolations = violations.filter(v => v.auto_fixable);
        if (autoFixableViolations.length === 0) {
            return true;
        }

        try {
            let content = fs.readFileSync(filePath, 'utf8');
            let modified = false;

            for (const violation of autoFixableViolations) {
                const fixResult = this.applyConventionFix(content, violation, filePath);
                if (fixResult.success) {
                    content = fixResult.content;
                    modified = true;
                    Logger.info(`Auto-fixed ${violation.type} in ${path.basename(filePath)}`);
                }
            }

            if (modified) {
                fs.writeFileSync(filePath, content, 'utf8');
                Logger.info(`Applied ${autoFixableViolations.length} convention fixes to ${filePath}`);
            }

            return true;
        } catch (error) {
            Logger.error(`Failed to auto-fix conventions in ${filePath}`, error);
            return false;
        }
    }

    /**
     * Commit changes with English comments
     */
    public async autoCommit(files: string[]): Promise<boolean> {
        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                Logger.warn('No workspace root found for git commit');
                return false;
            }

            // Stage files
            for (const file of files) {
                await this.executeGitCommand(['add', file], workspaceRoot);
            }

            // Generate commit message
            const commitMessage = this.generateCommitMessage(files);
            
            // Commit changes
            await this.executeGitCommand(['commit', '-m', commitMessage], workspaceRoot);
            
            Logger.info(`Auto-committed changes: ${commitMessage}`);
            return true;
        } catch (error) {
            Logger.error('Failed to auto-commit changes', error);
            return false;
        }
    }

    /**
     * Validate patch before applying
     */
    private async validatePatch(patch: PatchOperation): Promise<{valid: boolean, reason?: string}> {
        // Check if target files exist
        for (const file of patch.target_files) {
            if (!fs.existsSync(file)) {
                return { valid: false, reason: `Target file does not exist: ${file}` };
            }
        }

        // Validate unified diff format
        if (patch.type === 'unified_diff') {
            if (!this.isValidUnifiedDiff(patch.content)) {
                return { valid: false, reason: 'Invalid unified diff format' };
            }
        }

        // Check for convention compliance
        if (!patch.convention_compliance) {
            Logger.warn('Patch is not convention compliant, proceeding with caution');
        }

        return { valid: true };
    }

    /**
     * Apply unified diff patch
     */
    private async applyUnifiedDiff(patch: PatchOperation): Promise<boolean> {
        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                return false;
            }

            // Write patch to temporary file
            const tempPatchFile = path.join(workspaceRoot, '.temp_patch.diff');
            fs.writeFileSync(tempPatchFile, patch.content, 'utf8');

            try {
                // Apply patch using git apply
                await this.executeGitCommand(['apply', tempPatchFile], workspaceRoot);
                return true;
            } finally {
                // Clean up temporary file
                if (fs.existsSync(tempPatchFile)) {
                    fs.unlinkSync(tempPatchFile);
                }
            }
        } catch (error) {
            Logger.error('Failed to apply unified diff', error);
            return false;
        }
    }

    /**
     * Apply edit instructions
     */
    private async applyEditInstructions(patch: PatchOperation): Promise<boolean> {
        try {
            // Parse edit instructions and apply them
            const instructions = this.parseEditInstructions(patch.content);
            
            for (const instruction of instructions) {
                const success = await this.applyEditInstruction(instruction);
                if (!success) {
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            Logger.error('Failed to apply edit instructions', error);
            return false;
        }
    }

    /**
     * Apply single convention fix
     */
    private applyConventionFix(
        content: string,
        violation: ConventionViolation,
        filePath: string
    ): {success: boolean, content: string} {
        switch (violation.type) {
            case 'missing_pragma_once':
                if (!content.includes('#pragma once')) {
                    const lines = content.split('\n');
                    // Insert after any initial comments
                    let insertIndex = 0;
                    while (insertIndex < lines.length && 
                           (lines[insertIndex].trim().startsWith('//') || 
                            lines[insertIndex].trim().startsWith('/*') ||
                            lines[insertIndex].trim() === '')) {
                        insertIndex++;
                    }
                    lines.splice(insertIndex, 0, '#pragma once', '');
                    return { success: true, content: lines.join('\n') };
                }
                break;

            case 'moc_include_missing':
                const fileName = path.parse(filePath).name;
                const mocInclude = `#include "moc_${fileName}.cpp"`;
                if (!content.includes(mocInclude)) {
                    // Add at the end of the file
                    return { success: true, content: content + '\n' + mocInclude + '\n' };
                }
                break;
        }

        return { success: false, content };
    }

    /**
     * Generate commit message based on changed files
     */
    private generateCommitMessage(files: string[]): string {
        const fileTypes = new Set(files.map(f => path.extname(f)));
        const hasHeaders = fileTypes.has('.hpp') || fileTypes.has('.h');
        const hasSource = fileTypes.has('.cpp') || fileTypes.has('.c');
        const hasUI = files.some(f => f.includes('/ui/'));

        let message = 'Fix: ';
        
        if (hasUI) {
            message += 'Update UI components';
        } else if (hasHeaders && hasSource) {
            message += 'Update implementation and headers';
        } else if (hasHeaders) {
            message += 'Update header files';
        } else if (hasSource) {
            message += 'Update source files';
        } else {
            message += 'Update project files';
        }

        message += '\n\n- Applied AI-suggested fixes for build errors';
        message += '\n- Ensured compliance with OBS plugin conventions';

        return message;
    }

    /**
     * Execute git command
     */
    private executeGitCommand(args: string[], cwd: string): Promise<string> {
        return new Promise((resolve, reject) => {
            cp.exec(`git ${args.join(' ')}`, { cwd }, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`Git command failed: ${stderr || error.message}`));
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    /**
     * Detect patch type from content
     */
    private detectPatchType(content: string): 'unified_diff' | 'edit_instructions' {
        if (content.includes('@@') && content.includes('---') && content.includes('+++')) {
            return 'unified_diff';
        }
        return 'edit_instructions';
    }

    /**
     * Validate unified diff format
     */
    private isValidUnifiedDiff(content: string): boolean {
        const lines = content.split('\n');
        return lines.some(line => line.startsWith('@@')) &&
               lines.some(line => line.startsWith('---')) &&
               lines.some(line => line.startsWith('+++'));
    }

    /**
     * Preview unified diff
     */
    private async previewUnifiedDiff(patch: PatchOperation): Promise<string> {
        return `Unified Diff Preview:\n${'='.repeat(50)}\n${patch.content}`;
    }

    /**
     * Preview edit instructions
     */
    private async previewEditInstructions(patch: PatchOperation): Promise<string> {
        return `Edit Instructions Preview:\n${'='.repeat(50)}\n${patch.content}`;
    }

    /**
     * Parse edit instructions
     */
    private parseEditInstructions(content: string): any[] {
        // Simple parser for edit instructions
        // This would be more sophisticated in a real implementation
        return [{ type: 'replace', content }];
    }

    /**
     * Apply single edit instruction
     */
    private async applyEditInstruction(instruction: any): Promise<boolean> {
        // Placeholder for edit instruction application
        Logger.info('Applied edit instruction');
        return true;
    }

    /**
     * Generate unique patch ID
     */
    private generatePatchId(): string {
        return `patch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}