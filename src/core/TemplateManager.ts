import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/Logger';
import { TemplateGeneration, ObsConfig } from '../types/ObsConfig';

/**
 * Manages OBS plugin templates and code generation
 * Provides scaffolding for common OBS plugin patterns
 */
export class TemplateManager {
    private readonly templateCache: Map<string, string> = new Map();
    private readonly builtinTemplates: Map<string, string> = new Map();

    constructor() {
        this.initializeBuiltinTemplates();
    }

    /**
     * Generate template based on request
     */
    public async generateTemplate(request: TemplateGeneration): Promise<string> {
        try {
            const templateName = request.template_name;
            if (!templateName) {
                throw new Error('Template name is required');
            }
            
            const template = await this.getTemplate(templateName);
            if (!template) {
                throw new Error(`Template not found: ${templateName}`);
            }

            const variables = request.variables || {};
            const generatedContent = this.interpolateTemplate(template, variables);
            
            if (request.output_path) {
                await this.writeTemplateToFile(generatedContent, request.output_path);
                Logger.info(`Generated template ${request.template_name} to ${request.output_path}`);
            }

            return generatedContent;
        } catch (error) {
            Logger.error(`Failed to generate template ${request.template_name}`, error);
            throw error;
        }
    }

    /**
     * Get available template names
     */
    public getAvailableTemplates(): string[] {
        return Array.from(this.builtinTemplates.keys());
    }

    /**
     * Create new OBS plugin source file
     */
    public async createPluginSource(
        className: string,
        outputDir: string,
        config: ObsConfig
    ): Promise<{headerPath: string, sourcePath: string}> {
        const headerContent = await this.generateTemplate({
            template_name: 'obs_source_header',
            variables: {
                class_name: className,
                include_guard: className.toUpperCase(),
                namespace: config.coding_conventions?.namespace || 'obs_plugin'
            }
        });

        const sourceContent = await this.generateTemplate({
            template_name: 'obs_source_implementation',
            variables: {
                class_name: className,
                header_file: `${className}.hpp`,
                namespace: config.coding_conventions?.namespace || 'obs_plugin'
            }
        });

        const headerPath = path.join(outputDir, `${className}.hpp`);
        const sourcePath = path.join(outputDir, `${className}.cpp`);

        await this.writeTemplateToFile(headerContent, headerPath);
        await this.writeTemplateToFile(sourceContent, sourcePath);

        return { headerPath, sourcePath };
    }

    /**
     * Create UI component files
     */
    public async createUIComponent(
        componentName: string,
        outputDir: string,
        config: ObsConfig
    ): Promise<{headerPath: string, sourcePath: string}> {
        const uiDir = path.join(outputDir, 'ui');
        if (!fs.existsSync(uiDir)) {
            fs.mkdirSync(uiDir, { recursive: true });
        }

        const headerContent = await this.generateTemplate({
            template_name: 'qt_widget_header',
            variables: {
                class_name: componentName,
                include_guard: componentName.toUpperCase(),
                namespace: config.coding_conventions?.namespace || 'obs_plugin'
            }
        });

        const sourceContent = await this.generateTemplate({
            template_name: 'qt_widget_implementation',
            variables: {
                class_name: componentName,
                header_file: `${componentName}.hpp`,
                namespace: config.coding_conventions?.namespace || 'obs_plugin'
            }
        });

        const headerPath = path.join(uiDir, `${componentName}.hpp`);
        const sourcePath = path.join(uiDir, `${componentName}.cpp`);

        await this.writeTemplateToFile(headerContent, headerPath);
        await this.writeTemplateToFile(sourceContent, sourcePath);

        return { headerPath, sourcePath };
    }

