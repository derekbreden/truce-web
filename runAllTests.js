const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const testDir = path.join(__dirname, 'tests');

/**
 * Recursively finds all files ending with .test.js in a given directory
 * and categorizes them.
 * @param {string} directory - The directory to search.
 * @param {object} categorizedFiles - An object to store categorized file paths.
 */
function findTestFiles(directory, categorizedFiles) {
  try {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        findTestFiles(fullPath, categorizedFiles);
      } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
        const pathParts = fullPath.split(path.sep);
        if (pathParts.includes('unit')) {
          categorizedFiles.unit.push(fullPath);
        } else if (pathParts.includes('integration')) {
          categorizedFiles.integration.push(fullPath);
        } else {
          categorizedFiles.other.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${directory}: ${error.message}`);
    // Depending on severity, you might want to re-throw or exit
  }
}

/**
 * Executes a single test file using child_process.spawn.
 * @param {string} filePath - The absolute path to the test file.
 * @returns {Promise<number>} A promise that resolves with the exit code of the test process.
 */
function executeTestFile(filePath) {
  return new Promise((resolve, reject) => {
    const testProcess = spawn('node', [filePath], { stdio: 'pipe' });

    // Pipe stdout and stderr of the child process to the main process
    testProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    testProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    testProcess.on('error', (error) => {
      console.error(`Failed to start test process for ${path.basename(filePath)}: ${error.message}`);
      reject(error); // Reject the promise on spawn error
    });

    testProcess.on('exit', (code) => {
      resolve(code === null ? 1 : code); // Treat null exit code (e.g. due to error event) as failure
    });
  });
}

/**
 * Main function to run all tests.
 */
async function main() {
  let testTypeArg = process.argv[2] || 'all';
  let mainHeader = '';

  const validTestTypes = ['unit', 'integration', 'all'];
  if (!validTestTypes.includes(testTypeArg)) {
    console.warn(`Unknown test type: ${testTypeArg}. Defaulting to 'all'.`);
    testTypeArg = 'all';
  }

  switch (testTypeArg) {
    case 'unit':
      mainHeader = 'Running Unit Tests';
      break;
    case 'integration':
      mainHeader = 'Running Integration Tests';
      break;
    case 'all':
      mainHeader = 'Running All Tests';
      break;
  }
  console.log(`--- ${mainHeader} ---`);

  console.log('--- Searching for test files ---');
  const categorizedFiles = { unit: [], integration: [], other: [] };
  findTestFiles(testDir, categorizedFiles);

  let filesToRun = [];
  let totalFilesFound = 0;

  if (testTypeArg === 'unit') {
    filesToRun = [{ category: 'unit', files: categorizedFiles.unit, header: 'Unit Tests' }];
    totalFilesFound = categorizedFiles.unit.length;
  } else if (testTypeArg === 'integration') {
    filesToRun = [{ category: 'integration', files: categorizedFiles.integration, header: 'Integration Tests' }];
    totalFilesFound = categorizedFiles.integration.length;
  } else { // 'all'
    filesToRun = [
      { category: 'unit', files: categorizedFiles.unit, header: 'Unit Tests' },
      { category: 'integration', files: categorizedFiles.integration, header: 'Integration Tests' },
      { category: 'other', files: categorizedFiles.other, header: 'Other Tests' },
    ];
    totalFilesFound = categorizedFiles.unit.length + categorizedFiles.integration.length + categorizedFiles.other.length;
  }

  if (totalFilesFound === 0) {
    console.log(`No test files found for the specified type '${testTypeArg}'.`);
    process.exit(0);
    return;
  }

  console.log(`Found ${totalFilesFound} test file(s) in total for type '${testTypeArg}'.`);
  if (testTypeArg === 'all') {
    if(categorizedFiles.unit.length > 0) console.log(`  Unit Tests: ${categorizedFiles.unit.length}`);
    if(categorizedFiles.integration.length > 0) console.log(`  Integration Tests: ${categorizedFiles.integration.length}`);
    if(categorizedFiles.other.length > 0) console.log(`  Other Tests: ${categorizedFiles.other.length}`);
  }
  console.log(''); // Newline for separation

  const results = {
    unit: { passed: 0, failed: 0, failedFiles: [] },
    integration: { passed: 0, failed: 0, failedFiles: [] },
    other: { passed: 0, failed: 0, failedFiles: [] },
  };
  let totalPassedOverall = 0;
  let totalFailedOverall = 0;

  for (const group of filesToRun) {
    if (group.files.length === 0) continue;

    if (testTypeArg === 'all') {
      console.log(`--- Running ${group.header} (${group.files.length} file(s)) ---`);
    }
    for (const filePath of group.files) {
      const fileName = path.basename(filePath);
      // console.log(`\n--- Executing: ${fileName} ---`); // Already handled by testUtils
      try {
        const exitCode = await executeTestFile(filePath);
        if (exitCode === 0) {
          results[group.category].passed++;
          totalPassedOverall++;
        } else {
          results[group.category].failed++;
          results[group.category].failedFiles.push(fileName);
          totalFailedOverall++;
        }
      } catch (error) {
        results[group.category].failed++;
        results[group.category].failedFiles.push(`${fileName} (execution error)`);
        totalFailedOverall++;
      }
      // console.log(`--- Finished: ${fileName} ---\n`); // Already handled by testUtils
    }
  }

  // --- Report Final Summary ---
  console.log(`\n--- ${testTypeArg === 'all' ? 'Overall Test Summary' : mainHeader + ' Summary'} ---`);

  if (testTypeArg === 'all') {
    for (const group of filesToRun) {
      if (group.files.length === 0 && !(group.category in categorizedFiles && (categorizedFiles[group.category].length > 0))) {
        // Don't report for categories that had no files found, unless 'all' and it's a primary category
         if (!(testTypeArg ==='all' && (group.category === 'unit' || group.category === 'integration'))) continue;
      }

      // Only print summary for categories that were supposed to run or had files.
      if (categorizedFiles[group.category].length > 0 || (testTypeArg === 'all' && (group.category === 'unit' || group.category === 'integration' || group.category === 'other'))) {
        console.log(`\n  --- ${group.header} Summary ---`);
        console.log(`  \x1b[32mPASSED:\x1b[0m ${results[group.category].passed}`);
        if (results[group.category].failed > 0) {
          console.log(`  \x1b[31mFAILED:\x1b[0m ${results[group.category].failed}`);
          console.log('  Failed files:');
          results[group.category].failedFiles.forEach(name => console.log(`  - ${name}`));
        } else {
          // console.log(`  \x1b[31mFAILED:\x1b[0m ${results[group.category].failed}`);
        }
      }
    }
    console.log('\n  --- Totals for All Categories ---');
    console.log(`  \x1b[32mTOTAL FILES PASSED:\x1b[0m ${totalPassedOverall}`);
    if (totalFailedOverall) {
      console.log(`  \x1b[31mTOTAL FILES FAILED:\x1b[0m ${totalFailedOverall}`);
    } else {
      // console.log(`  \x1b[31mTOTAL FILES FAILED:\x1b[0m ${totalFailedOverall}`);
    }
  } else { // Specific test type run
    const cat = filesToRun[0].category; // Should be only one group
    console.log(`\x1b[32mPASSED:\x1b[0m ${results[cat].passed}`);
    console.log(`\x1b[31mFAILED:\x1b[0m ${results[cat].failed}`);
    if (results[cat].failed > 0) {
      console.log('\nFailed files:');
      results[cat].failedFiles.forEach(name => console.log(`- ${name}`));
    }
  }

  if (totalFailedOverall > 0) {
    console.log('\nSome test files failed. Exiting with status 1.');
    process.exit(1);
  } else {
    console.log('\nAll selected test files passed successfully!');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('A critical error occurred in the test runner:', error);
  process.exit(1);
});
