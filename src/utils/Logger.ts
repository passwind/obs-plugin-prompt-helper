import * as vscode from 'vscode';

/**
 * Log levels enum
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

/**
 * Logger utility for OBS Plugin AI Assistant
 * Provides structured logging with different levels
 */
export class Logger {
    private static outputChannel: vscode.OutputChannel;
    private static logLevel: LogLevel = LogLevel.INFO;

    /**
     * Initialize logger with output channel
     */
    public static initialize(channelName: string = 'OBS Plugin AI Assistant'): void {
        this.outputChannel = vscode.window.createOutputChannel(channelName);
    }

    /**
     * Set logging level
     */
    public static setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    /**
     * Log debug message
     */
    public static debug(message: string, data?: any): void {
        if (this.logLevel <= LogLevel.DEBUG) {
            this.log('DEBUG', message, data);
        }
    }

    /**
     * Log info message
     */
    public static info(message: string, data?: any): void {
        if (this.logLevel <= LogLevel.INFO) {
            this.log('INFO', message, data);
        }
    }

    /**
     * Log warning message
     */
    public static warn(message: string, data?: any): void {
        if (this.logLevel <= LogLevel.WARN) {
            this.log('WARN', message, data);
            vscode.window.showWarningMessage(`OBS Plugin: ${message}`);
        }
    }

    /**
     * Log error message
     */
    public static error(message: string, error?: any): void {
        if (this.logLevel <= LogLevel.ERROR) {
            this.log('ERROR', message, error);
            vscode.window.showErrorMessage(`OBS Plugin: ${message}`);
        }
    }

    /**
     * Show output channel
     */
    public static show(): void {
        if (this.outputChannel) {
            this.outputChannel.show();
        }
    }

    /**
     * Clear output channel
     */
    public static clear(): void {
        if (this.outputChannel) {
            this.outputChannel.clear();
        }
    }

    /**
     * Dispose logger resources
     */
    public static dispose(): void {
        if (this.outputChannel) {
            this.outputChannel.dispose();
        }
    }

    /**
     * Internal logging method
     */
    private static log(level: string, message: string, data?: any): void {
        if (!this.outputChannel) {
            this.initialize();
        }

        const timestamp = new Date().toISOString();
        let logMessage = `[${timestamp}] [${level}] ${message}`;

        if (data) {
            if (data instanceof Error) {
                logMessage += `\nError: ${data.message}`;
                if (data.stack) {
                    logMessage += `\nStack: ${data.stack}`;
                }
            } else if (typeof data === 'object') {
                logMessage += `\nData: ${JSON.stringify(data, null, 2)}`;
            } else {
                logMessage += `\nData: ${data}`;
            }
        }

        this.outputChannel.appendLine(logMessage);
    }
}