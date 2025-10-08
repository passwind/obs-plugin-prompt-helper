import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/Logger';
import { ConfigManager } from './ConfigManager';
import { AIRequestEnvelope, FileContext, ProjectStructure, PromptTemplate } from '../types/ObsConfig';

/**
 * Manages AI context injection and prompt enhancement
 * Automatically adds OBS plugin development context to AI interactions
 */
export class AIMiddleware {
    private readonly configManager: ConfigManager;
    private readonly promptTemplates: Map<string, PromptTemplate>;
    private recentBuildLog: string = '';

    constructor(configManager: ConfigManager) {
        this.configManager = configManager;
        this.promptTemplates = new Map();
        this.initializePromptTemplates();
    }

    /**
     * Register AI context injection with Trae IDE
     */
    public registerContextInjection(): void {
        // This would integrate with Trae's AI system
        // For now, we'll provide methods that can be called when AI assistance is requested
        Logger.info('AI context injection registered');
    }

    /**
     * Create enhanced AI request envelope with OBS context
     */
    public createRequestEnvelope(
        intent: 'compile' | 'fix' | 'assist',
        userPrompt: string,
        activeFile?: vscode.TextDocument
    ): AIRequestEnvelope {
        const config = this.configManager.getConfig();
        if (!config) {
            throw new Error('No OBS plugin configuration found');
        }

        const systemPrompt = this.generateSystemPrompt(intent, config);
        const fileContexts = this.gatherFileContexts(activeFile);
        const projectStructure = this.analyzeProjectStructure();

        const envelope: AIRequestEnvelope = {
            intent,
            system_prompt: systemPrompt,
            user_prompt: userPrompt,
            file_contexts: fileContexts,
            recent_build_log: this.recentBuildLog,
            coding_conventions: config.coding_conventions,
            project_structure: projectStructure
        };

        Logger.info(`Created AI request envelope for intent: ${intent}`);
        return envelope;
    }

    /**
     * Generate system prompt based on intent and configuration
     */
    public generateSystemPrompt(intent: string, config: any): string {
        const templateName = this.getTemplateForIntent(intent);
        const template = this.promptTemplates.get(templateName);
        
        if (!template) {
            return this.getDefaultSystemPrompt(config);
        }

        return this.interpolateTemplate(template.template, {
            cmake_preset: this.getCurrentPlatformPreset(config),
            build_dir: config.build_dir,
            deps_dir: config.dependencies?.obs || '.deps/obs-studio',
            ui_dir: config.coding_conventions.ui_components_dir,
            header_ext: config.coding_conventions.header_extension
        });
    }

    /**
     * Update recent build log for context
     */
    public updateBuildLog(buildLog: string): void {
        this.recentBuildLog = buildLog;
        Logger.debug('Updated recent build log for AI context');
    }

    /**
     * Get AI fix suggestions for build errors
     */
    public async getFixSuggestions(errors: any[], activeFile?: vscode.TextDocument): Promise<string> {
        const envelope = this.createRequestEnvelope('fix', 
            `Please analyze and fix these build errors:\n${this.formatErrorsForAI(errors)}`,
            activeFile
        );

        // This would call Trae's AI service
        // For now, return a formatted request that can be sent to AI
        return this.formatAIRequest(envelope);
    }

    /**
     * Get AI assistance for general development questions
     */
    public async getAssistance(question: string, activeFile?: vscode.TextDocument): Promise<string> {
        const envelope = this.createRequestEnvelope('assist', question, activeFile);
        return this.formatAIRequest(envelope);
    }

    /**
     * Initialize built-in prompt templates
     */
    private initializePromptTemplates(): void {
        // OBS Plugin Expert Template
        this.promptTemplates.set('obs_plugin_expert', {
            id: 'obs_plugin_expert',
            name: 'OBS Plugin Expert',
            type: 'system',
            template: `You are an expert C++ developer specializing in OBS Studio plugin development. This project follows OBS plugin template conventions with the following standards:

- Use {header_ext} extensions for headers with #pragma once
- Implement UI components as separate classes in {ui_dir}/ directory  
- For Qt6 signals, include "moc_ClassName.cpp" in cpp files
- Use CMake presets: cmake --preset {cmake_preset}, cmake --build --preset {cmake_preset} --config Debug
- Dependencies are in {deps_dir}/ directory, build output in {build_dir}/
- Follow OBS API best practices and libobs conventions
- Write English comments and commit messages
- Avoid modifying CMakeLists.txt except for src file changes

When suggesting code changes, ensure compliance with these conventions and return precise file paths with line edits or unified diffs.`,
            variables: {},
            conventions: {} as any
        });

        // Error Fix Template
        this.promptTemplates.set('obs_error_fix', {
            id: 'obs_error_fix',
            name: 'OBS Error Fix',
            type: 'error_analysis',
            template: `Analyzing OBS plugin build error. Project uses CMake presets with Qt6 enabled. Common issues include:
- Missing #pragma once in {header_ext} files
- Incorrect moc file inclusion for Qt6 signals
- UI components not properly separated into {ui_dir}/ directory
- Dependency path issues in {deps_dir}/ directory

Provide fixes that maintain OBS plugin template structure and coding conventions.

Error context: {error_message}
File: {file_path}:{line_number}
Build command: {build_command}`,
            variables: {},
            conventions: {} as any
        });

        Logger.info(`Initialized ${this.promptTemplates.size} prompt templates`);
    }

    /**
     * Get template name for specific intent
     */
    private getTemplateForIntent(intent: string): string {
        switch (intent) {
            case 'fix':
                return 'obs_error_fix';
            case 'compile':
            case 'assist':
            default:
                return 'obs_plugin_expert';
        }
    }

