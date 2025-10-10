# SDK 路径配置问题修复

## 问题描述

用户报告在执行 `init template` 命令后，虽然配置文件已安装到目标工程根目录，但在终端执行 `cmake` 时，SDK 和其他配置目录没有被正确更新。

## 根本原因分析

通过深入分析代码，发现了以下关键问题：

### 1. 缺失 CMakePresets.json 文件
- `init template` 命令只生成了 `.obspluginrc.json` 配置文件
- 没有生成对应的 `CMakePresets.json` 文件
- CMake 需要 `CMakePresets.json` 来正确读取和使用 SDK 路径

### 2. SDK 路径传递机制不完整
- `.obspluginrc.json` 中定义了 SDK 路径，但没有传递给 CMake
- CMake 配置过程无法获取到正确的依赖项路径
- 缺少将配置文件中的路径映射到 CMake 变量的机制

### 3. 平台配置文件结构不匹配
- 原始模板中的平台配置结构与 ConfigManager 期望的结构不一致
- 缺少必要的 `configure_command` 和 `build_command` 字段

## 修复方案

### 1. 添加 CMakePresets.json 模板生成

在 `TemplateManager.ts` 中添加了新的方法：

```typescript
public async generateCMakePresets(projectRoot: string, config: ObsConfig): Promise<string>
```

该方法生成包含以下关键配置的 CMakePresets.json：

- **CMAKE_PREFIX_PATH**: 包含 Qt6 和 OBS Studio 路径
- **OBS_STUDIO_DIR**: 明确指定 OBS Studio SDK 路径
- **Qt6_DIR**: 指定 Qt6 CMake 配置路径
- **obs-frontend-api_DIR**: 指定 OBS Frontend API 路径

### 2. 更新 initTemplate 命令

修改了 `ObsCommands.ts` 中的 `initTemplate` 方法：

1. 生成 `.obspluginrc.json`
2. 加载配置文件
3. 使用配置信息生成 `CMakePresets.json`
4. 确保 SDK 路径正确传递

### 3. 修正配置文件模板结构

更新了 `.obspluginrc.json` 模板，确保包含：

- 正确的平台配置文件结构
- 完整的 `configure_command` 和 `build_command`
- 标准化的依赖项路径配置

## 修复后的工作流程

1. **执行 `init template`**:
   - 生成 `.obspluginrc.json` 配置文件
   - 生成 `CMakePresets.json` 预设文件
   - SDK 路径正确映射到 CMake 变量

2. **执行 `cmake --preset <platform>`**:
   - CMake 读取 `CMakePresets.json`
   - 自动设置 SDK 路径和依赖项路径
   - 正确配置构建环境

3. **依赖项路径验证**:
   - 构建成功后自动验证依赖项路径
   - 更新运行时依赖项信息
   - 确保路径一致性

## 关键改进

### CMakePresets.json 模板示例

```json
{
  "version": 3,
  "configurePresets": [
    {
      "name": "macos",
      "generator": "Ninja",
      "binaryDir": "build_macos",
      "cacheVariables": {
        "CMAKE_PREFIX_PATH": ".deps/qt6;.deps/obs-studio",
        "OBS_STUDIO_DIR": ".deps/obs-studio",
        "Qt6_DIR": ".deps/qt6/lib/cmake/Qt6",
        "obs-frontend-api_DIR": ".deps/obs-studio/UI/obs-frontend-api"
      }
    }
  ]
}
```

### 路径映射机制

- **配置文件路径** → **CMake 变量**
- `sdk_path` → `OBS_STUDIO_DIR`
- `dependencies.qt6` → `Qt6_DIR`
- `dependencies.obs` → `CMAKE_PREFIX_PATH`
- `dependencies.frontend_api` → `obs-frontend-api_DIR`

## 验证方法

1. 执行 `init template` 命令
2. 检查生成的文件：
   - `.obspluginrc.json`
   - `CMakePresets.json`
3. 运行 `cmake --preset macos`
4. 验证 SDK 路径是否正确设置
5. 检查 `CMakeCache.txt` 中的依赖项路径

## 预期效果

修复后，用户执行 `init template` 和后续的 `cmake` 命令时：

- SDK 路径将正确传递给 CMake
- 依赖项路径将被正确解析
- 构建配置将包含所有必要的路径信息
- 不再出现 SDK 路径未更新的问题