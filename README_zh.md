# OBS 插件 AI 助手

一个智能的 Trae IDE 扩展，为 OBS Studio 插件开发提供 AI 驱动的辅助功能。该扩展通过自动化构建管理、错误分析和代码生成功能简化开发工作流程。

## 功能特性

### 🚀 **自动化构建管理**
- **CMake 预设集成**：与 CMake 预设无缝集成，支持跨平台构建
- **实时构建输出**：实时流式传输构建进度和结果
- **平台特定配置**：支持 macOS、Windows 和 Linux 构建配置文件
- **一键构建操作**：通过简单命令进行配置、构建和清理

### 🤖 **AI 驱动开发**
- **上下文感知 AI 辅助**：自动将 OBS 插件开发上下文注入 AI 提示
- **智能错误分析**：AI 驱动的构建错误解析和分析
- **智能修复建议**：为常见 OBS 插件问题提供针对性解决方案
- **代码生成**：使用最佳实践生成 OBS 源模板和 UI 组件

### 🔧 **约定验证**
- **编码标准强制执行**：验证 OBS 插件编码约定
- **头文件管理**：确保正确使用 `.hpp` 和 `#pragma once` 指令
- **UI 组件结构**：验证 UI 组件放置在正确的 `ui/` 目录中
- **MOC 集成**：自动验证 Qt6 MOC 包含

### 📁 **项目管理**
- **自动检测**：自动检测 OBS 插件项目
- **配置管理**：集中式 `.obspluginrc.json` 配置
- **模板生成**：快速搭建新的 OBS 源和 UI 组件
- **Git 集成**：成功构建后自动提交并使用英文注释

## 安装

### 方法一：从扩展市场安装（推荐）

1. 打开 Trae IDE
2. 进入扩展市场
3. 搜索 "OBS Plugin AI Assistant"
4. 点击安装

### 方法二：从源码构建并安装

#### 前置要求

- **Node.js**：版本 18.0.0 或更高
- **npm**：随 Node.js 一起安装
- **Git**：用于克隆仓库
- **VS Code 扩展管理器 (vsce)**：用于打包扩展

#### 步骤 1：克隆仓库

```bash
git clone https://github.com/trae-ai/obs-plugin-ai-assistant.git
cd obs-plugin-ai-assistant
```

#### 步骤 2：安装依赖

```bash
npm install
```

#### 步骤 3：安装 VS Code 扩展管理器（如果尚未安装）

```bash
npm install -g @vscode/vsce
```

#### 步骤 4：编译 TypeScript 源码

```bash
# 编译一次
npm run compile

# 或者监听变化并自动编译（开发时使用）
npm run watch
```

#### 步骤 5：打包扩展

```bash
# 创建 .vsix 包文件
npm run package
```

这将在项目根目录创建一个 `.vsix` 文件（例如 `obs-plugin-ai-assistant-1.0.0.vsix`）。

#### 步骤 6：安装扩展

**选项 A：通过命令行安装**
```bash
# 安装打包的扩展
code --install-extension obs-plugin-ai-assistant-1.0.0.vsix
```

**选项 B：通过 VS Code/Trae IDE 安装**
1. 打开 VS Code 或 Trae IDE
2. 打开命令面板（`Cmd+Shift+P` / `Ctrl+Shift+P`）
3. 运行命令：`Extensions: Install from VSIX...`
4. 选择生成的 `.vsix` 文件
5. 在提示时重启 IDE

#### 步骤 7：验证安装

1. 打开命令面板（`Cmd+Shift+P` / `Ctrl+Shift+P`）
2. 输入 "OBS Plugin" - 您应该能看到扩展命令
3. 检查扩展面板以确认扩展已安装并启用

### 方法三：开发模式安装

用于开发和测试目的：

#### 步骤 1：克隆并设置

```bash
git clone https://github.com/trae-ai/obs-plugin-ai-assistant.git
cd obs-plugin-ai-assistant
npm install
```

#### 步骤 2：在开发模式下打开

```bash
# 在 VS Code 中打开项目
code .

# 或在 Trae IDE 中打开
trae .
```

#### 步骤 3：启动扩展开发主机

