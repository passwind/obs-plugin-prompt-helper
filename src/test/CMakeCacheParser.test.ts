import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CMakeCacheParser, CMakeDependencyInfo, CacheValidationResult } from '../core/CMakeCacheParser';

/**
 * Test suite for CMakeCacheParser
 * Tests the parsing and validation of CMakeCache.txt files
 */
suite('CMakeCacheParser Tests', () => {
    let parser: CMakeCacheParser;
    let tempDir: string;

    setup(() => {
        parser = new CMakeCacheParser();
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmake-cache-test-'));
    });

    teardown(() => {
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    test('should parse valid CMakeCache.txt with OBS dependencies', async () => {
        // Create a mock CMakeCache.txt file
        const cacheContent = `
# This is a CMake cache file
CMAKE_BUILD_TYPE:STRING=Debug
OBS_STUDIO_DIR:PATH=/Users/test/.deps/obs-studio
Qt6_DIR:PATH=/Users/test/.deps/qt6/lib/cmake/Qt6
Qt6Core_DIR:PATH=/Users/test/.deps/qt6/lib/cmake/Qt6Core
obs-frontend-api_DIR:PATH=/Users/test/.deps/obs-studio/UI/obs-frontend-api
libobs_DIR:PATH=/Users/test/.deps/obs-studio/libobs
`;

        const cacheFile = path.join(tempDir, 'CMakeCache.txt');
        fs.writeFileSync(cacheFile, cacheContent);

        const result = await parser.parseCacheFile(tempDir);

        assert.strictEqual(result.success, true);
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.dependencies.obs_studio_dir, '/Users/test/.deps/obs-studio');
        assert.strictEqual(result.dependencies.qt6_dir, '/Users/test/.deps/qt6/lib/cmake/Qt6');
        assert.strictEqual(result.dependencies.qt6_core_dir, '/Users/test/.deps/qt6/lib/cmake/Qt6Core');
        assert.strictEqual(result.dependencies.obs_frontend_api_dir, '/Users/test/.deps/obs-studio/UI/obs-frontend-api');
        assert.strictEqual(result.dependencies.libobs_dir, '/Users/test/.deps/obs-studio/libobs');
    });

    test('should handle missing CMakeCache.txt file', async () => {
        const result = await parser.parseCacheFile(tempDir);

        assert.strictEqual(result.success, false);
        assert.strictEqual(result.errors.length, 1);
        assert.ok(result.errors[0].includes('CMakeCache.txt not found'));
    });

    test('should handle empty CMakeCache.txt file', async () => {
        const cacheFile = path.join(tempDir, 'CMakeCache.txt');
        fs.writeFileSync(cacheFile, '');

        const result = await parser.parseCacheFile(tempDir);

        assert.strictEqual(result.success, true);
        assert.strictEqual(Object.keys(result.dependencies).length, 0);
    });

    test('should validate dependency paths correctly', () => {
        // Create test directories
        const validPath = path.join(tempDir, 'valid-dep');
        const invalidPath = path.join(tempDir, 'invalid-dep');
        fs.mkdirSync(validPath);

        const dependencies: CMakeDependencyInfo = {
            obs_studio_dir: validPath,
            qt6_dir: invalidPath
        };

        const warnings = parser.validateDependencyPaths(dependencies);

        assert.strictEqual(warnings.length, 1);
        assert.ok(warnings[0].includes('qt6_dir'));
        assert.ok(warnings[0].includes('does not exist'));
    });

    test('should compare dependencies and detect changes', () => {
        const currentDeps = {
            obs: '/old/path/obs',
            qt6: '/old/path/qt6'
        };

        const cacheDeps: CMakeDependencyInfo = {
            obs_studio_dir: '/new/path/obs',
            qt6_dir: '/new/path/qt6'
        };

        const comparison = parser.compareDependencies(currentDeps, cacheDeps);

        assert.strictEqual(comparison.hasChanges, true);
        assert.strictEqual(Object.keys(comparison.differences).length, 2);
        assert.strictEqual(comparison.differences.obs.current, '/old/path/obs');
        assert.strictEqual(comparison.differences.obs.cache, '/new/path/obs');
        assert.strictEqual(comparison.differences.qt6.current, '/old/path/qt6');
        assert.strictEqual(comparison.differences.qt6.cache, '/new/path/qt6');
    });

    test('should find build directories correctly', () => {
        // Create test build directories
        const buildDir1 = path.join(tempDir, 'build_macos');
        const buildDir2 = path.join(tempDir, 'build_windows');
        const buildDir3 = path.join(tempDir, 'no-cache-build');

        fs.mkdirSync(buildDir1);
        fs.mkdirSync(buildDir2);
        fs.mkdirSync(buildDir3);

        // Add CMakeCache.txt to some directories
        fs.writeFileSync(path.join(buildDir1, 'CMakeCache.txt'), 'test content');
        fs.writeFileSync(path.join(buildDir2, 'CMakeCache.txt'), 'test content');

        const foundDirs = parser.findBuildDirectories(tempDir);

        assert.strictEqual(foundDirs.length, 2);
        assert.ok(foundDirs.includes(buildDir1));
        assert.ok(foundDirs.includes(buildDir2));
        assert.ok(!foundDirs.includes(buildDir3));
    });

    test('should handle malformed CMakeCache.txt gracefully', async () => {
        const cacheContent = `
# Malformed cache file
INVALID_LINE_WITHOUT_EQUALS
OBS_STUDIO_DIR:PATH=/valid/path
ANOTHER_INVALID_LINE
Qt6_DIR:PATH=/another/valid/path
`;

        const cacheFile = path.join(tempDir, 'CMakeCache.txt');
        fs.writeFileSync(cacheFile, cacheContent);

        const result = await parser.parseCacheFile(tempDir);

        // Should still succeed and extract valid entries
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.dependencies.obs_studio_dir, '/valid/path');
        assert.strictEqual(result.dependencies.qt6_dir, '/another/valid/path');
    });
});