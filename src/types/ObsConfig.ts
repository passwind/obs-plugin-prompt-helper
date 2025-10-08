/**
 * Type definitions for OBS Plugin configuration and related structures
 */

export interface ObsConfig {
    sdk_path: string;
    platform_build_dirs?: Record<string, string>;
    build_system: 'cmake' | 'meson' | 'make';
    plugin_entry: string;
    platform_profiles: Record<string, PlatformProfile>;
    dependencies?: Record<string, string>;
    coding_conventions: CodingConventions;
    ai_prompts: AIPromptConfig;
    auto_features?: AutoFeatures;
}

export interface AutoFeatures {
    auto_inject_ai_context?: boolean;
    auto_commit_on_success?: boolean;
}

export interface PlatformProfile {
    build_dir?: string;
    cmake_preset: string;
    build_command: string;
    configure_command: string;
    output_dir: string;
    compiler: string;
}

export interface CodingConventions {
    header_extension: string;
    use_pragma_once: boolean;
    ui_components_dir: string;
    qt6_moc_include: boolean;
    english_comments: boolean;
    auto_commit: boolean;
    namespace?: string;
}

export interface AIPromptConfig {
    system_template: string;
    include_conventions: boolean;
    include_project_structure: boolean;
    include_recent_errors: boolean;
    custom_system_prompt?: string;
}

export interface AIRequestEnvelope {
    intent: 'compile' | 'fix' | 'assist';
    system_prompt: string;
    user_prompt: string;
    file_contexts: FileContext[];
    recent_build_log?: string;
    coding_conventions: CodingConventions;
    project_structure: ProjectStructure;
}

export interface FileContext {
    path: string;
    snippet: string;
    cursor_line: number;
    file_type: 'hpp' | 'cpp' | 'ui' | 'cmake';
}

export interface ProjectStructure {
    base_template: 'obs-plugintemplate';
    ui_components_dir: string;
    deps_dir: string;
    build_dirs: string[];
    cmake_presets: string[];
}

export interface BuildError {
    file: string;
    line: number;
    column: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    raw: string;
    convention_violation?: ConventionViolation;
}

export interface ConventionViolation {
    type: 'missing_pragma_once' | 'wrong_header_extension' | 'ui_component_location' | 'moc_include_missing';
    suggestion: string;
    auto_fixable: boolean;
}

export interface ErrorCollection {
    errors: BuildError[];
    timestamp: string;
    build_command: string;
    cmake_preset: string;
}

export interface PatchOperation {
    type: 'unified_diff' | 'edit_instructions';
    content: string;
    target_files: string[];
    validation_status: 'valid' | 'invalid' | 'pending';
    convention_compliance: boolean;
    auto_commit: boolean;
}

export interface TemplateGeneration {
    template_type?: 'config' | 'ui_component' | 'cmake_preset';
    template_name?: string;
    target_path?: string;
    output_path?: string;
    conventions_applied?: string[];
    generated_content?: string;
    variables?: Record<string, any>;
}

export interface BuildResult {
    success: boolean;
    exit_code: number;
    stdout: string;
    stderr: string;
    duration: number;
    errors: BuildError[];
    cmake_preset: string;
    build_command: string;
}

export interface PromptTemplate {
    id: string;
    name: string;
    type: 'system' | 'error_analysis' | 'fix_suggestion';
    template: string;
    variables: Record<string, any>;
    conventions: CodingConventions;
}