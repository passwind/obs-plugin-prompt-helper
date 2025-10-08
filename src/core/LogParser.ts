import * as path from 'path';
import { Logger } from '../utils/Logger';
import { BuildError, ConventionViolation } from '../types/ObsConfig';

/**
 * Parses build logs and extracts structured error information
 * Validates coding conventions and provides fix suggestions
 */
export class LogParser {
    private readonly errorPatterns: RegExp[];
    private readonly conventionPatterns: Map<string, RegExp>;

    constructor() {
        this.errorPatterns = [
            // GCC/Clang error patterns
            /^(.+?):(\d+):(\d+):\s*(error|warning|note):\s*(.+)$/gm,
            // MSVC error patterns
            /^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s*C\d+:\s*(.+)$/gm,
            // CMake error patterns
            /^CMake Error at (.+?):(\d+)\s*\((.+?)\):\s*(.+)$/gm,
            // Linker error patterns
            /^(.+?):(\d+):\s*undefined reference to\s*(.+)$/gm,
        ];

        this.conventionPatterns = new Map([
            ['missing_pragma_once', /fatal error: '(.+\.hpp?)' file not found/],
            ['wrong_header_extension', /error: '(.+\.h)' should use '\.hpp' extension/],
            ['ui_component_location', /error: UI component '(.+)' should be in 'ui\/' directory/],
            ['moc_include_missing', /error: undefined reference to.*Qt.*meta.*object/]
        ]);
    }

    /**
     * Parse build errors from log output
     */
    public parseErrors(logOutput: string, cmakePreset: string): BuildError[] {
        const errors: BuildError[] = [];
        
        for (const pattern of this.errorPatterns) {
            let match;
            while ((match = pattern.exec(logOutput)) !== null) {
                const error = this.createBuildError(match, cmakePreset);
                if (error) {
                    errors.push(error);
                }
            }
        }

        // Sort errors by file and line number
        errors.sort((a, b) => {
            if (a.file !== b.file) {
                return a.file.localeCompare(b.file);
            }
            return a.line - b.line;
        });

        Logger.info(`Parsed ${errors.length} build errors from log output`);
        return errors;
    }

    /**
     * Validate coding conventions in source files
     */
    public validateConventions(filePath: string, content: string): ConventionViolation[] {
        const violations: ConventionViolation[] = [];
        const fileName = path.basename(filePath);
        const fileExt = path.extname(filePath);

        // Check header file extension
        if (fileExt === '.h') {
            violations.push({
                type: 'wrong_header_extension',
                suggestion: `Use .hpp extension instead of .h for C++ headers`,
                auto_fixable: true
            });
        }

        // Check for #pragma once in header files
        if (fileExt === '.hpp' && !content.includes('#pragma once')) {
            violations.push({
                type: 'missing_pragma_once',
                suggestion: `Add '#pragma once' at the beginning of the header file`,
                auto_fixable: true
            });
        }

        // Check UI component location
        if (this.isUIComponent(fileName, content) && !filePath.includes('/ui/')) {
            violations.push({
                type: 'ui_component_location',
                suggestion: `Move UI component '${fileName}' to the 'ui/' directory`,
                auto_fixable: false
            });
        }

        // Check Qt6 moc include for Qt components
        if (this.isQtComponent(content) && !this.hasMocInclude(content, fileName)) {
            violations.push({
                type: 'moc_include_missing',
                suggestion: `Include 'moc_${path.parse(fileName).name}.cpp' for Qt6 signal support`,
                auto_fixable: true
            });
        }

        return violations;
    }

    /**
     * Create BuildError from regex match
     */
    private createBuildError(match: RegExpExecArray, cmakePreset: string): BuildError | null {
        try {
            let file: string, line: number, column: number, severity: string, message: string;

            if (match.length >= 6) {
                // Standard format: file:line:column: severity: message
                [, file, line, column, severity, message] = match.map((m, i) => 
                    i === 2 || i === 3 ? parseInt(m) : m
                ) as [string, string, number, number, string, string];
            } else if (match.length >= 5) {
                // Alternative format without column
                let lineStr: string;
                [, file, lineStr, severity, message] = match;
                column = 1;
                line = parseInt(lineStr);
            } else {
                return null;
            }

            // Normalize file path
            file = path.normalize(file);
            
            // Detect convention violations
            const conventionViolation = this.detectConventionViolation(message, file);

            const buildError: BuildError = {
                file,
                line: line || 1,
                column: column || 1,
                severity: this.normalizeSeverity(severity),
                message: message.trim(),
                raw: match[0],
                convention_violation: conventionViolation
            };

            return buildError;
        } catch (error) {
            Logger.warn(`Failed to parse error from match: ${match[0]}`, error);
            return null;
        }
    }

    /**
     * Detect convention violations from error message
     */
    private detectConventionViolation(message: string, file: string): ConventionViolation | undefined {
        for (const [type, pattern] of this.conventionPatterns) {
            if (pattern.test(message)) {
                return this.createConventionViolation(type, message, file);
            }
        }
        return undefined;
    }

    /**
     * Create convention violation object
     */
    private createConventionViolation(type: string, message: string, file: string): ConventionViolation {
        const suggestions: Record<string, string> = {
            missing_pragma_once: `Add '#pragma once' at the beginning of ${path.basename(file)}`,
            wrong_header_extension: `Rename ${path.basename(file)} to use .hpp extension`,
            ui_component_location: `Move ${path.basename(file)} to the ui/ directory`,
            moc_include_missing: `Include moc_${path.parse(file).name}.cpp in the implementation file`
        };

        const autoFixable: Record<string, boolean> = {
            missing_pragma_once: true,
            wrong_header_extension: true,
            ui_component_location: false,
            moc_include_missing: true
        };

        return {
            type: type as any,
            suggestion: suggestions[type] || 'Follow OBS plugin coding conventions',
            auto_fixable: autoFixable[type] || false
        };
    }

    /**
     * Normalize error severity
     */
    private normalizeSeverity(severity: string): 'error' | 'warning' | 'info' {
        const lower = severity.toLowerCase();
        if (lower.includes('error')) return 'error';
        if (lower.includes('warning')) return 'warning';
        return 'info';
    }

    /**
     * Check if file is a UI component
     */
    private isUIComponent(fileName: string, content: string): boolean {
        const uiIndicators = [
            'QWidget',
            'QDialog',
            'QMainWindow',
            'QFrame',
            'obs_frontend',
            'ui_',
            'Widget',
            'Dialog'
        ];

        return uiIndicators.some(indicator => 
            content.includes(indicator) || fileName.toLowerCase().includes(indicator.toLowerCase())
        );
    }

    /**
     * Check if file is a Qt component
     */
    private isQtComponent(content: string): boolean {
        const qtIndicators = [
            'Q_OBJECT',
            'signals:',
            'slots:',
            'emit ',
            'connect(',
            'QObject'
        ];

        return qtIndicators.some(indicator => content.includes(indicator));
    }

    /**
     * Check if file has proper moc include
     */
    private hasMocInclude(content: string, fileName: string): boolean {
        const baseName = path.parse(fileName).name;
        const mocInclude = `#include "moc_${baseName}.cpp"`;
        return content.includes(mocInclude);
    }
}