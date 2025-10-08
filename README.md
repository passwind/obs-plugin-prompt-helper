# OBS Plugin AI Assistant

An intelligent Trae IDE extension that provides AI-powered assistance for OBS Studio plugin development. This extension streamlines the development workflow with automated build management, error analysis, and code generation capabilities.

## Features

### 🚀 **Automated Build Management**
- **CMake Preset Integration**: Seamless integration with CMake presets for cross-platform builds
- **Real-time Build Output**: Live streaming of build progress and results
- **Platform-specific Configurations**: Support for macOS, Windows, and Linux build profiles
- **One-click Build Operations**: Configure, build, and clean with simple commands

### 🤖 **AI-Powered Development**
- **Context-aware AI Assistance**: Automatically injects OBS plugin development context into AI prompts
- **Intelligent Error Analysis**: AI-powered parsing and analysis of build errors
- **Smart Fix Suggestions**: Get targeted solutions for common OBS plugin issues
- **Code Generation**: Generate OBS source templates and UI components with best practices

### 🔧 **Convention Validation**
- **Coding Standards Enforcement**: Validates OBS plugin coding conventions
- **Header File Management**: Ensures proper `.hpp` usage and `#pragma once` directives
- **UI Component Structure**: Validates UI components are placed in the correct `ui/` directory
- **MOC Integration**: Automatic validation of Qt6 MOC includes

### 📁 **Project Management**
- **Auto-detection**: Automatically detects OBS plugin projects
- **Configuration Management**: Centralized `.obspluginrc.json` configuration
- **Template Generation**: Quick scaffolding for new OBS sources and UI components
- **Git Integration**: Automated commits with English comments after successful builds

## Installation

### Method 1: From Extension Marketplace (Recommended)

1. Open Trae IDE
2. Go to Extensions marketplace
3. Search for "OBS Plugin AI Assistant"
4. Click Install

### Method 2: Build and Install from Source

#### Prerequisites

- **Node.js**: Version 20.0.0 or higher (recommended for best compatibility)
- **npm**: Comes with Node.js
- **Git**: For cloning the repository
- **VS Code Extension Manager (vsce)**: For packaging the extension

#### Step 1: Clone the Repository

```bash
git clone https://github.com/trae-ai/obs-plugin-ai-assistant.git
cd obs-plugin-ai-assistant
```

#### Step 2: Install Dependencies

```bash
npm install
```

#### Step 3: Install VS Code Extension Manager (if not already installed)

```bash
npm install -g @vscode/vsce
```

#### Step 4: Compile the TypeScript Source

```bash
# Compile once
npm run compile

# Or watch for changes during development
npm run watch
```

#### Step 5: Package the Extension

```bash
# Create a .vsix package file
npm run package
```

This will create a `.vsix` file in the project root directory (e.g., `obs-plugin-ai-assistant-1.0.0.vsix`).

#### Step 6: Install the Extension

**Option A: Install via Command Line**
```bash
# Install the packaged extension
code --install-extension obs-plugin-ai-assistant-1.0.0.vsix
```

**Option B: Install via VS Code/Trae IDE**
1. Open VS Code or Trae IDE
2. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
3. Run command: `Extensions: Install from VSIX...`
4. Select the generated `.vsix` file
5. Restart the IDE when prompted

#### Step 7: Verify Installation

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type "OBS Plugin" - you should see the extension commands
3. Check the Extensions panel to confirm the extension is installed and enabled

### Method 3: Development Mode Installation

For development and testing purposes:

#### Step 1: Clone and Setup

```bash
git clone https://github.com/trae-ai/obs-plugin-ai-assistant.git
cd obs-plugin-ai-assistant
npm install
```

#### Step 2: Open in Development Mode

```bash
# Open the project in VS Code
code .

# Or open in Trae IDE
trae .
```

#### Step 3: Launch Extension Development Host

1. Press `F5` or go to `Run > Start Debugging`
2. This opens a new Extension Development Host window
3. The extension will be loaded and ready for testing

#### Step 4: Test the Extension

In the Extension Development Host window:
1. Open an OBS plugin project or create a new folder
2. Use Command Palette to test extension commands
3. Check the Debug Console for any errors or logs

### Troubleshooting Installation

#### Common Issues

**1. Node.js Version Mismatch**
```bash
# Check your Node.js version
node --version

# Should be 18.0.0 or higher
# If not, update Node.js from https://nodejs.org/
```

