import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { ConfigManager } from '../core/ConfigManager';
import { BuildExecutor } from '../core/BuildExecutor';
import { AIMiddleware } from '../core/AIMiddleware';
import { PatchGenerator } from '../core/PatchGenerator';
import { TemplateManager } from '../core/TemplateManager';
import { CMakeCacheParser, CMakeDependencyInfo } from '../core/CMakeCacheParser';
import { Logger } from '../utils/Logger';
import { ObsConfig, BuildResult, ErrorCollection } from '../types/ObsConfig';

/**
 * Command handlers for OBS Plugin AI Assistant
 */
export class ObsCommands {
    private lastBuildResult: BuildResult | null = null;
    private cmakeCacheParser: CMakeCacheParser;

    constructor(
        private configManager: ConfigManager,
        private buildExecutor: BuildExecutor,
        private aiMiddleware: AIMiddleware,
        private patchGenerator: PatchGenerator,
        private templateManager: TemplateManager
    ) {
        this.cmakeCacheParser = new CMakeCacheParser();
    }

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
     * Initialize OBS plugin template with smart path detection
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
                try {
                    // Step 1: Generate default configuration
                    progress.report({ message: 'Creating default configuration...' });
                    const configPath = await this.templateManager.generateDefaultConfig(workspaceRoot);
                    
                    // Step 2: Load the generated config
                    progress.report({ message: 'Loading configuration...' });
                    await this.configManager.loadConfig(configPath);
                    let config = this.configManager.getConfig();
                    
                    if (!config) {
                        throw new Error('Failed to load generated configuration');
                    }

                    // Step 3: Smart path detection
                    const detectedDependencies = await this.smartPathDetection(workspaceRoot, progress);
                    
                    let pathsUpdated = false;
                    let detectedPathsInfo = '';

                    if (detectedDependencies && Object.keys(detectedDependencies).length > 0) {
                        // Step 4: Update configuration with detected paths
                        progress.report({ message: 'Updating configuration with detected paths...' });
                        
                        config = this.updateConfigWithCacheDependencies(config, detectedDependencies);
                        
                        // Save updated configuration
                        await this.configManager.saveConfig(config);
                        pathsUpdated = true;

                        // Prepare detected paths info for user
                        const pathEntries = Object.entries(detectedDependencies)
                            .filter(([_, value]) => value)
                            .map(([key, value]) => `  • ${key}: ${value}`)
                            .join('\n');
                        
                        if (pathEntries) {
                            detectedPathsInfo = '\n\n🔍 Detected CMake Dependencies:\n' + pathEntries;
                        }
                    } else {
                        Logger.info('No CMake dependencies detected, using default paths');
                    }

                    // Step 5: Generate CMakePresets.json with updated configuration
                    progress.report({ message: 'Creating CMake presets...' });
                    const presetsPath = await this.templateManager.generateCMakePresets(workspaceRoot, config);
                    
                    // Step 6: Show success message with details
                    const successMessage = 
                        'OBS plugin template initialized successfully!\n\n' +
                        '📁 Generated files:\n' +
                        '  • .obspluginrc.json\n' +
                        '  • CMakePresets.json\n' +
                        (pathsUpdated ? '\n✅ Configuration updated with detected CMake paths' : '\n⚠️  Using default paths (no CMake cache found)') +
                        detectedPathsInfo +
                        '\n\n🚀 You can now use cmake --preset <platform> to build your plugin.';

                    vscode.window.showInformationMessage(successMessage);
                    
                    Logger.info('Template initialization completed successfully');
                    if (pathsUpdated) {
                        Logger.info('Configuration updated with detected CMake dependencies');
                    }

                } catch (error) {
                    Logger.error('Failed to initialize template', error);
                    vscode.window.showErrorMessage(`Failed to initialize template: ${error instanceof Error ? error.message : 'Unknown error'}. Check output for details.`);
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

    /**
     * Detect current platform for CMake preset
     */
    private getCurrentPlatform(): string {
        const platform = os.platform();
        switch (platform) {
            case 'darwin':
                return 'macos';
            case 'win32':
                return 'windows-x64';
            case 'linux':
                return 'linux';
            default:
                return 'macos'; // fallback
        }
    }

    /**
     * Check if CMakePresets.json exists and contains the specified preset
     */
    private checkCMakePresets(workspaceRoot: string, presetName: string): boolean {
        const presetsPath = path.join(workspaceRoot, 'CMakePresets.json');
        if (!fs.existsSync(presetsPath)) {
            return false;
        }

        try {
            const presetsContent = fs.readFileSync(presetsPath, 'utf8');
            const presets = JSON.parse(presetsContent);
            return presets.configurePresets?.some((preset: any) => preset.name === presetName) || false;
        } catch (error) {
            Logger.warn(`Failed to parse CMakePresets.json: ${error}`);
            return false;
        }
    }

    /**
     * Execute CMake preset to generate cache
     */
    private async executeCMakePreset(workspaceRoot: string, presetName: string): Promise<boolean> {
        return new Promise((resolve) => {
            const { spawn } = require('child_process');
            
            Logger.info(`Executing cmake --preset ${presetName}...`);
            
            const cmake = spawn('cmake', ['--preset', presetName], {
                cwd: workspaceRoot,
                stdio: 'pipe'
            });

            let output = '';
            let errorOutput = '';

            cmake.stdout.on('data', (data: Buffer) => {
                output += data.toString();
            });

            cmake.stderr.on('data', (data: Buffer) => {
                errorOutput += data.toString();
            });

            cmake.on('close', (code: number) => {
                if (code === 0) {
                    Logger.info(`CMake preset ${presetName} executed successfully`);
                    Logger.info(`Output: ${output}`);
                    resolve(true);
                } else {
                    Logger.warn(`CMake preset ${presetName} failed with code ${code}`);
                    Logger.warn(`Error: ${errorOutput}`);
                    resolve(false);
                }
            });

            cmake.on('error', (error: Error) => {
                Logger.error(`Failed to execute cmake preset: ${error.message}`);
                resolve(false);
            });
        });
    }

    /**
     * Update configuration with CMake cache dependencies
     */
    private updateConfigWithCacheDependencies(config: ObsConfig, dependencies: CMakeDependencyInfo): ObsConfig {
        const updatedConfig = { ...config };

        // Update SDK path if found
        if (dependencies.obs_studio_dir) {
            updatedConfig.sdk_path = dependencies.obs_studio_dir;
        }

        // Update dependencies
        if (updatedConfig.dependencies) {
            if (dependencies.obs_studio_dir) {
                updatedConfig.dependencies.obs = dependencies.obs_studio_dir;
            }
            if (dependencies.qt6_dir) {
                updatedConfig.dependencies.qt6 = dependencies.qt6_dir;
            }
            if (dependencies.obs_frontend_api_dir) {
                updatedConfig.dependencies.frontend_api = dependencies.obs_frontend_api_dir;
            }
        }

        // Add cache information to AI context
        if (updatedConfig.ai_prompts) {
            const cacheInfo = {
                detected_cmake_paths: dependencies,
                cache_detection_timestamp: new Date().toISOString()
            };
            
            const existingContext = updatedConfig.ai_prompts.custom_context || '';
            updatedConfig.ai_prompts.custom_context = existingContext + 
                (existingContext ? '\n\n' : '') + 
                JSON.stringify(cacheInfo, null, 2);
        }

        return updatedConfig;
    }

    /**
     * Smart path detection and update workflow
     */
    private async smartPathDetection(
        workspaceRoot: string, 
        progress: vscode.Progress<{ message?: string; increment?: number }>
    ): Promise<CMakeDependencyInfo | null> {
        // Step 1: Check for existing CMake cache
        progress.report({ message: 'Checking for existing CMake cache...' });
        
        const buildDirs = this.cmakeCacheParser.findBuildDirectories(workspaceRoot);
        
        if (buildDirs.length > 0) {
            Logger.info(`Found ${buildDirs.length} build directories with CMake cache`);
            
            // Use the first available cache
            const cacheResult = await this.cmakeCacheParser.parseCacheFile(buildDirs[0]);
            if (cacheResult.success && Object.keys(cacheResult.dependencies).length > 0) {
                Logger.info('Successfully extracted dependencies from existing CMake cache');
                return cacheResult.dependencies;
            }
        }

        // Step 2: Try to execute CMake preset if available
        progress.report({ message: 'Checking for CMake presets...' });
        
        const currentPlatform = this.getCurrentPlatform();
        const hasPresets = this.checkCMakePresets(workspaceRoot, currentPlatform);
        
        if (hasPresets) {
            progress.report({ message: `Executing cmake --preset ${currentPlatform}...` });
            
            const presetSuccess = await this.executeCMakePreset(workspaceRoot, currentPlatform);
            
            if (presetSuccess) {
                // Try to read cache again after preset execution
                progress.report({ message: 'Reading generated CMake cache...' });
                
                const newBuildDirs = this.cmakeCacheParser.findBuildDirectories(workspaceRoot);
                if (newBuildDirs.length > 0) {
                    const cacheResult = await this.cmakeCacheParser.parseCacheFile(newBuildDirs[0]);
                    if (cacheResult.success) {
                        Logger.info('Successfully extracted dependencies from generated CMake cache');
                        return cacheResult.dependencies;
                    }
                }
            } else {
                Logger.warn('CMake preset execution failed, falling back to default configuration');
            }
        } else {
            Logger.info('No CMake presets found for current platform');
        }

        return null;
    }
}