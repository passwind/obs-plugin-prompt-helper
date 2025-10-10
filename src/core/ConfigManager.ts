import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Logger } from '../utils/Logger';
import { ObsConfig, PlatformProfile, CodingConventions, AIPromptConfig } from '../types/ObsConfig';
import { CMakeCacheParser, CacheValidationResult, CMakeDependencyInfo } from './CMakeCacheParser';

/**
 * OBS Studio installation detection result
 */
interface ObsInstallationInfo {
    obsStudioPath?: string;
    sdkPath?: string;
    qt6Path?: string;
    frontendApiPath?: string;
    includePaths: string[];
    libraryPaths: string[];
}

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
                
                // Validate and update paths if needed
                await this.validateAndUpdateDetectedPaths();
            } else {
                // Check if this looks like an OBS plugin project
                const isObsProject = this.detectObsProject(rootPath);
                if (isObsProject) {
                    await this.generateDefaultConfig(rootPath);
                    Logger.info('Generated default OBS plugin configuration with auto-detected paths');
                }
            }
        } catch (error) {
            Logger.error('Failed to auto-detect configuration', error);
        }
    }

    /**
     * Validate and update detected paths in existing configuration
     */
    private async validateAndUpdateDetectedPaths(): Promise<void> {
        if (!this.config) {
            return;
        }

        try {
            const obsInfo = await this.detectObsStudioInstallation();
            let hasUpdates = false;

            // Check if current paths are outdated or invalid
            if (obsInfo.obsStudioPath && 
                this.config.sdk_path !== obsInfo.obsStudioPath &&
                this.validateObsPath(obsInfo.obsStudioPath)) {
                
                this.config.sdk_path = obsInfo.obsStudioPath;
                if (this.config.dependencies) {
                    this.config.dependencies.obs = obsInfo.obsStudioPath;
                }
                hasUpdates = true;
                Logger.info(`Updated OBS Studio path to: ${obsInfo.obsStudioPath}`);
            }

            if (obsInfo.qt6Path && 
                this.config.dependencies?.qt6 !== obsInfo.qt6Path) {
                
                if (this.config.dependencies) {
                    this.config.dependencies.qt6 = obsInfo.qt6Path;
                }
                hasUpdates = true;
                Logger.info(`Updated Qt6 path to: ${obsInfo.qt6Path}`);
            }

            if (obsInfo.frontendApiPath && 
                this.config.dependencies?.frontend_api !== obsInfo.frontendApiPath) {
                
                if (this.config.dependencies) {
                    this.config.dependencies.frontend_api = obsInfo.frontendApiPath;
                }
                hasUpdates = true;
                Logger.info(`Updated frontend API path to: ${obsInfo.frontendApiPath}`);
            }

            // Update AI context with latest detected paths
            if (obsInfo.includePaths.length > 0 || obsInfo.libraryPaths.length > 0) {
                const contextInfo = {
                    detected_obs_paths: {
                        include_paths: obsInfo.includePaths,
                        library_paths: obsInfo.libraryPaths,
                        obs_studio_path: obsInfo.obsStudioPath,
                        qt6_path: obsInfo.qt6Path,
                        frontend_api_path: obsInfo.frontendApiPath
                    }
                };

                this.config.ai_prompts = {
                    ...this.config.ai_prompts,
                    custom_context: JSON.stringify(contextInfo, null, 2)
                };
                hasUpdates = true;
                Logger.info('Updated AI context with latest detected paths');
            }

            // Save updated configuration
            if (hasUpdates && this.configPath) {
                await this.saveConfig(this.config, this.configPath);
                Logger.info('Configuration updated with latest detected paths');
            }

        } catch (error) {
            Logger.warn('Failed to validate and update detected paths', error);
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
     * Check if configuration exists in workspace
     */
    public hasConfiguration(workspaceRoot: string): boolean {
        const configPath = path.join(workspaceRoot, '.obspluginrc.json');
        return fs.existsSync(configPath);
    }

    /**
     * Generate default configuration for OBS plugin project
     */
    public async generateDefaultConfig(rootPath: string): Promise<ObsConfig> {
        const configPath = path.join(rootPath, '.obspluginrc.json');
        const defaultConfig = await this.createDefaultConfigWithDetection();
        
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
        return {
            sdk_path: '.deps/obs-studio',
            platform_build_dirs: {
                macos: 'build_macos',
                windows: 'build_x64',
                linux: 'build_linux'
            },
            build_system: 'cmake',
            plugin_entry: 'src/plugin.cpp',
            platform_profiles: {
                macos: {
                    build_dir: 'build_macos',
                    cmake_preset: 'macos',
                    build_command: 'cmake --build --preset macos --config Debug',
                    configure_command: 'cmake --preset macos',
                    output_dir: 'build_macos',
                    compiler: 'clang++'
                },
                windows: {
                    build_dir: 'build_x64',
                    cmake_preset: 'windows-x64',
                    build_command: 'cmake --build --preset windows-x64 --config Debug',
                    configure_command: 'cmake --preset windows-x64',
                    output_dir: 'build_x64',
                    compiler: 'msvc'
                },
                linux: {
                    build_dir: 'build_linux',
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
     * Create default configuration with auto-detected OBS paths
     */
    private async createDefaultConfigWithDetection(): Promise<ObsConfig> {
        // Start with basic default config
        const defaultConfig = this.createDefaultConfig();

        try {
            // Detect OBS Studio installation
            const obsInfo = await this.detectObsStudioInstallation();

            // Update paths with detected values
            if (obsInfo.obsStudioPath) {
                defaultConfig.sdk_path = obsInfo.obsStudioPath;
                if (defaultConfig.dependencies) {
                    defaultConfig.dependencies.obs = obsInfo.obsStudioPath;
                }
                
                Logger.info(`Using detected OBS Studio path: ${obsInfo.obsStudioPath}`);
            }

            if (obsInfo.qt6Path) {
                if (defaultConfig.dependencies) {
                    defaultConfig.dependencies.qt6 = obsInfo.qt6Path;
                }
                Logger.info(`Using detected Qt6 path: ${obsInfo.qt6Path}`);
            }

            if (obsInfo.frontendApiPath) {
                if (defaultConfig.dependencies) {
                    defaultConfig.dependencies.frontend_api = obsInfo.frontendApiPath;
                }
                Logger.info(`Using detected frontend API path: ${obsInfo.frontendApiPath}`);
            }

            // Add detected include and library paths to AI context
            if (obsInfo.includePaths.length > 0 || obsInfo.libraryPaths.length > 0) {
                // Store detected paths for AI context injection
                const contextInfo = {
                    detected_obs_paths: {
                        include_paths: obsInfo.includePaths,
                        library_paths: obsInfo.libraryPaths,
                        obs_studio_path: obsInfo.obsStudioPath,
                        qt6_path: obsInfo.qt6Path,
                        frontend_api_path: obsInfo.frontendApiPath
                    }
                };

                // Add to AI prompts configuration
                defaultConfig.ai_prompts = {
                    ...defaultConfig.ai_prompts,
                    custom_context: JSON.stringify(contextInfo, null, 2)
                };

                Logger.info('Added detected paths to AI context configuration');
            }

        } catch (error) {
            Logger.warn('Failed to detect OBS Studio installation, using default paths', error);
        }

        return defaultConfig;
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

    /**
     * Detect OBS Studio installation paths
     */
    private async detectObsStudioInstallation(): Promise<ObsInstallationInfo> {
        const result: ObsInstallationInfo = {
            includePaths: [],
            libraryPaths: []
        };

        // 1. Check environment variables first
        const envPaths = this.checkEnvironmentVariables();
        if (envPaths.obsStudioPath) {
            result.obsStudioPath = envPaths.obsStudioPath;
        }
        if (envPaths.sdkPath) {
            result.sdkPath = envPaths.sdkPath;
        }

        // 2. Check platform-specific default installation paths
        const platformPaths = await this.checkPlatformDefaultPaths();
        if (!result.obsStudioPath && platformPaths.obsStudioPath) {
            result.obsStudioPath = platformPaths.obsStudioPath;
        }
        if (!result.sdkPath && platformPaths.sdkPath) {
            result.sdkPath = platformPaths.sdkPath;
        }

        // 3. Detect Qt6 and frontend API paths
        if (result.obsStudioPath) {
            result.qt6Path = this.detectQt6Path(result.obsStudioPath);
            result.frontendApiPath = this.detectFrontendApiPath(result.obsStudioPath);
        }

        // 4. Collect include and library paths
        this.collectIncludeAndLibraryPaths(result);

        Logger.info('OBS Studio installation detection completed', result);
        return result;
    }

    /**
     * Check environment variables for OBS paths
     */
    private checkEnvironmentVariables(): Partial<ObsInstallationInfo> {
        const result: Partial<ObsInstallationInfo> = {};

        // Check common environment variables
        const envVars = [
            'OBS_STUDIO_PATH',
            'OBS_SDK_PATH',
            'OBS_STUDIO_DIR',
            'OBS_ROOT',
            'LIBOBS_PATH'
        ];

        for (const envVar of envVars) {
            const envPath = process.env[envVar];
            if (envPath && fs.existsSync(envPath)) {
                if (this.validateObsPath(envPath)) {
                    result.obsStudioPath = envPath;
                    Logger.info(`Found OBS Studio path from environment variable ${envVar}: ${envPath}`);
                    break;
                }
            }
        }

        // Check SDK-specific environment variables
        const sdkEnvVars = ['OBS_SDK_PATH', 'LIBOBS_SDK_PATH'];
        for (const envVar of sdkEnvVars) {
            const envPath = process.env[envVar];
            if (envPath && fs.existsSync(envPath)) {
                result.sdkPath = envPath;
                Logger.info(`Found OBS SDK path from environment variable ${envVar}: ${envPath}`);
                break;
            }
        }

        return result;
    }

    /**
     * Check platform-specific default installation paths
     */
    private async checkPlatformDefaultPaths(): Promise<Partial<ObsInstallationInfo>> {
        const platform = this.getCurrentPlatform();
        const result: Partial<ObsInstallationInfo> = {};

        switch (platform) {
            case 'macos':
                result.obsStudioPath = await this.checkMacOSPaths();
                break;
            case 'windows':
                result.obsStudioPath = await this.checkWindowsPaths();
                break;
            case 'linux':
                result.obsStudioPath = await this.checkLinuxPaths();
                break;
        }

        return result;
    }

    /**
     * Check macOS-specific OBS Studio installation paths
     */
    private async checkMacOSPaths(): Promise<string | undefined> {
        const macPaths = [
            '/Applications/OBS.app',
            '/Applications/OBS Studio.app',
            '/usr/local/obs-studio',
            '/usr/local/opt/obs-studio',
            '/opt/homebrew/opt/obs-studio',
            '/usr/local/Cellar/obs-studio',
            '/opt/homebrew/Cellar/obs-studio',
            path.join(os.homedir(), 'Applications/OBS.app'),
            path.join(os.homedir(), 'Applications/OBS Studio.app')
        ];

        for (const obsPath of macPaths) {
            if (fs.existsSync(obsPath)) {
                if (this.validateObsPath(obsPath)) {
                    Logger.info(`Found OBS Studio installation at: ${obsPath}`);
                    return obsPath;
                }
            }
        }

        // Check Homebrew installations
        try {
            const homebrewPaths = [
                '/usr/local/bin/brew',
                '/opt/homebrew/bin/brew'
            ];

            for (const brewPath of homebrewPaths) {
                if (fs.existsSync(brewPath)) {
                    // Try to find OBS through Homebrew
                    const obsBrewPath = await this.findHomebrewObsPath(brewPath);
                    if (obsBrewPath) {
                        return obsBrewPath;
                    }
                }
            }
        } catch (error) {
            Logger.warn('Failed to check Homebrew OBS installation', error);
        }

        return undefined;
    }

    /**
     * Check Windows-specific OBS Studio installation paths
     */
    private async checkWindowsPaths(): Promise<string | undefined> {
        const windowsPaths = [
            'C:\\Program Files\\obs-studio',
            'C:\\Program Files (x86)\\obs-studio',
            'C:\\Program Files\\OBS Studio',
            'C:\\Program Files (x86)\\OBS Studio',
            path.join(os.homedir(), 'AppData\\Local\\obs-studio'),
            path.join(os.homedir(), 'AppData\\Roaming\\obs-studio')
        ];

        for (const obsPath of windowsPaths) {
            if (fs.existsSync(obsPath)) {
                if (this.validateObsPath(obsPath)) {
                    Logger.info(`Found OBS Studio installation at: ${obsPath}`);
                    return obsPath;
                }
            }
        }

        return undefined;
    }

    /**
     * Check Linux-specific OBS Studio installation paths
     */
    private async checkLinuxPaths(): Promise<string | undefined> {
        const linuxPaths = [
            '/usr/local/obs-studio',
            '/usr/obs-studio',
            '/opt/obs-studio',
            '/usr/local/share/obs',
            '/usr/share/obs',
            '/snap/obs-studio/current',
            '/var/lib/flatpak/app/com.obsproject.Studio',
            path.join(os.homedir(), '.local/share/obs-studio'),
            path.join(os.homedir(), 'obs-studio')
        ];

        for (const obsPath of linuxPaths) {
            if (fs.existsSync(obsPath)) {
                if (this.validateObsPath(obsPath)) {
                    Logger.info(`Found OBS Studio installation at: ${obsPath}`);
                    return obsPath;
                }
            }
        }

        // Check package manager installations
        try {
            const pkgPaths = await this.findPackageManagerObsPath();
            if (pkgPaths) {
                return pkgPaths;
            }
        } catch (error) {
            Logger.warn('Failed to check package manager OBS installation', error);
        }

        return undefined;
    }

    /**
     * Find OBS installation through Homebrew
     */
    private async findHomebrewObsPath(brewPath: string): Promise<string | undefined> {
        try {
            // This would require executing brew commands, but for now we'll check common paths
            const brewPrefix = path.dirname(path.dirname(brewPath));
            const obsBrewPaths = [
                path.join(brewPrefix, 'opt/obs-studio'),
                path.join(brewPrefix, 'Cellar/obs-studio')
            ];

            for (const obsPath of obsBrewPaths) {
                if (fs.existsSync(obsPath)) {
                    if (this.validateObsPath(obsPath)) {
                        Logger.info(`Found OBS Studio via Homebrew at: ${obsPath}`);
                        return obsPath;
                    }
                }
            }
        } catch (error) {
            Logger.warn('Failed to find Homebrew OBS path', error);
        }

        return undefined;
    }

    /**
     * Find OBS installation through package managers
     */
    private async findPackageManagerObsPath(): Promise<string | undefined> {
        // Check common package manager installation paths
        const pkgPaths = [
            '/usr/lib/obs-studio',
            '/usr/lib64/obs-studio',
            '/usr/local/lib/obs-studio',
            '/usr/local/lib64/obs-studio'
        ];

        for (const obsPath of pkgPaths) {
            if (fs.existsSync(obsPath)) {
                if (this.validateObsPath(obsPath)) {
                    Logger.info(`Found OBS Studio via package manager at: ${obsPath}`);
                    return obsPath;
                }
            }
        }

        return undefined;
    }

    /**
     * Validate if a path contains OBS Studio installation
     */
    private validateObsPath(obsPath: string): boolean {
        if (!fs.existsSync(obsPath)) {
            return false;
        }

        // Check for essential OBS files/directories
        const requiredPaths = [
            'include/obs',
            'lib',
            'include/obs/obs.h',
            'include/obs/obs-module.h'
        ];

        const alternativePaths = [
            // For app bundles on macOS
            'Contents/Resources/include/obs',
            'Contents/Resources/lib',
            // For different installation structures
            'obs/include/obs',
            'obs/lib',
            // For source installations
            'libobs',
            'UI/obs-frontend-api'
        ];

        // Check if at least some required paths exist
        const hasRequired = requiredPaths.some(reqPath => 
            fs.existsSync(path.join(obsPath, reqPath))
        );

        const hasAlternative = alternativePaths.some(altPath => 
            fs.existsSync(path.join(obsPath, altPath))
        );

        return hasRequired || hasAlternative;
    }

    /**
     * Detect Qt6 installation path
     */
    private detectQt6Path(obsPath: string): string | undefined {
        const qt6Paths = [
            path.join(obsPath, 'qt6'),
            path.join(obsPath, 'Qt6'),
            path.join(obsPath, 'lib/qt6'),
            path.join(obsPath, 'deps/qt6'),
            '/usr/local/qt6',
            '/opt/qt6',
            '/usr/lib/qt6',
            '/usr/local/lib/qt6'
        ];

        for (const qt6Path of qt6Paths) {
            if (fs.existsSync(qt6Path)) {
                // Check for Qt6 indicators
                const qt6Indicators = [
                    'lib/cmake/Qt6',
                    'include/QtCore',
                    'bin/qmake6'
                ];

                if (qt6Indicators.some(indicator => 
                    fs.existsSync(path.join(qt6Path, indicator))
                )) {
                    Logger.info(`Found Qt6 installation at: ${qt6Path}`);
                    return qt6Path;
                }
            }
        }

        return undefined;
    }

    /**
     * Detect OBS frontend API path
     */
    private detectFrontendApiPath(obsPath: string): string | undefined {
        const frontendApiPaths = [
            path.join(obsPath, 'UI/obs-frontend-api'),
            path.join(obsPath, 'include/obs-frontend-api'),
            path.join(obsPath, 'obs-frontend-api'),
            path.join(obsPath, 'frontend-api'),
            path.join(obsPath, 'deps/obs-frontend-api')
        ];

        for (const apiPath of frontendApiPaths) {
            if (fs.existsSync(apiPath)) {
                // Check for frontend API indicators
                const apiIndicators = [
                    'obs-frontend-api.h',
                    'include/obs-frontend-api.h'
                ];

                if (apiIndicators.some(indicator => 
                    fs.existsSync(path.join(apiPath, indicator))
                )) {
                    Logger.info(`Found OBS frontend API at: ${apiPath}`);
                    return apiPath;
                }
            }
        }

        return undefined;
    }

    /**
     * Collect include and library paths from detected installation
     */
    private collectIncludeAndLibraryPaths(info: ObsInstallationInfo): void {
        if (info.obsStudioPath) {
            // Add include paths
            const includePaths = [
                path.join(info.obsStudioPath, 'include'),
                path.join(info.obsStudioPath, 'include/obs'),
                path.join(info.obsStudioPath, 'libobs'),
                path.join(info.obsStudioPath, 'UI/obs-frontend-api')
            ];

            for (const includePath of includePaths) {
                if (fs.existsSync(includePath)) {
                    info.includePaths.push(includePath);
                }
            }

            // Add library paths
            const libraryPaths = [
                path.join(info.obsStudioPath, 'lib'),
                path.join(info.obsStudioPath, 'lib64'),
                path.join(info.obsStudioPath, 'bin')
            ];

            for (const libPath of libraryPaths) {
                if (fs.existsSync(libPath)) {
                    info.libraryPaths.push(libPath);
                }
            }
        }

        if (info.qt6Path) {
            info.includePaths.push(path.join(info.qt6Path, 'include'));
            info.libraryPaths.push(path.join(info.qt6Path, 'lib'));
        }
    }

    /**
     * Get build directory for current platform
     */
    public getBuildDirectory(platform?: string): string {
        const targetPlatform = platform || this.getCurrentPlatform();
        
        // First try to get from platform_build_dirs
        if (this.config?.platform_build_dirs?.[targetPlatform]) {
            return this.config.platform_build_dirs[targetPlatform];
        }
        
        // Fallback to platform profile build_dir
        const profile = this.getPlatformProfile(targetPlatform);
        if (profile?.build_dir) {
            return profile.build_dir;
        }
        
        // Final fallback to default naming convention
        switch (targetPlatform) {
            case 'macos':
                return 'build_macos';
            case 'windows':
                return 'build_x64';
            case 'linux':
                return 'build_linux';
            default:
                return 'build';
        }
    }
}