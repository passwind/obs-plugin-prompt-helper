import * as vscode from 'vscode';
import { ConfigManager } from './core/ConfigManager';
import { AIMiddleware } from './core/AIMiddleware';
import { BuildExecutor } from './core/BuildExecutor';
import { LogParser } from './core/LogParser';
import { PatchGenerator } from './core/PatchGenerator';
import { TemplateManager } from './core/TemplateManager';
import { ObsCommands } from './commands/ObsCommands';
import { Logger } from './utils/Logger';

let configManager: ConfigManager;
let aiMiddleware: AIMiddleware;
let buildExecutor: BuildExecutor;
let logParser: LogParser;
let patchGenerator: PatchGenerator;
let templateManager: TemplateManager;
let obsCommands: ObsCommands;

export function activate(context: vscode.ExtensionContext) {
    // Initialize logger
    Logger.initialize('OBS Plugin AI Assistant');
    Logger.info('OBS Plugin AI Assistant is activating...');

    try {
        // Initialize core components
        configManager = new ConfigManager();
        logParser = new LogParser();
        aiMiddleware = new AIMiddleware();
        buildExecutor = new BuildExecutor(logParser);
        patchGenerator = new PatchGenerator();
        templateManager = new TemplateManager();

        // Initialize command handlers
        obsCommands = new ObsCommands(
            configManager,
            buildExecutor,
            aiMiddleware,
            patchGenerator,
            templateManager
        );

        // Register all commands
        obsCommands.registerCommands(context);

        // Set up file watchers for configuration changes
        const configWatcher = vscode.workspace.createFileSystemWatcher('**/.obspluginrc.json');
        configWatcher.onDidChange(async (uri) => {
            Logger.info(`Configuration changed: ${uri.fsPath}`);
            vscode.window.showInformationMessage('OBS Plugin configuration changed. Reloading...');
            
            // Reload configuration
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (workspaceRoot) {
                await configManager.loadConfig(workspaceRoot);
            }
        });
        context.subscriptions.push(configWatcher);

        // Set up AI context injection
        const activeEditorWatcher = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
            if (editor && editor.document.languageId === 'cpp') {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (workspaceRoot) {
                    const config = await configManager.loadConfig(workspaceRoot);
                    if (config?.auto_features?.auto_inject_ai_context) {
                        await aiMiddleware.registerContextInjection(editor.document.uri.fsPath);
                    }
                }
            }
        });
        context.subscriptions.push(activeEditorWatcher);

        // Show welcome message for new users
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (workspaceRoot) {
            configManager.hasConfiguration(workspaceRoot).then(hasConfig => {
                if (!hasConfig) {
                    vscode.window.showInformationMessage(
                        'Welcome to OBS Plugin AI Assistant! This extension helps you develop OBS Studio plugins with AI assistance.',
                        'Configure Now',
                        'Learn More'
                    ).then(selection => {
                        if (selection === 'Configure Now') {
                            vscode.commands.executeCommand('obs.configure');
                        } else if (selection === 'Learn More') {
                            vscode.env.openExternal(vscode.Uri.parse('https://github.com/obsproject/obs-studio/wiki/Plugins'));
                        }
                    });
                }
            });
        }

        Logger.info('OBS Plugin AI Assistant activated successfully');

    } catch (error) {
        Logger.error('Failed to activate OBS Plugin AI Assistant', error);
        vscode.window.showErrorMessage('Failed to activate OBS Plugin AI Assistant. Check output for details.');
    }
}

/**
 * Extension deactivation function
 */
export function deactivate() {
    Logger.info('Deactivating OBS Plugin AI Assistant extension...');
    // Cleanup will be handled by disposables
}

/**
 * Show welcome message for first-time users
 */
function showWelcomeMessage(context: vscode.ExtensionContext) {
    const hasShownWelcome = context.globalState.get('obsPlugin.hasShownWelcome', false);
    
    if (!hasShownWelcome) {
        vscode.window.showInformationMessage(
            'Welcome to OBS Plugin AI Assistant! Would you like to initialize a new OBS plugin project?',
            'Initialize Project',
            'Learn More',
            'Not Now'
        ).then(selection => {
            switch (selection) {
                case 'Initialize Project':
                    vscode.commands.executeCommand('obs.init-template');
                    break;
                case 'Learn More':
                    vscode.env.openExternal(vscode.Uri.parse('https://github.com/trae-ai/obs-plugin-ai-assistant#readme'));
                    break;
            }
        });
        
        context.globalState.update('obsPlugin.hasShownWelcome', true);
    }
}