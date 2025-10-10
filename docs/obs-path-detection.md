# OBS Studio 路径自动检测功能

## 概述

为了帮助 AI 工具准确理解 OBS plugin 开发环境，扩展现在支持自动检测系统中 OBS Studio 的安装路径，包括 lib 和 src 目录。这确保了 AI 在后续调用时能够参考正确的环境信息。

## 功能特性

### 1. 多平台支持

#### macOS
- `/Applications/OBS.app`
- `/Applications/OBS Studio.app`
- `/usr/local/obs-studio`
- Homebrew 安装路径：
  - `/usr/local/opt/obs-studio`
  - `/opt/homebrew/opt/obs-studio`
  - `/usr/local/Cellar/obs-studio`
  - `/opt/homebrew/Cellar/obs-studio`
- 用户目录下的应用程序

#### Windows
- `C:\Program Files\obs-studio`
- `C:\Program Files (x86)\obs-studio`
- `C:\Program Files\OBS Studio`
- `C:\Program Files (x86)\OBS Studio`
- 用户 AppData 目录

#### Linux
- `/usr/local/obs-studio`
- `/usr/obs-studio`
- `/opt/obs-studio`
- `/usr/local/share/obs`
- `/usr/share/obs`
- Snap 安装：`/snap/obs-studio/current`
- Flatpak 安装：`/var/lib/flatpak/app/com.obsproject.Studio`
- 包管理器安装路径

### 2. 环境变量检测

支持以下环境变量：
- `OBS_STUDIO_PATH`
- `OBS_SDK_PATH`
- `OBS_STUDIO_DIR`
- `OBS_ROOT`
- `LIBOBS_PATH`
- `LIBOBS_SDK_PATH`

### 3. 路径验证

自动验证检测到的路径是否包含必要的 OBS 文件：
- `include/obs/obs.h`
- `include/obs/obs-module.h`
- `include/obs` 目录
- `lib` 目录
- `UI/obs-frontend-api` 目录

### 4. 依赖组件检测

#### Qt6 检测
- 检测 Qt6 安装路径
- 验证 Qt6 核心组件
- 自动配置 Qt6 依赖路径

#### Frontend API 检测
- 定位 OBS frontend API
- 验证 API 头文件
- 配置 frontend API 路径

## 工作流程

### 1. 自动初始化
当扩展启动时，`ConfigManager.autoDetectAndInitialize()` 会：
1. 检查是否存在配置文件
2. 如果存在，加载并验证更新路径
3. 如果不存在且检测到 OBS 项目，生成带有检测路径的默认配置

### 2. 路径检测流程
1. **环境变量优先**：首先检查环境变量
2. **平台特定路径**：检查平台默认安装路径
3. **路径验证**：验证检测到的路径有效性
4. **依赖检测**：检测 Qt6 和 frontend API
5. **上下文生成**：为 AI 工具生成环境上下文

### 3. 配置更新
- 自动更新 `.obspluginrc.json` 中的路径
- 将检测到的路径信息添加到 AI 上下文
- 保存更新后的配置

## AI 上下文集成

检测到的路径信息会自动添加到 AI 配置的 `custom_context` 字段中：

```json
{
  "detected_obs_paths": {
    "include_paths": [
      "/Applications/OBS.app/Contents/Resources/include",
      "/Applications/OBS.app/Contents/Resources/include/obs"
    ],
    "library_paths": [
      "/Applications/OBS.app/Contents/Resources/lib"
    ],
    "obs_studio_path": "/Applications/OBS.app",
    "qt6_path": "/usr/local/qt6",
    "frontend_api_path": "/Applications/OBS.app/Contents/Resources/UI/obs-frontend-api"
  }
}
```

## 使用方法

### 自动检测
扩展会在以下情况自动执行路径检测：
1. 首次打开 OBS plugin 项目
2. 运行 `OBS: Configure` 命令
3. 运行 `OBS: Init Template` 命令

### 手动触发
可以通过以下方式手动触发路径检测：
1. 删除 `.obspluginrc.json` 文件
2. 重新运行 `OBS: Configure` 命令
3. 重启 VSCode/Trae

### 环境变量配置
如果自动检测不准确，可以设置环境变量：

```bash
# macOS/Linux
export OBS_STUDIO_PATH="/path/to/obs-studio"
export OBS_SDK_PATH="/path/to/obs-sdk"

# Windows
set OBS_STUDIO_PATH=C:\path\to\obs-studio
set OBS_SDK_PATH=C:\path\to\obs-sdk
```

## 日志和调试

检测过程会在 VSCode 输出面板的 "OBS Plugin Helper" 频道中记录详细日志：

```
[INFO] OBS Studio installation detection completed
[INFO] Found OBS Studio installation at: /Applications/OBS.app
[INFO] Found Qt6 installation at: /usr/local/qt6
[INFO] Added detected paths to AI context configuration
[INFO] Configuration updated with latest detected paths
```

## 故障排除

### 检测失败
如果自动检测失败：
1. 检查 OBS Studio 是否正确安装
2. 验证安装路径包含必要的头文件和库
3. 设置相应的环境变量
4. 查看输出日志了解具体错误

### 路径不正确
如果检测到的路径不正确：
1. 手动编辑 `.obspluginrc.json` 文件
2. 设置正确的环境变量
3. 重新运行配置命令

### AI 上下文问题
如果 AI 无法获取正确的环境信息：
1. 检查 `custom_context` 字段是否包含路径信息
2. 验证路径是否有效
3. 重新生成配置文件

## 技术实现

### 核心方法
- `detectObsStudioInstallation()`: 主检测方法
- `checkEnvironmentVariables()`: 环境变量检测
- `checkPlatformDefaultPaths()`: 平台特定路径检测
- `validateObsPath()`: 路径验证
- `createDefaultConfigWithDetection()`: 生成带检测路径的配置

### 检测策略
1. **优先级顺序**：环境变量 > 平台默认路径
2. **验证机制**：检查关键文件和目录存在性
3. **容错处理**：检测失败时回退到默认路径
4. **增量更新**：只更新检测到的有效路径

## 未来改进

1. **缓存机制**：缓存检测结果避免重复检测
2. **用户交互**：提供路径选择界面
3. **版本检测**：检测 OBS Studio 版本信息
4. **插件检测**：检测已安装的 OBS 插件
5. **构建工具链检测**：检测 CMake、编译器等工具