**2. Permission Issues (macOS/Linux)**
```bash
# If you get permission errors, try:
sudo npm install -g @vscode/vsce
```

**3. TypeScript Compilation Errors**
```bash
# Clean and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run compile
```

**4. Extension Not Loading**
```bash
# Check if the extension is properly installed
code --list-extensions | grep obs-plugin

# If not found, try reinstalling
code --uninstall-extension trae-ai.obs-plugin-ai-assistant
code --install-extension obs-plugin-ai-assistant-1.0.0.vsix
```

**5. VSIX Package Creation Fails**
```bash
# Ensure all dependencies are installed
npm install

# Check for TypeScript errors
npm run compile

# Try packaging again
npm run package
```

#### Build Scripts Reference

The following npm scripts are available:

| Script | Command | Description |
|--------|---------|-------------|
| `compile` | `npm run compile` | Compile TypeScript to JavaScript |
| `watch` | `npm run watch` | Watch for changes and auto-compile |
| `test` | `npm run test` | Run extension tests |
| `package` | `npm run package` | Create VSIX package for distribution |
| `lint` | `npm run lint` | Check code style and potential issues |
| `lint:fix` | `npm run lint:fix` | Auto-fix linting issues |

#### Development Dependencies

The extension requires these development dependencies:

- `@types/node`: Node.js type definitions
- `@types/vscode`: VS Code API type definitions  
- `@typescript-eslint/eslint-plugin`: TypeScript ESLint plugin
- `@typescript-eslint/parser`: TypeScript parser for ESLint
- `eslint`: JavaScript/TypeScript linter
- `typescript`: TypeScript compiler

#### Runtime Dependencies

The extension uses these runtime dependencies:

- `ajv`: JSON schema validation
- `chokidar`: File system watcher
- `glob`: File pattern matching
- `yaml`: YAML file parsing

## Quick Start

### 1. Initialize Configuration
```bash
# Open Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
# Run: "OBS Plugin: Configure CMake Build System"
```

### 2. Project Structure
Your OBS plugin project should follow this structure:
```
your-obs-plugin/
├── .obspluginrc.json          # Configuration file
├── CMakePresets.json          # CMake presets
├── CMakeLists.txt             # Main CMake file
├── src/                       # Source files
│   ├── plugin-main.cpp        # Plugin entry point
│   ├── MySource.hpp           # Header files (.hpp)
│   ├── MySource.cpp           # Implementation files
│   └── ui/                    # UI components directory
│       ├── SettingsWidget.hpp
│       └── SettingsWidget.cpp
├── build_macos/               # Build output (macOS)
└── .deps/                     # Dependencies
```

### 3. Configuration File (`.obspluginrc.json`)
```json
{
  "sdk_path": "/usr/local/obs-studio",
  "build_dir": "build_macos",
  "build_system": "cmake",
  "plugin_entry": "plugin-main.cpp",
  "platform_profiles": {
    "macos": {
      "preset": "macos",
      "config": "Debug",
      "generator": "Ninja"
    }
  },
  "coding_conventions": {
    "header_extension": ".hpp",
    "use_pragma_once": true,
    "ui_directory": "ui",
    "namespace": "obs_plugin"
  }
}
```

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `OBS Plugin: Configure CMake Build System` | - | Set up or modify build configuration |
| `OBS Plugin: Build Plugin with CMake Preset` | `Cmd+Shift+B` | Build the plugin using configured preset |
| `OBS Plugin: Clean Build Artifacts` | - | Clean build output directory |
| `OBS Plugin: Fix Build Errors with AI` | `Cmd+Shift+F` | Get AI assistance for build errors |
| `OBS Plugin: Initialize OBS Plugin Template` | - | Create new OBS source or UI component |
| `OBS Plugin: Show Plugin Configuration` | - | Display current configuration |
| `OBS Plugin: Auto-commit Changes` | - | Commit changes with automated message |

## Development Workflow

### 1. **Build Your Plugin**
```bash
# Use Command Palette or keyboard shortcut
Cmd+Shift+B (macOS) / Ctrl+Shift+B (Windows/Linux)
```

### 2. **Handle Build Errors**
When build errors occur:
1. The extension automatically parses error logs
2. Use `Cmd+Shift+F` to get AI-powered fix suggestions
3. Review and apply suggested patches
4. Rebuild to verify fixes

