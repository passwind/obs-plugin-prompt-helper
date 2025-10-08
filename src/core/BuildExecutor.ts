import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import { Logger } from '../utils/Logger';
import { OutputChannelManager } from '../utils/OutputChannelManager';
import { LogParser } from './LogParser';
import { CMakeCacheParser, CacheValidationResult } from './CMakeCacheParser';
import { BuildResult, PlatformProfile } from '../types/ObsConfig';
import { ConfigManager } from './ConfigManager';

/**
 * Executes CMake preset-based builds with real-time output streaming
 * Supports platform-specific build configurations
 */
export class BuildExecutor {
    private readonly outputManager: OutputChannelManager;
    private readonly logParser: LogParser;
    private readonly cacheParser: CMakeCacheParser;
    private readonly configManager: ConfigManager;
    private currentProcess: cp.ChildProcess | null = null;

    constructor(outputManager: OutputChannelManager, logParser: LogParser, configManager: ConfigManager) {
        this.outputManager = outputManager;
        this.logParser = logParser;
        this.cacheParser = new CMakeCacheParser();
        this.configManager = configManager;
    }

    /**
     * Configure CMake build system using platform preset
     */
    public async configure(profile: PlatformProfile, workspaceRoot: string): Promise<BuildResult> {
        const startTime = Date.now();
        this.outputManager.clear();
        this.outputManager.appendLine(`🔧 Configuring CMake with preset: ${profile.cmake_preset}`);
        this.outputManager.appendLine(`Command: ${profile.configure_command}`);
        this.outputManager.appendLine('─'.repeat(80));

        try {
            const result = await this.executeCommand(
                profile.configure_command,
                workspaceRoot,
                'Configure'
            );

            const duration = Date.now() - startTime;
            const buildResult: BuildResult = {
                success: result.exitCode === 0,
                exit_code: result.exitCode,
                stdout: result.stdout,
                stderr: result.stderr,
                duration,
                errors: this.logParser.parseErrors(result.stderr, profile.cmake_preset),
                cmake_preset: profile.cmake_preset,
                build_command: profile.configure_command
            };

            if (buildResult.success) {
                this.outputManager.appendLine(`✅ Configuration completed successfully in ${duration}ms`);
                
                // Perform dependency path validation after successful configuration
                await this.validateDependencyPaths(profile, workspaceRoot);
            } else {
                this.outputManager.appendLine(`❌ Configuration failed with exit code ${result.exitCode}`);
                this.displayErrors(buildResult.errors);
            }

            return buildResult;
        } catch (error) {
            const duration = Date.now() - startTime;
            Logger.error('Configuration failed', error);
            this.outputManager.appendLine(`❌ Configuration failed: ${error}`);
            
            return {
                success: false,
                exit_code: -1,
                stdout: '',
                stderr: String(error),
                duration,
                errors: [],
                cmake_preset: profile.cmake_preset,
                build_command: profile.configure_command
            };
        }
    }

    /**
     * Build project using CMake preset
     */
    public async build(profile: PlatformProfile, workspaceRoot: string): Promise<BuildResult> {
        const startTime = Date.now();
        this.outputManager.clear();
        this.outputManager.appendLine(`🔨 Building with preset: ${profile.cmake_preset}`);
        this.outputManager.appendLine(`Command: ${profile.build_command}`);
        this.outputManager.appendLine('─'.repeat(80));

        try {
            const result = await this.executeCommand(
                profile.build_command,
                workspaceRoot,
                'Build'
            );

            const duration = Date.now() - startTime;
            const errors = this.logParser.parseErrors(result.stderr, profile.cmake_preset);
            
            const buildResult: BuildResult = {
                success: result.exitCode === 0,
                exit_code: result.exitCode,
                stdout: result.stdout,
                stderr: result.stderr,
                duration,
                errors,
                cmake_preset: profile.cmake_preset,
                build_command: profile.build_command
            };

            if (buildResult.success) {
                this.outputManager.appendLine(`✅ Build completed successfully in ${duration}ms`);
                this.outputManager.appendLine(`📁 Output directory: ${profile.output_dir}`);
            } else {
                this.outputManager.appendLine(`❌ Build failed with exit code ${result.exitCode}`);
                this.displayErrors(errors);
            }

            return buildResult;
        } catch (error) {
            const duration = Date.now() - startTime;
            Logger.error('Build failed', error);
            this.outputManager.appendLine(`❌ Build failed: ${error}`);
            
            return {
                success: false,
                exit_code: -1,
                stdout: '',
                stderr: String(error),
                duration,
                errors: [],
                cmake_preset: profile.cmake_preset,
                build_command: profile.build_command
            };
        }
    }

