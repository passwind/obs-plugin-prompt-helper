import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/Logger';
import { ObsConfig, PlatformProfile, CodingConventions, AIPromptConfig } from '../types/ObsConfig';
import { CMakeCacheParser, CacheValidationResult, CMakeDependencyInfo } from './CMakeCacheParser';

/**
 * Manages OBS plugin configuration including .obspluginrc.json
 * Handles default templates and platform-specific settings
 */
export class ConfigManager {
    private config: ObsConfig | null = null;
    private configPath: string | null = null;
    private readonly context: vscode.ExtensionContext;
    private readonly cacheParser: CMakeCacheParser;
    private runtimeDependencies: CMakeDependencyInfo = {};

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.cacheParser = new CMakeCacheParser();
        this.registerDependencyValidationHandler();
    }

    /**
     * Auto-detect and initialize configuration
     */
    public async autoDetectAndInitialize(): Promise<void> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                Logger.warn('No workspace folder found');
                return;
            }

            const rootPath = workspaceFolders[0].uri.fsPath;
            const configPath = path.join(rootPath, '.obspluginrc.json');

            if (fs.existsSync(configPath)) {
                await this.loadConfig(configPath);
                Logger.info('Loaded existing OBS plugin configuration');
            } else {
                // Check if this looks like an OBS plugin project
                const isObsProject = this.detectObsProject(rootPath);
                if (isObsProject) {
                    await this.generateDefaultConfig(rootPath);
                    Logger.info('Generated default OBS plugin configuration');
                }
            }
        } catch (error) {
            Logger.error('Failed to auto-detect configuration', error);
        }
    }

    /**
     * Load configuration from file
     */
    public async loadConfig(configPath: string): Promise<ObsConfig> {
        try {
            const configContent = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configContent) as ObsConfig;
            
            // Validate and merge with defaults
            this.config = this.mergeWithDefaults(config);
            this.configPath = configPath;
            
            Logger.info(`Configuration loaded from ${configPath}`);
            return this.config;
        } catch (error) {
            Logger.error(`Failed to load configuration from ${configPath}`, error);
            throw new Error(`Invalid configuration file: ${error}`);
        }
    }

    /**
     * Save configuration to file
     */
    public async saveConfig(config: ObsConfig, configPath?: string): Promise<void> {
        const targetPath = configPath || this.configPath;
        if (!targetPath) {
            throw new Error('No configuration path specified');
        }

        try {
            const configContent = JSON.stringify(config, null, 2);
            fs.writeFileSync(targetPath, configContent, 'utf8');
            
            this.config = config;
            this.configPath = targetPath;
            
            Logger.info(`Configuration saved to ${targetPath}`);
        } catch (error) {
            Logger.error(`Failed to save configuration to ${targetPath}`, error);
            throw error;
        }
    }

    /**
     * Get current configuration
     */
    public getConfig(): ObsConfig | null {
        return this.config;
    }

    /**
     * Get platform-specific profile
     */
    public getPlatformProfile(platform?: string): PlatformProfile | null {
        if (!this.config?.platform_profiles) {
            return null;
        }

        const targetPlatform = platform || this.getCurrentPlatform();
        return this.config.platform_profiles[targetPlatform] || null;
    }

    /**
     * Reload configuration from file
     */
    public async reloadConfig(): Promise<void> {
        if (this.configPath && fs.existsSync(this.configPath)) {
            await this.loadConfig(this.configPath);
        }
    }

    /**
     * Reset to default configuration
     */
    public resetToDefaults(): void {
        this.config = null;
        this.configPath = null;
        Logger.info('Configuration reset to defaults');
    }

    /**
     * Generate default configuration for OBS plugin project
     */
    public async generateDefaultConfig(rootPath: string): Promise<ObsConfig> {
        const configPath = path.join(rootPath, '.obspluginrc.json');
        const defaultConfig = this.createDefaultConfig();
        
        await this.saveConfig(defaultConfig, configPath);
        return defaultConfig;
    }

    /**
     * Detect if directory contains an OBS plugin project
     */
    private detectObsProject(rootPath: string): boolean {
        // Check for common OBS plugin indicators
        const indicators = [
            'CMakePresets.json',
            'CMakeLists.txt',
            'src/plugin.cpp',
            '.deps/obs-studio'
        ];

        return indicators.some(indicator => 
            fs.existsSync(path.join(rootPath, indicator))
        );
    }

    /**
     * Create default configuration template
     */
    private createDefaultConfig(): ObsConfig {
        const currentPlatform = this.getCurrentPlatform();
        
        return {
            sdk_path: '.deps/obs-studio',
            build_dir: `build_${currentPlatform}`,
            build_system: 'cmake',
            plugin_entry: 'src/plugin.cpp',
            platform_profiles: {
                macos: {
                    cmake_preset: 'macos',
                    build_command: 'cmake --build --preset macos --config Debug',
                    configure_command: 'cmake --preset macos',
                    output_dir: 'build_macos',
                    compiler: 'clang++'
                },
                windows: {
                    cmake_preset: 'windows-x64',
                    build_command: 'cmake --build --preset windows-x64 --config Debug',
                    configure_command: 'cmake --preset windows-x64',
                    output_dir: 'build_windows',
                    compiler: 'msvc'
                },
                linux: {
                    cmake_preset: 'linux',
                    build_command: 'cmake --build --preset linux --config Debug',
                    configure_command: 'cmake --preset linux',
                    output_dir: 'build_linux',
                    compiler: 'g++'
                }
            },
            dependencies: {
                obs: '.deps/obs-studio',
                qt6: '.deps/qt6',
                frontend_api: '.deps/obs-frontend-api'
            },
            coding_conventions: {
                header_extension: '.hpp',
                use_pragma_once: true,
                ui_components_dir: 'ui',
                qt6_moc_include: true,
                english_comments: true,
                auto_commit: true
            },
            ai_prompts: {
                system_template: 'obs_plugin_expert',
                include_conventions: true,
                include_project_structure: true,
                include_recent_errors: true
            }
        };
    }

    /**
     * Merge user configuration with defaults
     */
    private mergeWithDefaults(userConfig: Partial<ObsConfig>): ObsConfig {
        const defaults = this.createDefaultConfig();
        
        return {
            ...defaults,
            ...userConfig,
            platform_profiles: {
                ...defaults.platform_profiles,
                ...userConfig.platform_profiles
            },
            dependencies: {
                ...defaults.dependencies,
                ...userConfig.dependencies
            },
            coding_conventions: {
                ...defaults.coding_conventions,
                ...userConfig.coding_conventions
            },
            ai_prompts: {
                ...defaults.ai_prompts,
                ...userConfig.ai_prompts
            }
        };
    }

    /**
     * Register handler for dependency validation events
     */
    private registerDependencyValidationHandler(): void {
        vscode.commands.registerCommand('obs-plugin-helper.dependencyPathsValidated', 
            (cacheResult: CacheValidationResult) => {
                this.handleDependencyValidation(cacheResult);
            }
        );
    }

    /**
     * Handle dependency validation results from BuildExecutor
     */
    private async handleDependencyValidation(cacheResult: CacheValidationResult): Promise<void> {
        try {
            if (!cacheResult.success) {
                Logger.warn('Dependency validation was not successful');
                if (cacheResult.errors.length > 0) {
                    Logger.warn('Validation errors:', cacheResult.errors);
                }
                return;
            }

            if (!this.config) {
                Logger.warn('No configuration loaded, skipping dependency validation handling');
                return;
            }

            Logger.info('Processing dependency validation results...');

            // Update runtime dependencies
            this.runtimeDependencies = cacheResult.dependencies;

            // Log any warnings from cache validation
            if (cacheResult.warnings.length > 0) {
                Logger.warn('Dependency validation warnings:');
                cacheResult.warnings.forEach(warning => Logger.warn(`  ${warning}`));
            }

            // Compare with current configuration
            const currentDeps = this.config.dependencies || {};
            const comparison = this.cacheParser.compareDependencies(currentDeps, cacheResult.dependencies);

            if (comparison.hasChanges) {
                Logger.info('Dependency path differences detected, updating configuration...');
                
                // Update configuration with validated paths
                await this.updateDependencyPaths(comparison.differences);
                
                // Log changes
                this.logDependencyChanges(comparison.differences);
                
                // Show user notification for significant changes
                const changeCount = Object.keys(comparison.differences).length;
                vscode.window.showInformationMessage(
                    `Updated ${changeCount} dependency path(s) based on CMake cache validation`
                );
            } else {
                Logger.info('All dependency paths match CMake cache - no updates needed');
            }

        } catch (error) {
            Logger.error('Failed to handle dependency validation', error);
            vscode.window.showErrorMessage('Failed to process dependency validation results. Check output for details.');
        }
    }

    /**
     * Update dependency paths in configuration
     */
    private async updateDependencyPaths(differences: Record<string, { current: string; cache: string }>): Promise<void> {
        if (!this.config) {
            return;
        }

        // Update dependencies with validated paths
        for (const [key, { cache }] of Object.entries(differences)) {
            if (this.config.dependencies) {
                this.config.dependencies[key] = cache;
            }
        }

        // Save updated configuration
        if (this.configPath) {
            await this.saveConfig(this.config, this.configPath);
            Logger.info('Configuration updated with validated dependency paths');
        }
    }

    /**
     * Log dependency path changes
     */
    private logDependencyChanges(differences: Record<string, { current: string; cache: string }>): void {
        Logger.info('Dependency path changes:');
        for (const [key, { current, cache }] of Object.entries(differences)) {
            Logger.info(`  ${key}:`);
            Logger.info(`    Current: ${current}`);
            Logger.info(`    Updated: ${cache}`);
        }
    }

    /**
     * Get runtime dependency paths (from CMake cache)
     */
    public getRuntimeDependencies(): CMakeDependencyInfo {
        return this.runtimeDependencies;
    }

    /**
     * Get effective dependency path (runtime if available, otherwise config)
     */
    public getEffectiveDependencyPath(dependencyKey: string): string | undefined {
        // Map config keys to cache keys
        const keyMapping: Record<string, string> = {
            'obs': 'obs_studio_dir',
            'qt6': 'qt6_dir',
            'frontend_api': 'obs_frontend_api_dir'
        };

        const cacheKey = keyMapping[dependencyKey];
        
        // Prefer runtime dependency if available
        if (cacheKey && this.runtimeDependencies[cacheKey]) {
            return this.runtimeDependencies[cacheKey];
        }

        // Fallback to configuration
        return this.config?.dependencies?.[dependencyKey];
    }

    /**
     * Validate current dependency paths against CMake cache
     */
    public async validateCurrentDependencies(): Promise<CacheValidationResult | null> {
        try {
            if (!this.config) {
                Logger.warn('No configuration loaded for dependency validation');
                return null;
            }

            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                Logger.warn('No workspace folder found for dependency validation');
                return null;
            }

            const rootPath = workspaceFolders[0].uri.fsPath;
            const buildDirs = this.cacheParser.findBuildDirectories(rootPath);

            if (buildDirs.length === 0) {
                Logger.warn('No build directories with CMakeCache.txt found');
                return null;
            }

            // Use the first available build directory
            const cacheResult = await this.cacheParser.parseCacheFile(buildDirs[0]);
            
            if (cacheResult.success) {
                await this.handleDependencyValidation(cacheResult);
            }

            return cacheResult;

        } catch (error) {
            Logger.error('Failed to validate current dependencies', error);
            return null;
        }
    }

    /**
     * Get current platform
     */
    private getCurrentPlatform(): string {
        switch (process.platform) {
            case 'darwin':
                return 'macos';
            case 'win32':
                return 'windows';
            case 'linux':
                return 'linux';
            default:
                return 'linux';
        }
    }
}