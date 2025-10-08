# Contributing to OBS Plugin AI Assistant

Thank you for your interest in contributing to the OBS Plugin AI Assistant! We welcome contributions from the community and are grateful for any help you can provide.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our commitment to creating a welcoming and inclusive environment. By participating, you are expected to uphold the following principles:

- **Be respectful**: Treat everyone with respect and kindness
- **Be inclusive**: Welcome newcomers and help them get started
- **Be collaborative**: Work together constructively
- **Be patient**: Help others learn and grow
- **Be constructive**: Provide helpful feedback and suggestions

## How to Contribute

There are many ways to contribute to this project:

### 🐛 Bug Reports
- Report bugs through GitHub Issues
- Include detailed reproduction steps
- Provide system information and logs

### 💡 Feature Requests
- Suggest new features or improvements
- Explain the use case and benefits
- Discuss implementation approaches

### 📝 Documentation
- Improve existing documentation
- Add examples and tutorials
- Fix typos and clarify instructions

### 🔧 Code Contributions
- Fix bugs and implement features
- Improve performance and code quality
- Add tests and improve coverage

### 🎨 Design and UX
- Improve user interface and experience
- Create icons and visual assets
- Enhance accessibility

## Development Setup

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18.0.0 or higher)
- **npm** (comes with Node.js)
- **Git** for version control
- **VS Code** (recommended IDE)
- **CMake** (for testing OBS plugin builds)

### Getting Started

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/obs-plugin-ai-assistant.git
   cd obs-plugin-ai-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run compile
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Start development**
   ```bash
   # Open in VS Code
   code .
   
   # Press F5 to launch Extension Development Host
   # This opens a new VS Code window with your extension loaded
   ```

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code following our coding standards
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   npm run compile
   npm test
   npm run lint
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and create a pull request**
   ```bash
   git push origin feature/your-feature-name
   ```

## Project Structure

```
obs-plugin-ai-assistant/
├── src/                          # Source code
│   ├── commands/                 # VS Code commands
│   │   └── ObsCommands.ts       # Main command implementations
│   ├── core/                    # Core functionality
│   │   ├── AIMiddleware.ts      # AI integration
│   │   ├── BuildExecutor.ts     # Build system execution
│   │   ├── CMakeCacheParser.ts  # CMake cache parsing
│   │   ├── ConfigManager.ts     # Configuration management
│   │   ├── LogParser.ts         # Log parsing utilities
│   │   ├── PatchGenerator.ts    # Code patch generation
│   │   └── TemplateManager.ts   # Template management
│   ├── types/                   # TypeScript type definitions
│   │   └── ObsConfig.ts         # Configuration types
│   ├── utils/                   # Utility functions
│   │   ├── Logger.ts            # Logging utilities
│   │   └── OutputChannelManager.ts # VS Code output management
│   ├── test/                    # Test files
│   │   ├── *.test.ts           # Unit tests
│   │   ├── runTests.ts         # Test runner
│   │   └── simpleTest.ts       # Basic tests
│   └── extension.ts             # Main extension entry point
├── templates/                   # Project templates
├── schemas/                     # JSON schemas
├── docs/                       # Documentation
├── .trae/                      # Trae AI configuration
├── package.json                # Package configuration
├── tsconfig.json               # TypeScript configuration
├── .eslintrc.json              # ESLint configuration
└── README.md                   # Project documentation
```

## Coding Standards

### TypeScript Guidelines

- **Use TypeScript**: All code should be written in TypeScript
- **Strict mode**: Enable strict type checking
- **Explicit types**: Prefer explicit type annotations
- **Interfaces**: Use interfaces for object shapes
- **Enums**: Use enums for constants

```typescript
// Good
interface BuildConfig {
  preset: string;
  target: string;
  verbose: boolean;
}

// Good
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}
```

### Code Style

- **Formatting**: Use Prettier for consistent formatting
- **Linting**: Follow ESLint rules
- **Naming**: Use camelCase for variables and functions, PascalCase for classes
- **Comments**: Write clear, concise comments for complex logic

```typescript
// Good
class BuildExecutor {
  private readonly logger: Logger;
  
  constructor(logger: Logger) {
    this.logger = logger;
  }
  
  /**
   * Executes a CMake build with the specified configuration
   * @param config Build configuration options
   * @returns Promise resolving to build result
   */
  async executeBuild(config: BuildConfig): Promise<BuildResult> {
    // Implementation here
  }
}
```

### File Organization

- **Single responsibility**: One class/interface per file
- **Barrel exports**: Use index.ts files for clean imports
- **Consistent naming**: Match file names to exported classes

