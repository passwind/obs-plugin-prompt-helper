import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CMakeCacheParser, CMakeDependencyInfo } from '../core/CMakeCacheParser';

/**
 * Simple test runner for CMakeCacheParser functionality
 * This validates the core dependency validation feature
 */
async function runTests(): Promise<void> {
    console.log('🧪 Running CMakeCacheParser tests...\n');

    let passed = 0;
    let failed = 0;

    // Test 1: Parse valid CMakeCache.txt
    try {
        console.log('Test 1: Parse valid CMakeCache.txt');
        const parser = new CMakeCacheParser();
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmake-test-'));
        
        const cacheContent = `
# CMake cache file
CMAKE_BUILD_TYPE:STRING=Debug
OBS_STUDIO_DIR:PATH=/test/.deps/obs-studio
Qt6_DIR:PATH=/test/.deps/qt6/lib/cmake/Qt6
Qt6Core_DIR:PATH=/test/.deps/qt6/lib/cmake/Qt6Core
obs-frontend-api_DIR:PATH=/test/.deps/obs-studio/UI/obs-frontend-api
libobs_DIR:PATH=/test/.deps/obs-studio/libobs
`;

        const cacheFile = path.join(tempDir, 'CMakeCache.txt');
        fs.writeFileSync(cacheFile, cacheContent);

        const result = await parser.parseCacheFile(tempDir);

        if (result.success && 
            result.dependencies.obs_studio_dir === '/test/.deps/obs-studio' &&
            result.dependencies.qt6_dir === '/test/.deps/qt6/lib/cmake/Qt6') {
            console.log('✅ PASSED: Successfully parsed CMakeCache.txt');
            passed++;
        } else {
            console.log('❌ FAILED: Could not parse CMakeCache.txt correctly');
            failed++;
        }

        // Cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
        console.log(`❌ FAILED: Test 1 threw error: ${error}`);
        failed++;
    }

    // Test 2: Handle missing CMakeCache.txt
    try {
        console.log('\nTest 2: Handle missing CMakeCache.txt');
        const parser = new CMakeCacheParser();
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmake-test-'));
        
        const result = await parser.parseCacheFile(tempDir);

        if (!result.success && result.errors.length > 0 && 
            result.errors[0].includes('CMakeCache.txt not found')) {
            console.log('✅ PASSED: Correctly handled missing CMakeCache.txt');
            passed++;
        } else {
            console.log('❌ FAILED: Did not handle missing CMakeCache.txt correctly');
            failed++;
        }

        // Cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
        console.log(`❌ FAILED: Test 2 threw error: ${error}`);
        failed++;
    }

    // Test 3: Validate dependency paths
    try {
        console.log('\nTest 3: Validate dependency paths');
        const parser = new CMakeCacheParser();
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmake-test-'));
        
        // Create one valid directory
        const validPath = path.join(tempDir, 'valid-dep');
        fs.mkdirSync(validPath);

        const dependencies: CMakeDependencyInfo = {
            obs_studio_dir: validPath,
            qt6_dir: '/nonexistent/path'
        };

        const warnings = parser.validateDependencyPaths(dependencies);

        if (warnings.length === 1 && warnings[0].includes('qt6_dir') && 
            warnings[0].includes('does not exist')) {
            console.log('✅ PASSED: Correctly validated dependency paths');
            passed++;
        } else {
            console.log('❌ FAILED: Did not validate dependency paths correctly');
            console.log('Warnings:', warnings);
            failed++;
        }

        // Cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
        console.log(`❌ FAILED: Test 3 threw error: ${error}`);
        failed++;
    }

    // Test 4: Compare dependencies
    try {
        console.log('\nTest 4: Compare dependencies');
        const parser = new CMakeCacheParser();
        
        const currentDeps = {
            obs: '/old/path/obs',
            qt6: '/old/path/qt6'
        };

        const cacheDeps: CMakeDependencyInfo = {
            obs_studio_dir: '/new/path/obs',
            qt6_dir: '/new/path/qt6'
        };

        const comparison = parser.compareDependencies(currentDeps, cacheDeps);

        if (comparison.hasChanges && 
            Object.keys(comparison.differences).length === 2 &&
            comparison.differences.obs.current === '/old/path/obs' &&
            comparison.differences.obs.cache === '/new/path/obs') {
            console.log('✅ PASSED: Correctly compared dependencies');
            passed++;
        } else {
            console.log('❌ FAILED: Did not compare dependencies correctly');
            failed++;
        }
    } catch (error) {
        console.log(`❌ FAILED: Test 4 threw error: ${error}`);
        failed++;
    }

    // Test 5: Find build directories
    try {
        console.log('\nTest 5: Find build directories');
        const parser = new CMakeCacheParser();
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmake-test-'));
        
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

        if (foundDirs.length === 2 && 
            foundDirs.includes(buildDir1) && 
            foundDirs.includes(buildDir2) &&
            !foundDirs.includes(buildDir3)) {
            console.log('✅ PASSED: Correctly found build directories');
            passed++;
        } else {
            console.log('❌ FAILED: Did not find build directories correctly');
            console.log('Found:', foundDirs);
            failed++;
        }

        // Cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
        console.log(`❌ FAILED: Test 5 threw error: ${error}`);
        failed++;
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`Test Results: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
        console.log('🎉 All tests passed! CMakeCacheParser functionality is working correctly.');
    } else {
        console.log('⚠️  Some tests failed. Please check the implementation.');
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(error => {
        console.error('Test runner failed:', error);
        process.exit(1);
    });
}

export { runTests };