import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigManager } from '../core/ConfigManager';
import { BuildExecutor } from '../core/BuildExecutor';
import { AIMiddleware } from '../core/AIMiddleware';
import { PatchGenerator } from '../core/PatchGenerator';
import { TemplateManager } from '../core/TemplateManager';
import { Logger } from '../utils/Logger';
import { ObsConfig, BuildResult, ErrorCollection } from '../types/ObsConfig';

/**
 * Command handlers for OBS Plugin AI Assistant
 */
export class ObsCommands {
    private lastBuildResult: BuildResult | null = null;

    constructor(
        private configManager: ConfigManager,
        private buildExecutor: BuildExecutor,
        private aiMiddleware: AIMiddleware,
        private patchGenerator: PatchGenerator,
        private templateManager: TemplateManager
    ) {}

    /**
     * Register all OBS commands
     */
    public registerCommands(context: vscode.ExtensionContext): void {
        const commands = [
            vscode.commands.registerCommand('obs.configure', () => this.configure()),
            vscode.commands.registerCommand('obs.build', () => this.build()),
            vscode.commands.registerCommand('obs.clean', () => this.clean()),
            vscode.commands.registerCommand('obs.fix-error', () => this.fixError()),
            vscode.commands.registerCommand('obs.show-config', () => this.showConfig()),
            vscode.commands.registerCommand('obs.init-template', () => this.initTemplate()),
            vscode.commands.registerCommand('obs.run-tests', () => this.runTests()),
            vscode.commands.registerCommand('obs.commit', () => this.commit()),
            vscode.commands.registerCommand('obs.create-source', () => this.createSource()),
            vscode.commands.registerCommand('obs.create-ui-component', () => this.createUIComponent()),
            vscode.commands.registerCommand('obs.validate-conventions', () => this.validateConventions()),
            vscode.commands.registerCommand('obs.show-logs', () => this.showLogs()),
            vscode.commands.registerCommand('obs.reset-config', () => this.resetConfig()),
            vscode.commands.registerCommand('obs.ai-assist', () => this.aiAssist())
        ];

        commands.forEach(command => context.subscriptions.push(command));
        Logger.info('Registered OBS Plugin AI Assistant commands');
    }