    /**
     * Generate default .obspluginrc.json
     */
    public async generateDefaultConfig(projectRoot: string): Promise<string> {
        const configContent = await this.generateTemplate({
            template_name: 'obspluginrc_default',
            variables: {
                project_name: path.basename(projectRoot),
                project_root: projectRoot
            }
        });

        const configPath = path.join(projectRoot, '.obspluginrc.json');
        await this.writeTemplateToFile(configContent, configPath);
        
        return configPath;
    }

    /**
     * Generate CMakeLists.txt template
     */
    public async generateCMakeTemplate(
        projectName: string,
        outputPath: string,
        config: ObsConfig
    ): Promise<string> {
        const cmakeContent = await this.generateTemplate({
            template_name: 'cmake_plugin',
            variables: {
                project_name: projectName,
                plugin_sources: config.plugin_entry || 'plugin-main.cpp',
                qt_enabled: 'ON',
                frontend_api: 'ON'
            }
        });

        await this.writeTemplateToFile(cmakeContent, outputPath);
        return outputPath;
    }

    /**
     * Generate CMakePresets.json template
     */
    public async generateCMakePresets(projectRoot: string, config: ObsConfig): Promise<string> {
        const presetsContent = await this.generateTemplate({
            template_name: 'cmake_presets',
            variables: {
                project_name: path.basename(projectRoot),
                sdk_path: config.sdk_path || '.deps/obs-studio',
                qt6_path: config.dependencies?.qt6 || '.deps/qt6',
                obs_path: config.dependencies?.obs || '.deps/obs-studio',
                frontend_api_path: config.dependencies?.frontend_api || '.deps/obs-studio/UI/obs-frontend-api'
            }
        });

        const presetsPath = path.join(projectRoot, 'CMakePresets.json');
        await this.writeTemplateToFile(presetsContent, presetsPath);
        
        return presetsPath;
    }

    /**
     * Get template content
     */
    private async getTemplate(templateName: string): Promise<string | null> {
        // Check cache first
        if (this.templateCache.has(templateName)) {
            return this.templateCache.get(templateName)!;
        }

        // Check builtin templates
        if (this.builtinTemplates.has(templateName)) {
            const template = this.builtinTemplates.get(templateName)!;
            this.templateCache.set(templateName, template);
            return template;
        }

        // Try to load from file system
        const templatePath = await this.findTemplateFile(templateName);
        if (templatePath && fs.existsSync(templatePath)) {
            const content = fs.readFileSync(templatePath, 'utf8');
            this.templateCache.set(templateName, content);
            return content;
        }

        return null;
    }

    /**
     * Interpolate template variables
     */
    private interpolateTemplate(template: string, variables: Record<string, any>): string {
        let result = template;
        
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
            result = result.replace(placeholder, String(value));
        }

