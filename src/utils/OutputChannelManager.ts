import * as vscode from 'vscode';

/**
 * Manages VS Code output channels for the OBS Plugin AI Assistant
 * Provides structured output management with different channels
 */
export class OutputChannelManager {
    private readonly outputChannel: vscode.OutputChannel;

    constructor(channelName: string = 'OBS Plugin Build') {
        this.outputChannel = vscode.window.createOutputChannel(channelName);
    }

    /**
     * Append a line to the output channel
     */
    public appendLine(message: string): void {
        this.outputChannel.appendLine(message);
    }

    /**
     * Append text to the output channel without a newline
     */
    public append(message: string): void {
        this.outputChannel.append(message);
    }

    /**
     * Clear the output channel
     */
    public clear(): void {
        this.outputChannel.clear();
    }

    /**
     * Show the output channel
     */
    public show(preserveFocus?: boolean): void {
        this.outputChannel.show(preserveFocus);
    }

    /**
     * Hide the output channel
     */
    public hide(): void {
        this.outputChannel.hide();
    }

    /**
     * Dispose the output channel
     */
    public dispose(): void {
        this.outputChannel.dispose();
    }
}