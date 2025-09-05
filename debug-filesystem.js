/**
 * PHASE 1: FILE SYSTEM STATE VERIFICATION
 * Critical Analysis: Case Sensitivity, Permissions, Symlinks
 * Target: Detect macOS (case-insensitive) vs Linux (case-sensitive) differences
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Case Sensitivity Detection
const detectCaseSensitivity = () => {
  console.log('🔍 CASE SENSITIVITY ANALYSIS');
  console.log('=============================');
  
  const testDir = './case-test-temp';
  const testFile1 = path.join(testDir, 'TestFile.txt');
  const testFile2 = path.join(testDir, 'testfile.txt');
  
  try {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
    }
    
    // Write test files
    fs.writeFileSync(testFile1, 'uppercase');
    fs.writeFileSync(testFile2, 'lowercase');
    
    // Check if both files exist (case-insensitive) or only one (case-sensitive)
    const file1Exists = fs.existsSync(testFile1);
    const file2Exists = fs.existsSync(testFile2);
    
    if (file1Exists && file2Exists) {
      console.log('✅ CASE-SENSITIVE file system detected');
      console.log('   This matches Vercel/Linux behavior');
    } else {
      console.log('⚠️ CASE-INSENSITIVE file system detected');
      console.log('   This differs from Vercel/Linux behavior');
      console.log('   POTENTIAL ISSUE: Different case handling between local and Vercel');
    }
    
    // Clean up
    fs.rmSync(testDir, { recursive: true, force: true });
    
    return file1Exists && file2Exists;
    
  } catch (error) {
    console.log('❌ Case sensitivity test failed:', error.message);
    // Clean up on error
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
    return null;
  }
};

// Detailed File Analysis
const analyzeComponentsEmails = () => {
  console.log('\n📁 COMPONENTS/EMAILS DETAILED ANALYSIS');
  console.log('=======================================');
  
  const componentsEmailsPath = './components/emails';
  const indexPath = path.join(componentsEmailsPath, 'index.ts');
  
  if (!fs.existsSync(componentsEmailsPath)) {
    console.log('❌ CRITICAL: components/emails directory does not exist');
    return false;
  }
  
  console.log('✅ components/emails directory exists');
  
  // List all files with detailed info
  try {
    const files = fs.readdirSync(componentsEmailsPath);
    console.log(`📄 Found ${files.length} files:`);
    
    files.forEach(file => {
      const filePath = path.join(componentsEmailsPath, file);
      const stats = fs.statSync(filePath);
      const checksum = crypto.createHash('md5')
        .update(fs.readFileSync(filePath))
        .digest('hex');
      
      console.log(`   ${file}`);
      console.log(`     Size: ${stats.size} bytes`);
      console.log(`     Modified: ${stats.mtime.toISOString()}`);
      console.log(`     MD5: ${checksum.substring(0, 8)}...`);
      console.log(`     Permissions: ${stats.mode.toString(8)}`);
      
      // Check for potential case issues
      const hasUppercase = file !== file.toLowerCase();
      const hasSpecialChars = /[^a-zA-Z0-9._-]/.test(file);
      
      if (hasUppercase) {
        console.log(`     ⚠️ Contains uppercase characters`);
      }
      if (hasSpecialChars) {
        console.log(`     ⚠️ Contains special characters`);
      }
    });
    
    return true;
  } catch (error) {
    console.log('❌ Failed to analyze files:', error.message);
    return false;
  }
};

// Index.ts Content Verification
const verifyIndexExports = () => {
  console.log('\n📋 INDEX.TS EXPORT VERIFICATION');
  console.log('================================');
  
  const indexPath = './components/emails/index.ts';
  
  if (!fs.existsSync(indexPath)) {
    console.log('❌ CRITICAL: index.ts does not exist');
    return false;
  }
  
  try {
    const content = fs.readFileSync(indexPath, 'utf8');
    console.log('✅ index.ts exists and is readable');
    console.log(`📝 Content (${content.length} characters):`);
    console.log('---');
    console.log(content);
    console.log('---');
    
    // Parse exports
    const exportLines = content.split('\n')
      .filter(line => line.trim().startsWith('export'))
      .map(line => line.trim());
    
    console.log(`\n🔄 Found ${exportLines.length} export statements:`);
    exportLines.forEach((line, index) => {
      console.log(`   ${index + 1}: ${line}`);
    });
    
    // Check for corresponding component files
    console.log('\n🔗 COMPONENT FILE VERIFICATION:');
    exportLines.forEach(line => {
      const match = line.match(/from ['"]\.\/(.+?)['"];?$/);
      if (match) {
        const componentFile = match[1];
        const possibleExtensions = ['', '.tsx', '.ts', '.jsx', '.js'];
        let found = false;
        
        for (const ext of possibleExtensions) {
          const testPath = `./components/emails/${componentFile}${ext}`;
          if (fs.existsSync(testPath)) {
            console.log(`   ✅ ${componentFile}${ext}`);
            found = true;
            break;
          }
        }
        
        if (!found) {
          console.log(`   ❌ ${componentFile} (file not found)`);
        }
      }
    });
    
    return true;
  } catch (error) {
    console.log('❌ Failed to verify index.ts:', error.message);
    return false;
  }
};

// Symlinks and Special File Detection
const detectSymlinksAndSpecialFiles = () => {
  console.log('\n🔗 SYMLINKS AND SPECIAL FILES DETECTION');
  console.log('=======================================');
  
  const checkPath = './components/emails';
  
  try {
    const files = fs.readdirSync(checkPath);
    
    files.forEach(file => {
      const filePath = path.join(checkPath, file);
      const lstat = fs.lstatSync(filePath);
      
      if (lstat.isSymbolicLink()) {
        const target = fs.readlinkSync(filePath);
        console.log(`🔗 SYMLINK: ${file} → ${target}`);
        
        // Check if symlink target exists
        const targetExists = fs.existsSync(filePath); // This follows symlinks
        console.log(`   Target exists: ${targetExists ? '✅' : '❌'}`);
      } else if (lstat.isDirectory()) {
        console.log(`📁 DIRECTORY: ${file}`);
      } else if (lstat.isFile()) {
        console.log(`📄 FILE: ${file} (${lstat.size} bytes)`);
      } else {
        console.log(`❓ SPECIAL: ${file} (type: ${lstat.mode})`);
      }
    });
    
  } catch (error) {
    console.log('❌ Failed to detect symlinks:', error.message);
  }
};

// Test Import Resolution with Detailed Logging
const testImportResolutionDetailed = () => {
  console.log('\n🧭 DETAILED IMPORT RESOLUTION TEST');
  console.log('===================================');
  
  const testPaths = [
    '@/components/emails',
    './components/emails',
    './components/emails/index.ts',
    './components/emails/index',
  ];
  
  testPaths.forEach((testPath, index) => {
    console.log(`\nTest ${index + 1}: ${testPath}`);
    console.log('-'.repeat(20 + testPath.length));
    
    try {
      // First try require.resolve to see the resolution path
      const resolvedPath = require.resolve(testPath);
      console.log(`✅ RESOLVED: ${resolvedPath}`);
      
      // Then try actual require
      const imported = require(testPath);
      console.log(`✅ IMPORTED: ${Object.keys(imported).length} exports`);
      console.log(`   Exports: ${Object.keys(imported).join(', ')}`);
      
    } catch (resolveError) {
      console.log(`❌ RESOLUTION FAILED: ${resolveError.message}`);
      console.log(`   Error code: ${resolveError.code}`);
      
      // Try different variations
      const variations = [
        testPath + '.ts',
        testPath + '.tsx',
        testPath + '/index.ts',
        testPath + '/index.tsx',
      ];
      
      console.log('   Trying variations:');
      variations.forEach(variation => {
        try {
          const resolved = require.resolve(variation);
          console.log(`     ✅ ${variation} → ${resolved}`);
        } catch (varError) {
          console.log(`     ❌ ${variation}`);
        }
      });
    }
  });
};

// Main File System Analysis Function
const runFileSystemAnalysis = () => {
  console.log('🔬 STARTING FILE SYSTEM ANALYSIS');
  console.log('=================================');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Working Directory: ${process.cwd()}`);
  
  const results = {
    caseSensitive: detectCaseSensitivity(),
    componentsExists: analyzeComponentsEmails(),
    indexValid: verifyIndexExports(),
  };
  
  detectSymlinksAndSpecialFiles();
  testImportResolutionDetailed();
  
  console.log('\n📊 ANALYSIS SUMMARY');
  console.log('===================');
  console.log(`Case Sensitive FS: ${results.caseSensitive ? 'YES' : 'NO'}`);
  console.log(`Components Dir OK: ${results.componentsExists ? 'YES' : 'NO'}`);
  console.log(`Index Exports OK: ${results.indexValid ? 'YES' : 'NO'}`);
  
  if (!results.caseSensitive) {
    console.log('\n⚠️ CRITICAL FINDING: Case-insensitive file system');
    console.log('This could cause resolution differences between local (macOS) and Vercel (Linux)');
  }
  
  console.log('\n🏁 FILE SYSTEM ANALYSIS COMPLETE');
  
  return results;
};

// Export for integration
module.exports = {
  runFileSystemAnalysis,
  detectCaseSensitivity,
  analyzeComponentsEmails,
  verifyIndexExports,
  detectSymlinksAndSpecialFiles,
  testImportResolutionDetailed,
};

// Auto-run if called directly
if (require.main === module) {
  runFileSystemAnalysis();
}