    /**
     * Interpolate template with variables
     */
    private interpolateTemplate(template: string, variables: Record<string, string>): string {
        let result = template;
        for (const [key, value] of Object.entries(variables)) {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
        return result;
    }

    /**
     * Get default system prompt
     */
    private getDefaultSystemPrompt(config: any): string {
        return `You are an expert C++ developer specializing in OBS Studio plugin development. 
This project uses CMake presets and follows OBS plugin template conventions.
Please provide solutions that comply with the project's coding standards.`;
    }

    /**
     * Get current platform CMake preset
     */
    private getCurrentPlatformPreset(config: any): string {
        const platform = process.platform === 'darwin' ? 'macos' : 
                        process.platform === 'win32' ? 'windows' : 'linux';
        return config.platform_profiles?.[platform]?.cmake_preset || 'default';
    }

    /**
     * Gather file contexts for AI
     */
    private gatherFileContexts(activeFile?: vscode.TextDocument): FileContext[] {
        const contexts: FileContext[] = [];

        if (activeFile) {
            const fileType = this.getFileType(activeFile.fileName);
            const cursorLine = vscode.window.activeTextEditor?.selection.active.line || 0;
            
            contexts.push({
                path: activeFile.fileName,
                snippet: this.getRelevantSnippet(activeFile, cursorLine),
                cursor_line: cursorLine,
                file_type: fileType
            });
        }

        // Add related files (headers, implementations)
        if (activeFile) {
            const relatedFiles = this.findRelatedFiles(activeFile.fileName);
            for (const relatedFile of relatedFiles) {
                if (fs.existsSync(relatedFile)) {
                    const content = fs.readFileSync(relatedFile, 'utf8');
                    contexts.push({
                        path: relatedFile,
                        snippet: content.substring(0, 1000), // First 1000 chars
                        cursor_line: 0,
                        file_type: this.getFileType(relatedFile)
                    });
                }
            }
        }

        return contexts;
    }

    /**
     * Analyze project structure
     */
    private analyzeProjectStructure(): ProjectStructure {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        const config = this.configManager.getConfig();

        return {
            base_template: 'obs-plugintemplate',
            ui_components_dir: config?.coding_conventions.ui_components_dir || 'ui',
            deps_dir: config?.dependencies?.obs || '.deps',
            build_dirs: this.findBuildDirectories(workspaceRoot),
            cmake_presets: this.findCMakePresets(workspaceRoot)
        };
    }

    /**
     * Get file type from extension
     */
    private getFileType(fileName: string): 'hpp' | 'cpp' | 'ui' | 'cmake' {
        const ext = path.extname(fileName).toLowerCase();
        if (ext === '.hpp' || ext === '.h') return 'hpp';
        if (ext === '.cpp' || ext === '.c' || ext === '.cc') return 'cpp';
        if (fileName.includes('CMakeLists.txt') || ext === '.cmake') return 'cmake';
        if (fileName.includes('/ui/')) return 'ui';
        return 'cpp';
    }

    /**
     * Get relevant code snippet around cursor
     */
    private getRelevantSnippet(document: vscode.TextDocument, cursorLine: number): string {
        const startLine = Math.max(0, cursorLine - 10);
        const endLine = Math.min(document.lineCount - 1, cursorLine + 10);
        
        let snippet = '';
        for (let i = startLine; i <= endLine; i++) {
            snippet += document.lineAt(i).text + '\n';
        }
        
        return snippet;
    }

    /**
     * Find related files (header/implementation pairs)
     */
    private findRelatedFiles(fileName: string): string[] {
        const related: string[] = [];
        const baseName = path.parse(fileName).name;
        const dir = path.dirname(fileName);

        // Look for header/implementation pairs
        const extensions = ['.hpp', '.h', '.cpp', '.c', '.cc'];
        for (const ext of extensions) {
            const candidate = path.join(dir, baseName + ext);
            if (candidate !== fileName) {
                related.push(candidate);
            }
        }

        return related;
    }

    /**
     * Find build directories in workspace
     */
    private findBuildDirectories(workspaceRoot: string): string[] {
        const buildDirs: string[] = [];
        const candidates = ['build', 'build_macos', 'build_windows', 'build_linux'];
        
        for (const candidate of candidates) {
            const fullPath = path.join(workspaceRoot, candidate);
            if (fs.existsSync(fullPath)) {
                buildDirs.push(candidate);
            }
        }
        
        return buildDirs;
    }

    /**
     * Find CMake presets in workspace
     */
    private findCMakePresets(workspaceRoot: string): string[] {
        const presetsFile = path.join(workspaceRoot, 'CMakePresets.json');
        if (!fs.existsSync(presetsFile)) {
            return [];
        }

        try {
            const content = fs.readFileSync(presetsFile, 'utf8');
            const presets = JSON.parse(content);
            return presets.configurePresets?.map((p: any) => p.name) || [];
        } catch (error) {
            Logger.warn('Failed to parse CMakePresets.json', error);
            return [];
        }
    }

    /**
     * Format errors for AI consumption
     */
    private formatErrorsForAI(errors: any[]): string {
        return errors.map((error, index) => 
            `${index + 1}. ${error.file}:${error.line}:${error.column} - ${error.severity}: ${error.message}`
        ).join('\n');
    }

    /**
     * Format AI request envelope as string
     */
    private formatAIRequest(envelope: AIRequestEnvelope): string {
        return `${envelope.system_prompt}\n\nUser Request: ${envelope.user_prompt}\n\nContext: ${JSON.stringify(envelope, null, 2)}`;
    }
}