1. 按 `F5` 或转到 `运行 > 开始调试`
2. 这将打开一个新的扩展开发主机窗口
3. 扩展将被加载并准备好进行测试

#### 步骤 4：测试扩展

在扩展开发主机窗口中：
1. 打开一个 OBS 插件项目或创建新文件夹
2. 使用命令面板测试扩展命令
3. 检查调试控制台是否有错误或日志

### 安装故障排除

#### 常见问题

**1. Node.js 版本不匹配**
```bash
# 检查您的 Node.js 版本
node --version

# 应该是 18.0.0 或更高版本
# 如果不是，请从 https://nodejs.org/ 更新 Node.js
```

**2. 权限问题（macOS/Linux）**
```bash
# 如果遇到权限错误，请尝试：
sudo npm install -g @vscode/vsce
```

**3. TypeScript 编译错误**
```bash
# 清理并重新安装依赖
rm -rf node_modules package-lock.json
npm install
npm run compile
```

**4. 扩展未加载**
```bash
# 检查扩展是否正确安装
code --list-extensions | grep obs-plugin

# 如果未找到，尝试重新安装
code --uninstall-extension trae-ai.obs-plugin-ai-assistant
code --install-extension obs-plugin-ai-assistant-1.0.0.vsix
```

**5. VSIX 包创建失败**
```bash
# 确保所有依赖都已安装
npm install

# 检查 TypeScript 错误
npm run compile

# 重新尝试打包
npm run package
```

#### 构建脚本参考

可用的 npm 脚本：

| 脚本 | 命令 | 描述 |
|------|------|------|
| `compile` | `npm run compile` | 将 TypeScript 编译为 JavaScript |
| `watch` | `npm run watch` | 监听变化并自动编译 |
| `test` | `npm run test` | 运行扩展测试 |
| `package` | `npm run package` | 创建用于分发的 VSIX 包 |
| `lint` | `npm run lint` | 检查代码风格和潜在问题 |
| `lint:fix` | `npm run lint:fix` | 自动修复 linting 问题 |

#### 开发依赖

扩展需要这些开发依赖：

- `@types/node`：Node.js 类型定义
- `@types/vscode`：VS Code API 类型定义
- `@typescript-eslint/eslint-plugin`：TypeScript ESLint 插件
- `@typescript-eslint/parser`：ESLint 的 TypeScript 解析器
- `eslint`：JavaScript/TypeScript 代码检查工具
- `typescript`：TypeScript 编译器

#### 运行时依赖

扩展使用这些运行时依赖：

- `ajv`：JSON schema 验证
- `chokidar`：文件系统监听器
- `glob`：文件模式匹配
- `yaml`：YAML 文件解析

## 快速开始

### 1. 初始化配置
```bash
# 打开命令面板 (Cmd+Shift+P / Ctrl+Shift+P)
# 运行: "OBS Plugin: Configure CMake Build System"
```

### 2. 项目结构
您的 OBS 插件项目应遵循以下结构：
```
your-obs-plugin/
├── .obspluginrc.json          # 配置文件
├── CMakePresets.json          # CMake 预设
├── CMakeLists.txt             # 主 CMake 文件
├── src/                       # 源文件
│   ├── plugin-main.cpp        # 插件入口点
│   ├── MySource.hpp           # 头文件 (.hpp)
│   ├── MySource.cpp           # 实现文件
│   └── ui/                    # UI 组件目录
│       ├── SettingsWidget.hpp
│       └── SettingsWidget.cpp
├── build_macos/               # 构建输出 (macOS)
└── .deps/                     # 依赖项
```

### 3. 配置文件 (`.obspluginrc.json`)
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

## 命令

| 命令 | 快捷键 | 描述 |
|------|--------|------|
| `OBS Plugin: Configure CMake Build System` | - | 设置或修改构建配置 |
| `OBS Plugin: Build Plugin with CMake Preset` | `Cmd+Shift+B` | 使用配置的预设构建插件 |
| `OBS Plugin: Clean Build Artifacts` | - | 清理构建输出目录 |
| `OBS Plugin: Fix Build Errors with AI` | `Cmd+Shift+F` | 获取构建错误的 AI 辅助 |
| `OBS Plugin: Initialize OBS Plugin Template` | - | 创建新的 OBS 源或 UI 组件 |
| `OBS Plugin: Show Plugin Configuration` | - | 显示当前配置 |
| `OBS Plugin: Auto-commit Changes` | - | 使用自动化消息提交更改 |