        return result;
    }

    /**
     * Write template content to file
     */
    private async writeTemplateToFile(content: string, filePath: string): Promise<void> {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(filePath, content, 'utf8');
    }

    /**
     * Find template file in workspace
     */
    private async findTemplateFile(templateName: string): Promise<string | null> {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            return null;
        }

        const possiblePaths = [
            path.join(workspaceRoot, '.trae', 'templates', `${templateName}.template`),
            path.join(workspaceRoot, 'templates', `${templateName}.template`),
            path.join(workspaceRoot, '.templates', `${templateName}.template`)
        ];

        for (const templatePath of possiblePaths) {
            if (fs.existsSync(templatePath)) {
                return templatePath;
            }
        }

        return null;
    }

    /**
     * Initialize builtin templates
     */
    private initializeBuiltinTemplates(): void {
        // OBS Source Header Template
        this.builtinTemplates.set('obs_source_header', `#pragma once

#include <obs-module.h>
#include <obs-source.h>
#include <string>

namespace {{ namespace }} {

/**
 * {{ class_name }} - OBS Source Implementation
 */
class {{ class_name }} {
public:
    {{ class_name }}(obs_data_t* settings, obs_source_t* source);
    ~{{ class_name }}();

    // OBS Source Interface
    static obs_source_info* get_source_info();
    static void* create(obs_data_t* settings, obs_source_t* source);
    static void destroy(void* data);
    static void update(void* data, obs_data_t* settings);
    static void video_tick(void* data, float seconds);
    static void video_render(void* data, gs_effect_t* effect);
    static uint32_t get_width(void* data);
    static uint32_t get_height(void* data);
    static obs_properties_t* get_properties(void* data);
    static void get_defaults(obs_data_t* settings);

private:
    obs_source_t* source_;
    std::string name_;
    uint32_t width_;
    uint32_t height_;
};

} // namespace {{ namespace }}
`);

        // OBS Source Implementation Template
        this.builtinTemplates.set('obs_source_implementation', `#include "{{ header_file }}"
#include <obs-module.h>
#include <util/platform.h>

namespace {{ namespace }} {

{{ class_name }}::{{ class_name }}(obs_data_t* settings, obs_source_t* source)
    : source_(source)
    , name_(obs_source_get_name(source))
    , width_(1920)
    , height_(1080)
{
    update(this, settings);
}

{{ class_name }}::~{{ class_name }}() {
    // Cleanup resources
}

obs_source_info* {{ class_name }}::get_source_info() {
    static obs_source_info info = {};
    info.id = "{{ class_name | lower }}";
    info.type = OBS_SOURCE_TYPE_INPUT;
    info.output_flags = OBS_SOURCE_VIDEO | OBS_SOURCE_CUSTOM_DRAW;
    info.create = create;
    info.destroy = destroy;
    info.update = update;
    info.video_tick = video_tick;
    info.video_render = video_render;
    info.get_width = get_width;
    info.get_height = get_height;
    info.get_properties = get_properties;
    info.get_defaults = get_defaults;
    return &info;
}

void* {{ class_name }}::create(obs_data_t* settings, obs_source_t* source) {
    return new {{ class_name }}(settings, source);
}

void {{ class_name }}::destroy(void* data) {
    delete static_cast<{{ class_name }}*>(data);
}

void {{ class_name }}::update(void* data, obs_data_t* settings) {
    auto* instance = static_cast<{{ class_name }}*>(data);
    // Update instance with new settings
}

void {{ class_name }}::video_tick(void* data, float seconds) {
    auto* instance = static_cast<{{ class_name }}*>(data);
    // Update per frame
}

void {{ class_name }}::video_render(void* data, gs_effect_t* effect) {
    auto* instance = static_cast<{{ class_name }}*>(data);
    // Render video content
}

uint32_t {{ class_name }}::get_width(void* data) {
    auto* instance = static_cast<{{ class_name }}*>(data);
    return instance->width_;
}

uint32_t {{ class_name }}::get_height(void* data) {
    auto* instance = static_cast<{{ class_name }}*>(data);
    return instance->height_;
}

obs_properties_t* {{ class_name }}::get_properties(void* data) {
    obs_properties_t* props = obs_properties_create();
    // Add properties here
    return props;
}

void {{ class_name }}::get_defaults(obs_data_t* settings) {
    // Set default values
}

} // namespace {{ namespace }}

#include "moc_{{ class_name }}.cpp"
`);

        // Qt Widget Header Template
        this.builtinTemplates.set('qt_widget_header', `#pragma once

#include <QWidget>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QPushButton>

namespace {{ namespace }} {

/**
 * {{ class_name }} - Qt Widget for OBS Plugin UI
 */
class {{ class_name }} : public QWidget {
    Q_OBJECT

public:
    explicit {{ class_name }}(QWidget* parent = nullptr);
    ~{{ class_name }}();

public slots:
    void onButtonClicked();
    void updateSettings();

signals:
    void settingsChanged();

private:
    void setupUI();
    void connectSignals();

    QVBoxLayout* mainLayout_;
    QHBoxLayout* buttonLayout_;
    QLabel* titleLabel_;
    QPushButton* actionButton_;
};

} // namespace {{ namespace }}
`);

        // Qt Widget Implementation Template
        this.builtinTemplates.set('qt_widget_implementation', `#include "{{ header_file }}"

namespace {{ namespace }} {

{{ class_name }}::{{ class_name }}(QWidget* parent)
    : QWidget(parent)
    , mainLayout_(nullptr)
    , buttonLayout_(nullptr)
    , titleLabel_(nullptr)
    , actionButton_(nullptr)
{
    setupUI();
    connectSignals();
}

{{ class_name }}::~{{ class_name }}() {
    // Qt handles cleanup automatically
}

void {{ class_name }}::setupUI() {
    mainLayout_ = new QVBoxLayout(this);
    buttonLayout_ = new QHBoxLayout();
    
    titleLabel_ = new QLabel("{{ class_name }}", this);
    titleLabel_->setStyleSheet("font-weight: bold; font-size: 14px;");
    
    actionButton_ = new QPushButton("Action", this);
    
    buttonLayout_->addWidget(actionButton_);
    buttonLayout_->addStretch();
    
    mainLayout_->addWidget(titleLabel_);
    mainLayout_->addLayout(buttonLayout_);
    mainLayout_->addStretch();
    
    setLayout(mainLayout_);
}

void {{ class_name }}::connectSignals() {
    connect(actionButton_, &QPushButton::clicked, this, &{{ class_name }}::onButtonClicked);
}

void {{ class_name }}::onButtonClicked() {
    updateSettings();
    emit settingsChanged();
}

void {{ class_name }}::updateSettings() {
    // Update settings logic here
}

} // namespace {{ namespace }}

#include "moc_{{ class_name }}.cpp"
`);

        // Default .obspluginrc.json Template
        this.builtinTemplates.set('obspluginrc_default', `{
  "sdk_path": ".deps/obs-studio",
  "build_system": "cmake",
  "plugin_entry": "plugin-main.cpp",
  "platform_build_dirs": {
    "macos": "build_macos",
    "windows": "build_x64",
    "linux": "build_linux"
  },
  "platform_profiles": {
    "macos": {
      "build_dir": "build_macos",
      "cmake_preset": "macos",
      "build_command": "cmake --build --preset macos --config Debug",
      "configure_command": "cmake --preset macos",
      "output_dir": "build_macos",
      "compiler": "clang++"
    },
    "windows": {
      "build_dir": "build_x64",
      "cmake_preset": "windows",
      "build_command": "cmake --build --preset windows --config Debug",
      "configure_command": "cmake --preset windows",
      "output_dir": "build_x64",
      "compiler": "msvc"
    },
    "linux": {
      "build_dir": "build_linux",
      "cmake_preset": "linux",
      "build_command": "cmake --build --preset linux --config Debug",
      "configure_command": "cmake --preset linux",
      "output_dir": "build_linux",
      "compiler": "g++"
    }
  },
  "dependencies": {
    "obs": ".deps/obs-studio",
    "qt6": ".deps/qt6",
    "frontend_api": ".deps/obs-studio/UI/obs-frontend-api"
  },
  "coding_conventions": {
    "header_extension": ".hpp",
    "use_pragma_once": true,
    "ui_components_dir": "ui",
    "qt6_moc_include": true,
    "english_comments": true,
    "auto_commit": true
  },
  "ai_prompts": {
    "system_template": "obs_plugin_expert",
    "include_conventions": true,
    "include_project_structure": true,
    "include_recent_errors": true
  }
}
`);

        // CMake Plugin Template
        this.builtinTemplates.set('cmake_plugin', `cmake_minimum_required(VERSION 3.16...3.25)

project({{ project_name }} VERSION 1.0.0)
add_library({{ project_name }} MODULE)

# Add source files
target_sources({{ project_name }} PRIVATE {{ plugin_sources }})

# Find OBS Studio
find_package(libobs REQUIRED)
target_link_libraries({{ project_name }} OBS::libobs)

# Qt6 Support
if({{ qt_enabled }})
    find_package(Qt6 REQUIRED COMPONENTS Core Widgets)
    target_link_libraries({{ project_name }} Qt6::Core Qt6::Widgets)
    set_target_properties({{ project_name }} PROPERTIES AUTOMOC ON AUTOUIC ON AUTORCC ON)
endif()

# Frontend API Support  
if({{ frontend_api }})
    find_package(obs-frontend-api REQUIRED)
    target_link_libraries({{ project_name }} OBS::obs-frontend-api)
endif()

# Set target properties
set_target_properties({{ project_name }} PROPERTIES
    CXX_STANDARD 17
    CXX_STANDARD_REQUIRED ON
    PREFIX ""
)

# Platform-specific settings
if(APPLE)
    set_target_properties({{ project_name }} PROPERTIES
        BUNDLE TRUE
        BUNDLE_EXTENSION "so"
    )
endif()
`);

        // CMakePresets.json Template
        this.builtinTemplates.set('cmake_presets', `{
  "version": 3,
  "configurePresets": [
    {
      "name": "macos",
      "displayName": "macOS Debug",
      "description": "macOS build configuration for OBS plugin",
      "generator": "Ninja",
      "binaryDir": "build_macos",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Debug",
        "CMAKE_OSX_ARCHITECTURES": "x86_64;arm64",
        "CMAKE_OSX_DEPLOYMENT_TARGET": "10.15",
        "CMAKE_PREFIX_PATH": "{{ qt6_path }};{{ obs_path }}",
        "OBS_STUDIO_DIR": "{{ obs_path }}",
        "Qt6_DIR": "{{ qt6_path }}/lib/cmake/Qt6",
        "obs-frontend-api_DIR": "{{ frontend_api_path }}",
        "ENABLE_FRONTEND_API": "ON",
        "ENABLE_QT": "ON"
      },
      "environment": {
        "MACOSX_DEPLOYMENT_TARGET": "10.15"
      }
    },
    {
      "name": "windows",
      "displayName": "Windows x64 Debug",
      "description": "Windows x64 build configuration for OBS plugin",
      "generator": "Visual Studio 17 2022",
      "architecture": "x64",
      "binaryDir": "build_x64",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Debug",
        "CMAKE_PREFIX_PATH": "{{ qt6_path }};{{ obs_path }}",
        "OBS_STUDIO_DIR": "{{ obs_path }}",
        "Qt6_DIR": "{{ qt6_path }}/lib/cmake/Qt6",
        "obs-frontend-api_DIR": "{{ frontend_api_path }}",
        "ENABLE_FRONTEND_API": "ON",
        "ENABLE_QT": "ON"
      }
    },
    {
      "name": "linux",
      "displayName": "Linux Debug",
      "description": "Linux build configuration for OBS plugin",
      "generator": "Unix Makefiles",
      "binaryDir": "build_linux",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Debug",
        "CMAKE_PREFIX_PATH": "{{ qt6_path }};{{ obs_path }}",
        "OBS_STUDIO_DIR": "{{ obs_path }}",
        "Qt6_DIR": "{{ qt6_path }}/lib/cmake/Qt6",
        "obs-frontend-api_DIR": "{{ frontend_api_path }}",
        "ENABLE_FRONTEND_API": "ON",
        "ENABLE_QT": "ON"
      }
    }
  ],
  "buildPresets": [
    {
      "name": "macos",
      "configurePreset": "macos",
      "displayName": "Build macOS Debug"
    },
    {
      "name": "windows",
      "configurePreset": "windows",
      "displayName": "Build Windows x64 Debug"
    },
    {
      "name": "linux",
      "configurePreset": "linux",
      "displayName": "Build Linux Debug"
    }
  ]
}
`);

        Logger.info('Initialized builtin templates');
    }
}