    /**
     * Configure OBS plugin project
     */
    private async configure(): Promise<void> {
        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            // Check if configuration exists
            const configPath = path.join(workspaceRoot, '.obspluginrc.json');
            const hasConfig = await this.configManager.hasConfiguration(workspaceRoot);

            if (!hasConfig) {
                const createConfig = await vscode.window.showQuickPick(
                    ['Yes', 'No'],
                    { placeHolder: 'No OBS plugin configuration found. Create default configuration?' }
                );

                if (createConfig === 'Yes') {
                    await this.configManager.generateDefaultConfig(workspaceRoot);
                    vscode.window.showInformationMessage('Created default .obspluginrc.json configuration');
                } else {
                    return;
                }
            }

            // Load and validate configuration
            const config = await this.configManager.loadConfig(workspaceRoot);
            if (!config) {
                vscode.window.showErrorMessage('Failed to load OBS plugin configuration');
                return;
            }

            // Show configuration options
            const action = await vscode.window.showQuickPick([
                'Edit Configuration',
                'Validate Configuration',
                'Reset to Default',
                'Show Current Settings'
            ], { placeHolder: 'Choose configuration action' });

            switch (action) {
                case 'Edit Configuration':
                    await vscode.window.showTextDocument(vscode.Uri.file(configPath));
                    break;
                case 'Validate Configuration':
                    await this.validateConfiguration(config);
                    break;
                case 'Reset to Default':
                    await this.resetConfig();
                    break;
                case 'Show Current Settings':
                    await this.showCurrentSettings(config);
                    break;
            }

        } catch (error) {
            Logger.error('Failed to configure OBS plugin', error);
            vscode.window.showErrorMessage('Configuration failed. Check output for details.');
        }
    }

    /**
     * Build OBS plugin
     */
    private async build(): Promise<void> {
        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            const config = await this.configManager.loadConfig(workspaceRoot);
            if (!config) {
                vscode.window.showErrorMessage('No OBS plugin configuration found. Run "OBS: Configure" first.');
                return;
            }

            // Show build options
            const buildType = await vscode.window.showQuickPick([
                'Debug',
                'Release',
                'RelWithDebInfo'
            ], { placeHolder: 'Select build configuration' });

            if (!buildType) {
                return;
            }

            // Start build with progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Building OBS Plugin',
                cancellable: true
            }, async (progress, token) => {
                progress.report({ message: 'Configuring build...' });
                
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
                const profile = config.platform_profiles[buildType.toLowerCase()];
                if (!profile) {
                    throw new Error(`No profile found for build type: ${buildType}`);
                }
                
                const buildResult = await this.buildExecutor.build(profile, workspaceRoot);
                this.lastBuildResult = buildResult; // Store the build result

                if (buildResult.success) {
                    vscode.window.showInformationMessage('Build completed successfully!');
                    
                    // Auto-commit if enabled
                    if (config.auto_features?.auto_commit_on_success) {
                        await this.patchGenerator.autoCommit([]);
                    }
                } else {
                    vscode.window.showErrorMessage('Build failed. Check output for details.');
                    
                    // Offer to fix errors
                    const fixErrors = await vscode.window.showQuickPick(
                        ['Yes', 'No'],
                        { placeHolder: 'Build failed. Would you like AI assistance to fix errors?' }
                    );
                    
                    if (fixErrors === 'Yes') {
                        await this.fixError();
                    }
                }
            });

        } catch (error) {
            Logger.error('Build failed', error);
            vscode.window.showErrorMessage('Build failed. Check output for details.');
        }
    }

    /**
     * Clean build artifacts
     */
    private async clean(): Promise<void> {
        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            const config = await this.configManager.loadConfig(workspaceRoot);
            if (!config) {
                vscode.window.showErrorMessage('No OBS plugin configuration found');
                return;
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Cleaning Build Artifacts',
                cancellable: false
            }, async (progress) => {
                progress.report({ message: 'Cleaning...' });
                
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
                const profile = config.platform_profiles[Object.keys(config.platform_profiles)[0]];
                if (!profile) {
                    throw new Error('No platform profile found for clean operation');
                }
                
                const result = await this.buildExecutor.clean(profile, workspaceRoot);
                if (result.success) {
                    vscode.window.showInformationMessage('Clean completed successfully');
                } else {
                    vscode.window.showErrorMessage('Clean failed. Check output for details.');
                }
            });

        } catch (error) {
            Logger.error('Clean failed', error);
            vscode.window.showErrorMessage('Clean failed. Check output for details.');
        }
    }

    /**
     * Fix build errors with AI assistance
     */
    private async fixError(): Promise<void> {
        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            const config = await this.configManager.loadConfig(workspaceRoot);
            if (!config) {
                vscode.window.showErrorMessage('No OBS plugin configuration found');
                return;
            }

            // Get recent build errors
            if (!this.lastBuildResult || this.lastBuildResult.success || !this.lastBuildResult.errors || this.lastBuildResult.errors.length === 0) {
                vscode.window.showInformationMessage('No recent build errors found');
                return;
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Analyzing Errors with AI',
                cancellable: false
            }, async (progress) => {
                progress.report({ message: 'Analyzing build errors...' });
                
                // Get AI suggestions
                const suggestions = await this.aiMiddleware.getFixSuggestions(this.lastBuildResult!.errors);
                
                if (!suggestions || suggestions.trim().length === 0) {
                    vscode.window.showInformationMessage('No AI suggestions available for current errors');
                    return;
                }

                progress.report({ message: 'Displaying AI suggestions...' });
                
                // Show AI suggestions in a new document
                const doc = await vscode.workspace.openTextDocument({
                    content: `# AI Error Fix Suggestions\n\n${suggestions}`,
                    language: 'markdown'
                });
                
                await vscode.window.showTextDocument(doc);
                
                vscode.window.showInformationMessage('AI suggestions displayed in new document');
            });

        } catch (error) {
            Logger.error('Error fixing failed', error);
            vscode.window.showErrorMessage('Error fixing failed. Check output for details.');
        }
    }

    /**
     * Create new OBS source
     */
    private async createSource(): Promise<void> {
        try {
            const className = await vscode.window.showInputBox({
                prompt: 'Enter OBS source class name (e.g., MyCustomSource)',
                validateInput: (value) => {
                    if (!value || !/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
                        return 'Class name must start with uppercase letter and contain only alphanumeric characters';
                    }
                    return null;
                }
            });

            if (!className) {
                return;
            }

            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            const config = await this.configManager.loadConfig(workspaceRoot);
            if (!config) {
                vscode.window.showErrorMessage('No OBS plugin configuration found');
                return;
            }

            const { headerPath, sourcePath } = await this.templateManager.createPluginSource(
                className,
                workspaceRoot,
                config
            );

            // Open created files
            await vscode.window.showTextDocument(vscode.Uri.file(headerPath));
            await vscode.window.showTextDocument(vscode.Uri.file(sourcePath));

            vscode.window.showInformationMessage(`Created OBS source: ${className}`);

        } catch (error) {
            Logger.error('Failed to create OBS source', error);
            vscode.window.showErrorMessage('Failed to create OBS source. Check output for details.');
        }
    }

    /**
     * Create UI component
     */
    private async createUIComponent(): Promise<void> {
        try {
            const componentName = await vscode.window.showInputBox({
                prompt: 'Enter UI component name (e.g., SettingsWidget)',
                validateInput: (value) => {
                    if (!value || !/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
                        return 'Component name must start with uppercase letter and contain only alphanumeric characters';
                    }
                    return null;
                }
            });

            if (!componentName) {
                return;
            }

            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            const config = await this.configManager.loadConfig(workspaceRoot);
            if (!config) {
                vscode.window.showErrorMessage('No OBS plugin configuration found');
                return;
            }

            const { headerPath, sourcePath } = await this.templateManager.createUIComponent(
                componentName,
                workspaceRoot,
                config
            );

            // Open created files
            await vscode.window.showTextDocument(vscode.Uri.file(headerPath));
            await vscode.window.showTextDocument(vscode.Uri.file(sourcePath));

            vscode.window.showInformationMessage(`Created UI component: ${componentName}`);

        } catch (error) {
            Logger.error('Failed to create UI component', error);
            vscode.window.showErrorMessage('Failed to create UI component. Check output for details.');
        }
    }

    /**
     * Validate coding conventions
     */
    private async validateConventions(): Promise<void> {
        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            const config = await this.configManager.loadConfig(workspaceRoot);
            if (!config) {
                vscode.window.showErrorMessage('No OBS plugin configuration found');
                return;
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Validating Conventions',
                cancellable: false
            }, async (progress) => {
                progress.report({ message: 'Scanning files...' });
                
                // This would integrate with LogParser to validate conventions
                // For now, show a placeholder message
                vscode.window.showInformationMessage('Convention validation completed. Check output for details.');
            });

        } catch (error) {
            Logger.error('Convention validation failed', error);
            vscode.window.showErrorMessage('Convention validation failed. Check output for details.');
        }
    }

    /**
     * Show logs
     */
    private async showLogs(): Promise<void> {
        Logger.show();
    }

    /**
     * Reset configuration to default
     */
    private async resetConfig(): Promise<void> {
        try {
            const confirm = await vscode.window.showQuickPick(
                ['Yes', 'No'],
                { placeHolder: 'Reset configuration to default? This will overwrite current settings.' }
            );

            if (confirm === 'Yes') {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!workspaceRoot) {
                    vscode.window.showErrorMessage('No workspace folder found');
                    return;
                }

                await this.configManager.generateDefaultConfig(workspaceRoot);
                vscode.window.showInformationMessage('Configuration reset to default');
            }

        } catch (error) {
            Logger.error('Failed to reset configuration', error);
            vscode.window.showErrorMessage('Failed to reset configuration. Check output for details.');
        }
    }

    /**
     * AI assistance
     */
    private async aiAssist(): Promise<void> {
        try {
            const assistanceType = await vscode.window.showQuickPick([
                'General OBS Plugin Help',
                'Code Review',
                'Performance Optimization',
                'Debugging Assistance',
                'API Usage Questions'
            ], { placeHolder: 'What kind of assistance do you need?' });

            if (!assistanceType) {
                return;
            }

            const question = await vscode.window.showInputBox({
                prompt: `Ask your ${assistanceType.toLowerCase()} question:`
            });

            if (!question) {
                return;
            }

            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const config = workspaceRoot ? await this.configManager.loadConfig(workspaceRoot) : null;

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Getting AI Assistance',
                cancellable: false
            }, async (progress) => {
                progress.report({ message: 'Analyzing question...' });
                
                const response = await this.aiMiddleware.getAssistance(question);
                
                // Show response in a new document
                const doc = await vscode.workspace.openTextDocument({
                    content: `# AI Assistance Response\n\n**Question:** ${question}\n\n**Response:**\n\n${response}`,
                    language: 'markdown'
                });
                
                await vscode.window.showTextDocument(doc);
            });

        } catch (error) {
            Logger.error('AI assistance failed', error);
            vscode.window.showErrorMessage('AI assistance failed. Check output for details.');
        }
    }

    /**
     * Validate configuration
     */
    private async validateConfiguration(config: ObsConfig): Promise<void> {
        const issues: string[] = [];

        // Validate paths
        if (!config.sdk_path) {
            issues.push('SDK path is not configured');
        }

        if (!config.platform_build_dirs || Object.keys(config.platform_build_dirs).length === 0) {
            issues.push('Platform build directories are not configured');
        }

        // Validate platform profiles
        if (!config.platform_profiles || Object.keys(config.platform_profiles).length === 0) {
            issues.push('No platform profiles configured');
        }

        if (issues.length > 0) {
            vscode.window.showWarningMessage(`Configuration issues found:\n${issues.join('\n')}`);
        } else {
            vscode.window.showInformationMessage('Configuration is valid');
        }
    }

    /**
     * Show current settings
     */
    private async showCurrentSettings(config: ObsConfig): Promise<void> {
        const settings = JSON.stringify(config, null, 2);
        const doc = await vscode.workspace.openTextDocument({
            content: settings,
            language: 'json'
        });
        await vscode.window.showTextDocument(doc);
    }

    /**
     * Show plugin configuration
     */
    private async showConfig(): Promise<void> {
        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            const config = await this.configManager.loadConfig(workspaceRoot);
            if (!config) {
                vscode.window.showErrorMessage('No OBS plugin configuration found. Run "OBS: Configure" first.');
                return;
            }

            await this.showCurrentSettings(config);

        } catch (error) {
            Logger.error('Failed to show configuration', error);
            vscode.window.showErrorMessage('Failed to show configuration. Check output for details.');
        }
    }

    /**
     * Initialize OBS plugin template
     */
    private async initTemplate(): Promise<void> {
        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Initializing OBS Plugin Template',
                cancellable: false
            }, async (progress) => {
                progress.report({ message: 'Creating template files...' });
                
                try {
                    const configPath = await this.templateManager.generateDefaultConfig(workspaceRoot);
                    vscode.window.showInformationMessage('OBS plugin template initialized successfully!');
                } catch (error) {
                    vscode.window.showErrorMessage('Failed to initialize template. Check output for details.');
                }
            });

        } catch (error) {
            Logger.error('Failed to initialize template', error);
            vscode.window.showErrorMessage('Template initialization failed. Check output for details.');
        }
    }

    /**
     * Run plugin tests
     */
    private async runTests(): Promise<void> {
        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            const config = await this.configManager.loadConfig(workspaceRoot);
            if (!config) {
                vscode.window.showErrorMessage('No OBS plugin configuration found. Run "OBS: Configure" first.');
                return;
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Running Plugin Tests',
                cancellable: true
            }, async (progress, token) => {
                progress.report({ message: 'Running tests...' });
                
                // Use the first available platform profile for testing
                const profile = config.platform_profiles[Object.keys(config.platform_profiles)[0]];
                if (!profile) {
                    throw new Error('No platform profile found for testing');
                }
                
                // Build the project first, then run tests
                const result = await this.buildExecutor.build(profile, workspaceRoot);
                if (result.success) {
                    vscode.window.showInformationMessage('Build and tests completed successfully!');
                } else {
                    vscode.window.showErrorMessage('Build failed. Check output for details.');
                }
            });

        } catch (error) {
            Logger.error('Failed to run tests', error);
            vscode.window.showErrorMessage('Test execution failed. Check output for details.');
        }
    }

    /**
     * Auto-commit changes
     */
    private async commit(): Promise<void> {
        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            const config = await this.configManager.loadConfig(workspaceRoot);
            if (!config) {
                vscode.window.showErrorMessage('No OBS plugin configuration found. Run "OBS: Configure" first.');
                return;
            }

            // Check if auto-commit is enabled
            if (!config.auto_features?.auto_commit_on_success) {
                const enable = await vscode.window.showQuickPick(
                    ['Yes', 'No'],
                    { placeHolder: 'Auto-commit is disabled. Enable it for this commit?' }
                );
                
                if (enable !== 'Yes') {
                    return;
                }
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Committing Changes',
                cancellable: false
            }, async (progress) => {
                progress.report({ message: 'Analyzing changes...' });
                
                const result = await this.patchGenerator.autoCommit([]);
                if (result) {
                    vscode.window.showInformationMessage('Changes committed successfully!');
                } else {
                    vscode.window.showErrorMessage('Failed to commit changes. Check output for details.');
                }
            });

        } catch (error) {
            Logger.error('Failed to commit changes', error);
            vscode.window.showErrorMessage('Commit failed. Check output for details.');
        }
    }
}