    /**
     * Clean build artifacts
     */
    public async clean(profile: PlatformProfile, workspaceRoot: string): Promise<BuildResult> {
        const startTime = Date.now();
        this.outputManager.clear();
        this.outputManager.appendLine(`🧹 Cleaning build artifacts for preset: ${profile.cmake_preset}`);
        
        const cleanCommand = `cmake --build --preset ${profile.cmake_preset} --target clean`;
        this.outputManager.appendLine(`Command: ${cleanCommand}`);
        this.outputManager.appendLine('─'.repeat(80));

        try {
            const result = await this.executeCommand(
                cleanCommand,
                workspaceRoot,
                'Clean'
            );

            const duration = Date.now() - startTime;
            const buildResult: BuildResult = {
                success: result.exitCode === 0,
                exit_code: result.exitCode,
                stdout: result.stdout,
                stderr: result.stderr,
                duration,
                errors: [],
                cmake_preset: profile.cmake_preset,
                build_command: cleanCommand
            };

            if (buildResult.success) {
                this.outputManager.appendLine(`✅ Clean completed successfully in ${duration}ms`);
            } else {
                this.outputManager.appendLine(`❌ Clean failed with exit code ${result.exitCode}`);
            }

            return buildResult;
        } catch (error) {
            const duration = Date.now() - startTime;
            Logger.error('Clean failed', error);
            this.outputManager.appendLine(`❌ Clean failed: ${error}`);
            
            return {
                success: false,
                exit_code: -1,
                stdout: '',
                stderr: String(error),
                duration,
                errors: [],
                cmake_preset: profile.cmake_preset,
                build_command: cleanCommand
            };
        }
    }

    /**
     * Cancel current build operation
     */
    public cancel(): void {
        if (this.currentProcess) {
            this.currentProcess.kill('SIGTERM');
            this.currentProcess = null;
            this.outputManager.appendLine('🛑 Build operation cancelled');
            Logger.info('Build operation cancelled by user');
        }
    }

    /**
     * Validate dependency paths after CMake configuration
     * Reads CMakeCache.txt to verify actual resolved dependency paths
     */
    public async validateDependencyPaths(profile: PlatformProfile, workspaceRoot: string): Promise<CacheValidationResult | null> {
        try {
            this.outputManager.appendLine('🔍 Validating dependency paths from CMake cache...');
            
            // Determine build directory using ConfigManager's platform-specific logic
            const buildDirName = profile.build_dir || this.configManager.getBuildDirectory();
            const buildDir = path.join(workspaceRoot, buildDirName);
            this.outputManager.appendLine(`   Build directory: ${buildDir}`);
            
            // Check if build directory exists
            if (!require('fs').existsSync(buildDir)) {
                const errorMsg = `Build directory does not exist: ${buildDir}`;
                this.outputManager.appendLine(`❌ ${errorMsg}`);
                Logger.warn(errorMsg);
                return {
                    success: false,
                    dependencies: {},
                    errors: [errorMsg],
                    warnings: []
                };
            }
            
            // Parse CMakeCache.txt
            const cacheResult = await this.cacheParser.parseCacheFile(buildDir);
            
            if (!cacheResult.success) {
                this.outputManager.appendLine('⚠️  Could not validate dependency paths:');
                for (const error of cacheResult.errors) {
                    this.outputManager.appendLine(`   ${error}`);
                    Logger.warn(`Cache validation error: ${error}`);
                }
                return cacheResult;
            }

            // Check if any dependencies were found
            const dependencyCount = Object.keys(cacheResult.dependencies).length;
            if (dependencyCount === 0) {
                const warningMsg = 'No dependency paths found in CMakeCache.txt';
                this.outputManager.appendLine(`⚠️  ${warningMsg}`);
                Logger.warn(warningMsg);
                cacheResult.warnings.push(warningMsg);
            } else {
                this.outputManager.appendLine(`   Found ${dependencyCount} dependency path(s)`);
            }

            // Validate that extracted paths exist
            const pathWarnings = this.cacheParser.validateDependencyPaths(cacheResult.dependencies);
            if (pathWarnings.length > 0) {
                this.outputManager.appendLine('⚠️  Dependency path warnings:');
                for (const warning of pathWarnings) {
                    this.outputManager.appendLine(`   ${warning}`);
                    Logger.warn(`Path validation: ${warning}`);
                }
                cacheResult.warnings.push(...pathWarnings);
            }

            // Log successful validation
            this.outputManager.appendLine('✅ Dependency path validation completed');
            this.outputManager.appendLine('📋 Resolved dependency paths:');
            
            for (const [key, value] of Object.entries(cacheResult.dependencies)) {
                if (value) {
                    this.outputManager.appendLine(`   ${key}: ${value}`);
                }
            }

            // Emit event for ConfigManager to update runtime configuration
            this.emitDependencyValidationEvent(cacheResult);

            Logger.info(`Dependency validation completed successfully with ${dependencyCount} paths found`);
            return cacheResult;

        } catch (error) {
            const errorMsg = `Failed to validate dependency paths: ${error}`;
            this.outputManager.appendLine(`❌ ${errorMsg}`);
            Logger.error(errorMsg, error);
            
            return {
                success: false,
                dependencies: {},
                errors: [errorMsg],
                warnings: []
            };
        }
    }