### 3. **Create New Components**
```bash
# Create OBS Source
Command: "OBS Plugin: Initialize OBS Plugin Template"
# Select: "OBS Source"
# Enter class name: "MyCustomSource"

# Create UI Component  
Command: "OBS Plugin: Initialize OBS Plugin Template"
# Select: "UI Component"
# Enter component name: "SettingsWidget"
```

### 4. **Validate Conventions**
The extension automatically validates:
- ✅ Header files use `.hpp` extension
- ✅ Files include `#pragma once`
- ✅ UI components are in `ui/` directory
- ✅ Qt6 MOC includes are present
- ✅ Proper namespace usage

## AI Context Injection & Automatic Prompt Enhancement

The extension provides intelligent AI assistance through automatic context injection and prompt enhancement. When you interact with AI assistants in Trae IDE, the extension automatically enriches your prompts with relevant OBS plugin development context.

### 🤖 **Automatic Context Enhancement**

The extension automatically detects when you're working with AI assistants and injects relevant context:

- **OBS API Knowledge**: Current OBS Studio API patterns and best practices
- **Build Configuration**: Your specific CMake and platform settings
- **Project Structure**: Understanding of your plugin's architecture
- **Error Context**: Detailed analysis of build failures and warnings
- **Convention Awareness**: Knowledge of OBS plugin coding standards
- **File Context**: Current file content and related dependencies
- **Build History**: Recent build results and error patterns

### 📋 **How to Enable AI Prompt Enhancement**

#### Step 1: Enable the Feature
1. Open VS Code/Trae IDE Settings (`Cmd+,` / `Ctrl+,`)
2. Search for "OBS Plugin"
3. Enable `obsPlugin.aiContextInjection` setting
4. Optionally configure `obsPlugin.aiPromptTemplate` for custom templates

#### Step 2: Configure Your Project
Ensure your project has a `.obspluginrc.json` configuration file:
```json
{
  "ai_features": {
    "context_injection": true,
    "auto_prompt_enhancement": true,
    "include_build_context": true,
    "include_error_context": true,
    "prompt_template": "obs_plugin_development"
  }
}
```

#### Step 3: Verify Setup
1. Open any file in your OBS plugin project
2. Start a conversation with an AI assistant in Trae IDE
3. Look for the context injection indicator in the AI chat
4. Check that OBS-specific context appears in your prompts

### 🎯 **When Context is Automatically Injected**

The extension automatically enhances your AI prompts when:

- **File Context**: You're working on `.cpp`, `.hpp`, or `.h` files in an OBS plugin project
- **Build Errors**: Recent build failures are detected
- **Configuration Changes**: You've modified `.obspluginrc.json` or `CMakePresets.json`
- **Template Generation**: You're creating new OBS sources or UI components
- **Convention Validation**: Code style or structure issues are found

### 📝 **Context Content Provided**

When active, the extension automatically includes:

#### Project Information
```
Project Type: OBS Studio Plugin
SDK Path: /usr/local/obs-studio
Build System: CMake with Presets
Platform: macOS (or detected platform)
```

#### Current Configuration
```
Build Configuration:
- Preset: macos-debug
- Generator: Ninja
- Output: build_macos/
- Dependencies: Qt6, OBS SDK
```

#### Coding Conventions
```
OBS Plugin Conventions:
- Header files: .hpp extension
- Use #pragma once
- UI components in ui/ directory
- Namespace: obs_plugin
```

#### Recent Build Context (if applicable)
```
Recent Build Status: Failed
Error Summary: Missing Qt6 MOC includes
Suggested Fix: Add Q_OBJECT macro and moc includes
```

### ⚙️ **Configuration Options**

Add these settings to your `.obspluginrc.json`:

```json
{
  "ai_features": {
    "context_injection": true,
    "auto_prompt_enhancement": true,
    "include_build_context": true,
    "include_error_context": true,
    "include_file_context": true,
    "max_context_length": 2000,
    "prompt_template": "obs_plugin_development",
    "custom_context": {
      "project_description": "Custom OBS source for video effects",
      "special_requirements": "Real-time processing, GPU acceleration"
    }
  }
}
```

