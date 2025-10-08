# OBS Plugin AI Assistant Commands / OBS 插件 AI 助手命令

This document provides a comprehensive guide to all available commands in the OBS Plugin AI Assistant extension.

本文档提供了 OBS 插件 AI 助手扩展中所有可用命令的详细指南。

## Table of Contents / 目录

- [Core Commands / 核心命令](#core-commands--核心命令)
  - [obs.configure](#obsconfigure)
  - [obs.build](#obsbuild)
  - [obs.clean](#obsclean)
  - [obs.fix-error](#obsfix-error)
- [Development Commands / 开发命令](#development-commands--开发命令)
  - [obs.create-source](#obscreate-source)
  - [obs.create-ui-component](#obscreate-ui-component)
  - [obs.init-template](#obsinit-template)
- [Testing & Quality / 测试与质量](#testing--quality--测试与质量)
  - [obs.run-tests](#obsrun-tests)
  - [obs.validate-conventions](#obsvalidate-conventions)
- [AI Assistance / AI 辅助](#ai-assistance--ai-辅助)
  - [obs.ai-assist](#obsai-assist)
- [Configuration Management / 配置管理](#configuration-management--配置管理)
  - [obs.show-config](#obsshow-config)
  - [obs.reset-config](#obsreset-config)
- [Utilities / 实用工具](#utilities--实用工具)
  - [obs.show-logs](#obsshow-logs)
  - [obs.commit](#obscommit)

---

## Core Commands / 核心命令

### obs.configure

**English**: Configure OBS plugin project settings and environment.

**中文**: 配置 OBS 插件项目设置和环境。

#### Features / 功能
- **Auto-detection**: Automatically detects existing configuration files
- **Interactive setup**: Guided configuration process with validation
- **Multiple actions**: Edit, validate, reset, or view current settings
- **Default generation**: Creates default `.obspluginrc.json` if none exists

- **自动检测**: 自动检测现有配置文件
- **交互式设置**: 带验证的引导配置过程
- **多种操作**: 编辑、验证、重置或查看当前设置
- **默认生成**: 如果不存在则创建默认的 `.obspluginrc.json`

#### Usage / 使用方法
1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "OBS: Configure" / 输入 "OBS: Configure"
3. Select from available options / 从可用选项中选择:
   - Edit Configuration / 编辑配置
   - Validate Configuration / 验证配置
   - Reset to Default / 重置为默认
   - Show Current Settings / 显示当前设置

#### Prerequisites / 前提条件
- Active workspace folder / 活动的工作区文件夹
- Write permissions in workspace / 工作区写入权限

---

### obs.build

**English**: Build the OBS plugin with specified configuration.

**中文**: 使用指定配置构建 OBS 插件。

#### Features / 功能
- **Multiple build types**: Debug, Release, RelWithDebInfo
- **Progress tracking**: Real-time build progress with cancellation support
- **Error handling**: Automatic error detection and AI-assisted fixing
- **Auto-commit**: Optional automatic commit on successful build
- **CMake integration**: Full CMake build system support

- **多种构建类型**: Debug、Release、RelWithDebInfo
- **进度跟踪**: 实时构建进度，支持取消
- **错误处理**: 自动错误检测和 AI 辅助修复
- **自动提交**: 构建成功时可选的自动提交
- **CMake 集成**: 完整的 CMake 构建系统支持

#### Usage / 使用方法
1. Ensure project is configured (`obs.configure`)
2. Run "OBS: Build" command
3. Select build configuration (Debug/Release/RelWithDebInfo)
4. Monitor progress in notification area
5. Review build results in output panel

1. 确保项目已配置 (`obs.configure`)
2. 运行 "OBS: Build" 命令
3. 选择构建配置 (Debug/Release/RelWithDebInfo)
4. 在通知区域监控进度
5. 在输出面板中查看构建结果

#### Error Handling / 错误处理
- Automatic error collection and analysis
- AI-powered fix suggestions
- Integration with `obs.fix-error` command
- Detailed error logs in output channel

- 自动错误收集和分析
- AI 驱动的修复建议
- 与 `obs.fix-error` 命令集成
- 输出通道中的详细错误日志

---

### obs.clean

**English**: Clean build artifacts and temporary files.

**中文**: 清理构建产物和临时文件。

#### Features / 功能
- **Complete cleanup**: Removes all build artifacts
- **Platform-aware**: Uses appropriate platform profile
- **Progress indication**: Visual progress feedback
- **Error reporting**: Detailed cleanup status

- **完整清理**: 删除所有构建产物
- **平台感知**: 使用适当的平台配置
- **进度指示**: 可视化进度反馈
- **错误报告**: 详细的清理状态

#### Usage / 使用方法
1. Run "OBS: Clean" command
2. Wait for cleanup completion
3. Check output for any issues

1. 运行 "OBS: Clean" 命令
2. 等待清理完成
3. 检查输出是否有问题

---

### obs.fix-error

**English**: Analyze and fix build errors using AI assistance.

**中文**: 使用 AI 辅助分析和修复构建错误。

#### Features / 功能
- **AI-powered analysis**: Intelligent error pattern recognition
- **Contextual suggestions**: Fixes tailored to your specific codebase
- **Interactive display**: Results shown in markdown format
- **Build integration**: Automatically triggered after failed builds

- **AI 驱动分析**: 智能错误模式识别
- **上下文建议**: 针对特定代码库的修复方案
- **交互式显示**: 以 markdown 格式显示结果
- **构建集成**: 构建失败后自动触发

#### Usage / 使用方法
1. Run after a failed build (automatic prompt)
2. Or manually execute "OBS: Fix Error"
3. Review AI suggestions in the opened document
4. Apply suggested fixes to your code

1. 在构建失败后运行（自动提示）
2. 或手动执行 "OBS: Fix Error"
3. 在打开的文档中查看 AI 建议
4. 将建议的修复应用到代码中

---

## Development Commands / 开发命令

### obs.create-source

**English**: Generate a new OBS source plugin with boilerplate code.

**中文**: 生成带有样板代码的新 OBS 源插件。

#### Features / 功能
- **Template generation**: Complete source plugin template
- **Naming validation**: Ensures proper C++ class naming conventions
- **File creation**: Generates both header (.h) and source (.cpp) files
- **Auto-open**: Opens created files in editor
- **Configuration integration**: Uses project-specific settings

- **模板生成**: 完整的源插件模板
- **命名验证**: 确保正确的 C++ 类命名约定
- **文件创建**: 生成头文件 (.h) 和源文件 (.cpp)
- **自动打开**: 在编辑器中打开创建的文件
- **配置集成**: 使用项目特定设置

#### Usage / 使用方法
1. Run "OBS: Create Source"
2. Enter class name (e.g., "MyCustomSource")
3. Files are generated and opened automatically

1. 运行 "OBS: Create Source"
2. 输入类名（例如："MyCustomSource"）
3. 文件自动生成并打开

#### Naming Rules / 命名规则
- Must start with uppercase letter / 必须以大写字母开头
- Only alphanumeric characters allowed / 只允许字母数字字符
- No spaces or special characters / 不允许空格或特殊字符

---

### obs.create-ui-component

**English**: Generate a new UI component for OBS plugin interface.

**中文**: 为 OBS 插件界面生成新的 UI 组件。

#### Features / 功能
- **UI template generation**: Complete UI component boilerplate
- **Qt integration**: Proper Qt widget structure
- **Event handling**: Basic event handling setup
- **Styling support**: CSS/QSS styling integration

- **UI 模板生成**: 完整的 UI 组件样板
- **Qt 集成**: 正确的 Qt 小部件结构
- **事件处理**: 基本事件处理设置
- **样式支持**: CSS/QSS 样式集成

#### Usage / 使用方法
1. Run "OBS: Create UI Component"
2. Enter component name (e.g., "SettingsWidget")
3. Review generated files and customize as needed

1. 运行 "OBS: Create UI Component"
2. 输入组件名称（例如："SettingsWidget"）
3. 查看生成的文件并根据需要自定义

---

### obs.init-template

**English**: Initialize a complete OBS plugin project template.

**中文**: 初始化完整的 OBS 插件项目模板。

#### Features / 功能
- **Project scaffolding**: Complete project structure
- **Configuration setup**: Default configuration files
- **Build system**: CMake integration
- **Documentation**: Basic README and documentation

- **项目脚手架**: 完整的项目结构
- **配置设置**: 默认配置文件
- **构建系统**: CMake 集成
- **文档**: 基本的 README 和文档

#### Usage / 使用方法
1. Open empty workspace folder
2. Run "OBS: Initialize Template"
3. Wait for template generation
4. Review created files and structure

1. 打开空的工作区文件夹
2. 运行 "OBS: Initialize Template"
3. 等待模板生成
4. 查看创建的文件和结构

---

## Testing & Quality / 测试与质量

### obs.run-tests

**English**: Execute plugin tests and validation.

**中文**: 执行插件测试和验证。

#### Features / 功能
- **Automated testing**: Runs complete test suite
- **Build integration**: Builds project before testing
- **Progress tracking**: Real-time test execution progress
- **Result reporting**: Detailed test results and coverage

- **自动化测试**: 运行完整的测试套件
- **构建集成**: 测试前构建项目
- **进度跟踪**: 实时测试执行进度
- **结果报告**: 详细的测试结果和覆盖率

#### Usage / 使用方法
1. Ensure project is configured and buildable
2. Run "OBS: Run Tests"
3. Monitor progress in notification
4. Review results in output panel

1. 确保项目已配置且可构建
2. 运行 "OBS: Run Tests"
3. 在通知中监控进度
4. 在输出面板中查看结果

---

### obs.validate-conventions

**English**: Validate code against OBS plugin conventions and best practices.

**中文**: 根据 OBS 插件约定和最佳实践验证代码。

#### Features / 功能
- **Convention checking**: Validates naming conventions
- **Code style**: Checks formatting and style guidelines
- **Best practices**: Identifies potential improvements
- **Automated scanning**: Scans entire project structure

- **约定检查**: 验证命名约定
- **代码风格**: 检查格式和风格指南
- **最佳实践**: 识别潜在改进
- **自动扫描**: 扫描整个项目结构

#### Usage / 使用方法
1. Run "OBS: Validate Conventions"
2. Wait for scanning completion
3. Review validation results
4. Apply suggested improvements

1. 运行 "OBS: Validate Conventions"
2. 等待扫描完成
3. 查看验证结果
4. 应用建议的改进

---

## AI Assistance / AI 辅助

### obs.ai-assist

**English**: Get AI-powered assistance for OBS plugin development.

**中文**: 获得 AI 驱动的 OBS 插件开发辅助。

#### Features / 功能
- **Multiple assistance types**: General help, code review, optimization, debugging, API usage
- **Interactive Q&A**: Ask specific questions about your code
- **Contextual responses**: Answers tailored to your project
- **Documentation format**: Results displayed in readable markdown

- **多种辅助类型**: 一般帮助、代码审查、优化、调试、API 使用
- **交互式问答**: 询问关于代码的具体问题
- **上下文响应**: 针对项目的定制答案
- **文档格式**: 以可读的 markdown 格式显示结果

#### Assistance Types / 辅助类型
1. **General OBS Plugin Help** / 一般 OBS 插件帮助
2. **Code Review** / 代码审查
3. **Performance Optimization** / 性能优化
4. **Debugging Assistance** / 调试辅助
5. **API Usage Questions** / API 使用问题

#### Usage / 使用方法
1. Run "OBS: AI Assist"
2. Select assistance type
3. Enter your question or describe the issue
4. Review AI response in opened document

1. 运行 "OBS: AI Assist"
2. 选择辅助类型
3. 输入问题或描述问题
4. 在打开的文档中查看 AI 响应

---

## Configuration Management / 配置管理

### obs.show-config

**English**: Display current OBS plugin configuration.

**中文**: 显示当前 OBS 插件配置。

#### Features / 功能
- **JSON format**: Configuration displayed in readable JSON
- **Complete settings**: Shows all configuration parameters
- **Validation status**: Indicates configuration validity
- **Easy editing**: Direct access to configuration file

- **JSON 格式**: 以可读的 JSON 格式显示配置
- **完整设置**: 显示所有配置参数
- **验证状态**: 指示配置有效性
- **便于编辑**: 直接访问配置文件

#### Usage / 使用方法
1. Run "OBS: Show Config"
2. Review configuration in opened document
3. Edit directly or use `obs.configure` for guided editing

1. 运行 "OBS: Show Config"
2. 在打开的文档中查看配置
3. 直接编辑或使用 `obs.configure` 进行引导编辑

---

### obs.reset-config

**English**: Reset configuration to default values.

**中文**: 将配置重置为默认值。

#### Features / 功能
- **Confirmation prompt**: Prevents accidental resets
- **Default restoration**: Restores factory default settings
- **Backup preservation**: Original settings can be manually backed up
- **Immediate effect**: Changes take effect immediately

- **确认提示**: 防止意外重置
- **默认恢复**: 恢复出厂默认设置
- **备份保留**: 可以手动备份原始设置
- **立即生效**: 更改立即生效

#### Usage / 使用方法
1. Run "OBS: Reset Config"
2. Confirm reset action
3. Configuration is restored to defaults

1. 运行 "OBS: Reset Config"
2. 确认重置操作
3. 配置恢复为默认值

⚠️ **Warning / 警告**: This action will overwrite current settings. Consider backing up your configuration first.

此操作将覆盖当前设置。请考虑先备份配置。

---

## Utilities / 实用工具

### obs.show-logs

**English**: Display extension logs and debugging information.

**中文**: 显示扩展日志和调试信息。

#### Features / 功能
- **Comprehensive logging**: All extension activities logged
- **Error tracking**: Detailed error information
- **Debug information**: Development and troubleshooting data
- **Real-time updates**: Live log streaming

- **全面日志记录**: 记录所有扩展活动
- **错误跟踪**: 详细的错误信息
- **调试信息**: 开发和故障排除数据
- **实时更新**: 实时日志流

#### Usage / 使用方法
1. Run "OBS: Show Logs"
2. Review logs in output panel
3. Use for troubleshooting and debugging

1. 运行 "OBS: Show Logs"
2. 在输出面板中查看日志
3. 用于故障排除和调试

---

### obs.commit

**English**: Auto-commit changes with AI-generated commit messages.

**中文**: 使用 AI 生成的提交消息自动提交更改。

#### Features / 功能
- **Intelligent commits**: AI analyzes changes for meaningful commit messages
- **Auto-commit integration**: Can be triggered automatically after successful builds
- **Change analysis**: Reviews modifications before committing
- **Git integration**: Full Git workflow support

- **智能提交**: AI 分析更改以生成有意义的提交消息
- **自动提交集成**: 可在成功构建后自动触发
- **更改分析**: 提交前审查修改
- **Git 集成**: 完整的 Git 工作流支持

#### Usage / 使用方法
1. Make changes to your code
2. Run "OBS: Commit" or enable auto-commit
3. Review generated commit message
4. Confirm or modify before committing

1. 对代码进行更改
2. 运行 "OBS: Commit" 或启用自动提交
3. 查看生成的提交消息
4. 确认或修改后提交

#### Configuration / 配置
Enable auto-commit in `.obspluginrc.json`:
```json
{
  "auto_features": {
    "auto_commit_on_success": true
  }
}
```

在 `.obspluginrc.json` 中启用自动提交：
```json
{
  "auto_features": {
    "auto_commit_on_success": true
  }
}
```

---

## Command Palette Access / 命令面板访问

All commands are accessible through the VS Code Command Palette:

所有命令都可以通过 VS Code 命令面板访问：

1. **Open Command Palette** / 打开命令面板:
   - Windows/Linux: `Ctrl+Shift+P`
   - macOS: `Cmd+Shift+P`

2. **Type command prefix** / 输入命令前缀: `OBS:`

3. **Select desired command** / 选择所需命令

## Keyboard Shortcuts / 键盘快捷键

Currently, no default keyboard shortcuts are assigned. You can create custom shortcuts in VS Code:

目前没有分配默认键盘快捷键。您可以在 VS Code 中创建自定义快捷键：

1. Open Keyboard Shortcuts (`Ctrl+K Ctrl+S` / `Cmd+K Cmd+S`)
2. Search for "obs." commands
3. Assign your preferred key combinations

1. 打开键盘快捷键 (`Ctrl+K Ctrl+S` / `Cmd+K Cmd+S`)
2. 搜索 "obs." 命令
3. 分配您喜欢的按键组合

## Troubleshooting / 故障排除

### Common Issues / 常见问题

1. **"No workspace folder found"** / "未找到工作区文件夹"
   - Ensure you have opened a folder in VS Code
   - 确保在 VS Code 中打开了文件夹

2. **"No OBS plugin configuration found"** / "未找到 OBS 插件配置"
   - Run `obs.configure` to create configuration
   - 运行 `obs.configure` 创建配置

3. **Build failures** / 构建失败
   - Check `obs.show-logs` for detailed error information
   - Use `obs.fix-error` for AI assistance
   - 检查 `obs.show-logs` 获取详细错误信息
   - 使用 `obs.fix-error` 获取 AI 辅助

4. **Permission errors** / 权限错误
   - Ensure write permissions in workspace directory
   - 确保工作区目录有写入权限

### Getting Help / 获取帮助

- Use `obs.ai-assist` for specific questions
- Check `obs.show-logs` for error details
- Review configuration with `obs.show-config`

- 使用 `obs.ai-assist` 询问具体问题
- 检查 `obs.show-logs` 获取错误详情
- 使用 `obs.show-config` 查看配置

---

## Version Information / 版本信息

This documentation is for OBS Plugin AI Assistant v1.0.0.

本文档适用于 OBS 插件 AI 助手 v1.0.0。

For the latest updates and features, please check the [CHANGELOG](../CHANGELOG.md).

有关最新更新和功能，请查看 [CHANGELOG](../CHANGELOG.md)。