## 开发工作流程

### 1. **构建插件**
```bash
# 使用命令面板或键盘快捷键
Cmd+Shift+B (macOS) / Ctrl+Shift+B (Windows/Linux)
```

### 2. **处理构建错误**
当出现构建错误时：
1. 扩展自动解析错误日志
2. 使用 `Cmd+Shift+F` 获取 AI 驱动的修复建议
3. 审查并应用建议的补丁
4. 重新构建以验证修复

### 3. **创建新组件**
```bash
# 创建 OBS 源
命令: "OBS Plugin: Initialize OBS Plugin Template"
# 选择: "OBS Source"
# 输入类名: "MyCustomSource"

# 创建 UI 组件
命令: "OBS Plugin: Initialize OBS Plugin Template"
# 选择: "UI Component"
# 输入组件名: "SettingsWidget"
```

### 4. **验证约定**
扩展自动验证：
- ✅ 头文件使用 `.hpp` 扩展名
- ✅ 文件包含 `#pragma once`
- ✅ UI 组件在 `ui/` 目录中
- ✅ 存在 Qt6 MOC 包含
- ✅ 正确的命名空间使用

## AI 上下文注入

扩展自动为 AI 助手提供相关上下文：

- **OBS API 知识**：当前 OBS Studio API 模式和最佳实践
- **构建配置**：您的特定 CMake 和平台设置
- **项目结构**：对插件架构的理解
- **错误上下文**：构建失败和警告的详细分析
- **约定意识**：OBS 插件编码标准的知识

## 平台支持

### macOS
```bash
# 构建命令
cmake --preset macos
cmake --build --preset macos --config Debug
```

### Windows
```bash
# 构建命令
cmake --preset windows-x64
cmake --build --preset windows-x64 --config Debug
```

### Linux
```bash
# 构建命令
cmake --preset linux
cmake --build --preset linux --config Debug
```

## 配置选项

### 扩展设置
- `obsPlugin.autoDetectConfig`: 自动检测 `.obspluginrc.json` 文件
- `obsPlugin.autoCommit`: 成功构建后自动提交
- `obsPlugin.aiContextInjection`: 启用 AI 上下文注入
- `obsPlugin.conventionValidation`: 验证编码约定
- `obsPlugin.defaultPlatform`: 默认构建平台

### 构建配置
在 `.obspluginrc.json` 中自定义构建过程：
- SDK 路径和依赖项
- 平台特定的构建设置
- 编码约定规则
- AI 提示模板
- Git 提交设置

## 故障排除

### 常见问题

**1. 找不到配置**
```bash
# 解决方案：初始化配置
命令: "OBS Plugin: Configure CMake Build System"
```

**2. 构建失败**
```bash
# 解决方案：使用 AI 辅助
命令: "OBS Plugin: Fix Build Errors with AI"
```

**3. 约定违规**
```bash
# 解决方案：自动修复常见问题
# 扩展将为以下问题建议修复：
# - 缺少 #pragma once
# - 错误的头文件扩展名
# - 不正确的文件位置
```

**4. CMake 预设问题**
```bash
# 确保 CMakePresets.json 存在并包含正确的预设：
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

## 贡献

我们欢迎贡献！请查看我们的[贡献指南](CONTRIBUTING.md)了解详情。

### 开发设置
1. 克隆仓库
2. 安装依赖项：`npm install`
3. 在 Trae IDE 中打开
4. 按 F5 启动扩展开发主机

## 许可证

MIT 许可证 - 详情请参见 [LICENSE](LICENSE) 文件。

## 支持

- 📖 [OBS Studio 插件文档](https://obsproject.com/docs/plugins/)
- 🐛 [报告问题](https://github.com/trae-ai/obs-plugin-ai-assistant/issues)
- 💬 [讨论](https://github.com/trae-ai/obs-plugin-ai-assistant/discussions)
- 📧 [联系支持](mailto:support@trae.ai)

---

**由 Trae AI 团队用 ❤️ 制作**