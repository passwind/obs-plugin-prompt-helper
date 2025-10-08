# GitHub Actions 工作流说明

## 📦 自动发布工作流 (release.yml)

这个工作流实现了通过 Git tag 自动打包和发布 VS Code 扩展的功能。

### 🚀 触发条件

当推送符合语义化版本的 tag 时自动触发，例如：
- `v1.0.0`
- `v2.1.3`
- `v1.0.0-beta.1` (会标记为预发布)

### 📋 工作流程

1. **环境准备**
   - 检出代码
   - 设置 Node.js 18 环境
   - 安装依赖

2. **代码质量检查**
   - 运行 ESLint 检查
   - 编译 TypeScript
   - 运行测试 (即使失败也会继续)

3. **打包扩展**
   - 安装 vsce 工具
   - 使用 `npm run package` 打包扩展
   - 验证生成的 .vsix 文件

4. **创建发布**
   - 生成发布说明
   - 创建 GitHub Release
   - 上传 .vsix 文件作为 Release Asset
   - 保存构建产物

### 🎯 使用方法

1. **确保版本号正确**
   ```bash
   # 更新 package.json 中的版本号
   npm version patch  # 或 minor, major
   ```

2. **创建并推送 tag**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **等待自动构建**
   - 工作流会自动运行
   - 在 GitHub Actions 页面查看进度
   - 构建完成后会自动创建 Release

### 📥 用户安装方式

发布完成后，用户可以通过以下方式安装：

1. **从 GitHub Releases 下载**
   - 访问项目的 Releases 页面
   - 下载对应版本的 `.vsix` 文件
   - 在 VS Code 中使用 "Extensions: Install from VSIX..." 命令安装

2. **命令行安装**
   ```bash
   code --install-extension obs-plugin-ai-assistant-1.0.0.vsix
   ```

### 🔧 配置要求

- 仓库需要有 `GITHUB_TOKEN` 权限 (默认提供)
- package.json 中需要有正确的扩展配置
- 需要安装 `@vscode/vsce` 依赖

### 🛠️ 故障排除

如果工作流失败，请检查：

1. **版本号格式**：确保 tag 符合 `v*.*.*` 格式
2. **依赖安装**：确保所有依赖都能正常安装
3. **编译错误**：检查 TypeScript 编译是否成功
4. **包配置**：确保 package.json 配置正确

### 📝 自定义配置

如需修改工作流，可以编辑 `.github/workflows/release.yml` 文件：

- 修改触发条件 (on.push.tags)
- 调整 Node.js 版本
- 添加额外的构建步骤
- 自定义发布说明模板