#### Configuration Parameters

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `context_injection` | boolean | `true` | Enable/disable context injection |
| `auto_prompt_enhancement` | boolean | `true` | Automatically enhance AI prompts |
| `include_build_context` | boolean | `true` | Include recent build information |
| `include_error_context` | boolean | `true` | Include error analysis |
| `include_file_context` | boolean | `true` | Include current file context |
| `max_context_length` | number | `2000` | Maximum context characters |
| `prompt_template` | string | `"obs_plugin_development"` | Template for context formatting |

### 🔍 **Verifying Context Injection**

To confirm the feature is working:

1. **Check AI Chat Interface**: Look for a small "🔧 OBS Context" indicator
2. **Review Prompt Content**: Expanded prompts will show OBS-specific information
3. **Test with Build Errors**: Trigger a build error and ask for help
4. **Check Extension Logs**: Open Output panel → "OBS Plugin AI Assistant"

### 🛠 **Troubleshooting**

#### Context Not Appearing
```bash
# Check if feature is enabled
1. Verify obsPlugin.aiContextInjection is enabled in settings
2. Ensure .obspluginrc.json exists with ai_features configured
3. Confirm you're in an OBS plugin project directory
4. Restart Trae IDE after configuration changes
```

#### Context Too Long/Short
```json
// Adjust context length in .obspluginrc.json
{
  "ai_features": {
    "max_context_length": 1500,  // Reduce for shorter context
    "include_file_context": false  // Disable file content inclusion
  }
}
```

#### Custom Context Templates
```json
// Create custom context in .obspluginrc.json
{
  "ai_features": {
    "custom_context": {
      "project_type": "Real-time video filter",
      "performance_requirements": "60fps processing",
      "target_platforms": ["macOS", "Windows"],
      "special_notes": "Uses GPU acceleration with Metal/DirectX"
    }
  }
}
```

### 💡 **Best Practices**

1. **Keep Context Relevant**: Disable unnecessary context types for better performance
2. **Use Custom Context**: Add project-specific information for better AI responses
3. **Monitor Context Length**: Adjust `max_context_length` based on your AI model limits
4. **Regular Updates**: Keep your `.obspluginrc.json` updated with current project state
5. **Test Regularly**: Verify context injection after major project changes

## Platform Support

### macOS
```bash
# Build commands
cmake --preset macos
cmake --build --preset macos --config Debug
```

### Windows
```bash
# Build commands  
cmake --preset windows-x64
cmake --build --preset windows-x64 --config Debug
```

### Linux
```bash
# Build commands
cmake --preset linux
cmake --build --preset linux --config Debug
```

## Configuration Options

### Extension Settings
- `obsPlugin.autoDetectConfig`: Auto-detect `.obspluginrc.json` files
- `obsPlugin.autoCommit`: Auto-commit after successful builds
- `obsPlugin.aiContextInjection`: Enable AI context injection
- `obsPlugin.conventionValidation`: Validate coding conventions
- `obsPlugin.defaultPlatform`: Default build platform

### Build Configuration
Customize your build process in `.obspluginrc.json`:
- SDK paths and dependencies
- Platform-specific build settings
- Coding convention rules
- AI prompt templates
- Git commit settings

## Troubleshooting

### Common Issues

**1. Configuration Not Found**
```bash
# Solution: Initialize configuration
Command: "OBS Plugin: Configure CMake Build System"
```

**2. Build Fails**
```bash
# Solution: Use AI assistance
Command: "OBS Plugin: Fix Build Errors with AI"
```

**3. Convention Violations**
```bash
# Solution: Auto-fix common issues
# The extension will suggest fixes for:
# - Missing #pragma once
# - Wrong header extensions
# - Incorrect file locations
```

**4. CMake Preset Issues**
```bash
# Ensure CMakePresets.json exists with correct presets:
{
  "version": 3,
  "configurePresets": [
    {
      "name": "macos",
      "generator": "Ninja",
      "binaryDir": "build_macos"
    }
  ]
}
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Open in Trae IDE
4. Press F5 to launch extension development host

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📖 [OBS Studio Plugin Documentation](https://obsproject.com/docs/plugins/)
- 🐛 [Report Issues](https://github.com/trae-ai/obs-plugin-ai-assistant/issues)
- 💬 [Discussions](https://github.com/trae-ai/obs-plugin-ai-assistant/discussions)
- 📧 [Contact Support](mailto:support@trae.ai)

---

**Made with ❤️ by the Trae AI team**