    /**
     * Emit dependency validation event for other components to handle
     */
    private emitDependencyValidationEvent(cacheResult: CacheValidationResult): void {
        // Use VS Code's event system to notify other components
        vscode.commands.executeCommand('obs-plugin-helper.dependencyPathsValidated', cacheResult);
    }

    /**
     * Get current platform string
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
     * Execute command with real-time output streaming
     */
    private executeCommand(command: string, cwd: string, operation: string): Promise<{exitCode: number, stdout: string, stderr: string}> {
        return new Promise((resolve, reject) => {
            const args = command.split(' ');
            const cmd = args.shift()!;
            
            this.currentProcess = cp.spawn(cmd, args, {
                cwd,
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true
            });

            let stdout = '';
            let stderr = '';

            this.currentProcess.stdout?.on('data', (data: Buffer) => {
                const output = data.toString();
                stdout += output;
                this.outputManager.append(output);
            });

            this.currentProcess.stderr?.on('data', (data: Buffer) => {
                const output = data.toString();
                stderr += output;
                this.outputManager.append(output);
            });

            this.currentProcess.on('close', (code) => {
                this.currentProcess = null;
                resolve({
                    exitCode: code || 0,
                    stdout,
                    stderr
                });
            });

            this.currentProcess.on('error', (error) => {
                this.currentProcess = null;
                reject(error);
            });

            // Handle process termination
            const timeout = setTimeout(() => {
                if (this.currentProcess) {
                    this.currentProcess.kill('SIGTERM');
                    reject(new Error(`${operation} operation timed out after 5 minutes`));
                }
            }, 5 * 60 * 1000); // 5 minutes timeout

            this.currentProcess.on('close', () => {
                clearTimeout(timeout);
            });
        });
    }

    /**
     * Display build errors in output channel
     */
    private displayErrors(errors: any[]): void {
        if (errors.length === 0) {
            return;
        }

        this.outputManager.appendLine('');
        this.outputManager.appendLine('🚨 Build Errors:');
        this.outputManager.appendLine('─'.repeat(80));

        errors.forEach((error, index) => {
            this.outputManager.appendLine(`${index + 1}. ${error.file}:${error.line}:${error.column}`);
            this.outputManager.appendLine(`   ${error.severity.toUpperCase()}: ${error.message}`);
            
            if (error.convention_violation) {
                this.outputManager.appendLine(`   💡 Convention: ${error.convention_violation.suggestion}`);
            }
            
            this.outputManager.appendLine('');
        });
    }
}