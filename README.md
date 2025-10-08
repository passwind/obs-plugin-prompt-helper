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

1. Open Trae IDE
2. Go to Extensions marketplace
3. Search for "OBS Plugin AI Assistant"
4. Click Install

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

## AI Context Injection

The extension automatically provides AI assistants with relevant context:

- **OBS API Knowledge**: Current OBS Studio API patterns and best practices
- **Build Configuration**: Your specific CMake and platform settings
- **Project Structure**: Understanding of your plugin's architecture
- **Error Context**: Detailed analysis of build failures and warnings
- **Convention Awareness**: Knowledge of OBS plugin coding standards

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