### Error Handling

- **Use proper error types**: Create specific error classes
- **Graceful degradation**: Handle errors gracefully
- **User feedback**: Provide meaningful error messages

```typescript
// Good
class BuildError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number,
    public readonly stderr: string
  ) {
    super(message);
    this.name = 'BuildError';
  }
}
```

## Testing

### Test Structure

- **Unit tests**: Test individual functions and classes
- **Integration tests**: Test component interactions
- **E2E tests**: Test complete workflows

### Writing Tests

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { ConfigManager } from '../core/ConfigManager';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  
  beforeEach(() => {
    configManager = new ConfigManager();
  });
  
  it('should load default configuration', async () => {
    const config = await configManager.loadConfig();
    expect(config).toBeDefined();
    expect(config.preset).toBe('default');
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Pull Request Process

### Before Submitting

1. **Update documentation**: Ensure README and docs are current
2. **Add tests**: Include tests for new functionality
3. **Run quality checks**: Ensure all checks pass
   ```bash
   npm run compile
   npm test
   npm run lint
   ```
4. **Update CHANGELOG**: Add entry for your changes

### PR Guidelines

1. **Clear title**: Use descriptive titles
2. **Detailed description**: Explain what and why
3. **Link issues**: Reference related issues
4. **Small changes**: Keep PRs focused and manageable
5. **Clean history**: Use meaningful commit messages

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

Examples:
```
feat(build): add CMake preset validation
fix(parser): handle empty cache files correctly
docs(readme): update installation instructions
```

### Review Process

1. **Automated checks**: All CI checks must pass
2. **Code review**: At least one maintainer review required
3. **Testing**: Manual testing for significant changes
4. **Documentation**: Ensure docs are updated

## Issue Reporting

### Bug Reports

When reporting bugs, please include:

1. **Clear title**: Summarize the issue
2. **Environment**: OS, VS Code version, extension version
3. **Steps to reproduce**: Detailed reproduction steps
4. **Expected behavior**: What should happen
5. **Actual behavior**: What actually happens
6. **Screenshots/logs**: Visual evidence and error logs
7. **Additional context**: Any other relevant information

### Bug Report Template

```markdown
**Bug Description**
A clear description of the bug.

**Environment**
- OS: [e.g., Windows 10, macOS 12.0, Ubuntu 20.04]
- VS Code Version: [e.g., 1.74.0]
- Extension Version: [e.g., 1.0.0]
- Node.js Version: [e.g., 18.12.1]

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Screenshots/Logs**
Add screenshots or error logs if applicable.

**Additional Context**
Any other context about the problem.
```

## Feature Requests

### Suggesting Features

1. **Check existing issues**: Avoid duplicates
2. **Describe the problem**: What problem does this solve?
3. **Propose a solution**: How should it work?
4. **Consider alternatives**: What other approaches exist?
5. **Additional context**: Use cases, examples, mockups

### Feature Request Template

```markdown
**Feature Description**
A clear description of the feature you'd like to see.

**Problem Statement**
What problem does this feature solve?

**Proposed Solution**
How should this feature work?

**Alternatives Considered**
What other approaches have you considered?

**Use Cases**
Specific scenarios where this would be helpful.

**Additional Context**
Mockups, examples, or other relevant information.
```

## Documentation

### Documentation Standards

- **Clear and concise**: Write for your audience
- **Examples**: Include practical examples
- **Up-to-date**: Keep docs current with code changes
- **Accessible**: Use clear language and structure

### Types of Documentation

1. **API Documentation**: Code comments and type definitions
2. **User Guides**: How-to guides and tutorials
3. **Developer Docs**: Architecture and contribution guides
4. **Release Notes**: Change logs and migration guides

## Community

### Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Documentation**: Check existing docs first

### Staying Updated

- **Watch the repository**: Get notified of changes
- **Follow releases**: Stay current with new versions
- **Join discussions**: Participate in community conversations

## Recognition

We appreciate all contributions and will:

- **Credit contributors**: In release notes and documentation
- **Respond promptly**: To issues and pull requests
- **Provide feedback**: Constructive and helpful reviews
- **Celebrate contributions**: Recognize community efforts

## Questions?

If you have questions about contributing, please:

1. Check this guide and existing documentation
2. Search existing issues and discussions
3. Create a new discussion or issue
4. Reach out to maintainers

Thank you for contributing to OBS Plugin AI Assistant! 🚀

---

*This contributing guide is inspired by open source best practices and is continuously improved based on community feedback.*