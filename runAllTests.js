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
  let testTypeOrPathArg = process.argv[2];
  let mainHeader = '';
  let runMode = 'all'; // default run mode
  let singleFilePath = ''; // To store the path if a single file is provided

  if (!testTypeOrPathArg) {
    testTypeOrPathArg = 'all';
  }

  const validTestTypes = ['unit', 'integration', 'all'];

  if (validTestTypes.includes(testTypeOrPathArg)) {
    runMode = testTypeOrPathArg;
    switch (runMode) {
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
  } else {
    // Assume it's a file path
    const potentialPath = path.resolve(testTypeOrPathArg); // Resolve to absolute path
    if (fs.existsSync(potentialPath) && potentialPath.endsWith('.test.js')) {
      runMode = 'single';
      singleFilePath = potentialPath; // Store the resolved path
      // Use the original user-provided path for the header for better user feedback
      mainHeader = `Running Single Test File: ${testTypeOrPathArg}`;
    } else {
      console.error(`Error: Test file not found or invalid: ${testTypeOrPathArg}`);
      console.log('Please provide \'unit\', \'integration\', \'all\', or a valid path to a .test.js file.');
      process.exit(1);
    }
  }
  console.log(`--- ${mainHeader} ---`);

  const categorizedFiles = { unit: [], integration: [], other: [], single: [] };

  if (runMode === 'single') {
    // For single file, we add it directly to the 'single' category.
    // No need to call findTestFiles for the entire directory.
    categorizedFiles.single.push(singleFilePath);
  } else {
    console.log('--- Searching for test files ---');
    findTestFiles(testDir, categorizedFiles); // Original behavior for 'unit', 'integration', 'all'
  }

  let filesToRun = [];
  let totalFilesFound = 0;

  if (runMode === 'unit') {
    filesToRun = [{ category: 'unit', files: categorizedFiles.unit, header: 'Unit Tests' }];
    totalFilesFound = categorizedFiles.unit.length;
  } else if (runMode === 'integration') {
    filesToRun = [{ category: 'integration', files: categorizedFiles.integration, header: 'Integration Tests' }];
    totalFilesFound = categorizedFiles.integration.length;
  } else if (runMode === 'all') {
    filesToRun = [
      { category: 'unit', files: categorizedFiles.unit, header: 'Unit Tests' },
      { category: 'integration', files: categorizedFiles.integration, header: 'Integration Tests' },
      { category: 'other', files: categorizedFiles.other, header: 'Other Tests' },
    ];
    totalFilesFound = categorizedFiles.unit.length + categorizedFiles.integration.length + categorizedFiles.other.length;
  } else if (runMode === 'single') {
    // For single file, path.basename might be good for the group header
    filesToRun = [{ category: 'single', files: categorizedFiles.single, header: `Test File: ${path.basename(singleFilePath)}` }];
    totalFilesFound = categorizedFiles.single.length;
  }

  if (totalFilesFound === 0) {
    // Adjust message for single file case
    if (runMode === 'single') {
        // This case should ideally be caught by the existsSync check earlier,
        // but as a safeguard:
        console.error(`Error: Specified test file ${singleFilePath} was not found or processed correctly.`);
    } else {
        console.log(`No test files found for the specified type '${runMode}'.`);
    }
    process.exit(runMode === 'single' ? 1 : 0); // Exit with error for single if not found here, 0 otherwise
    return;
  }

  console.log(`Found ${totalFilesFound} test file(s) for ${runMode === 'single' ? `path '${testTypeOrPathArg}'` : `type '${runMode}'`}.`);
  if (runMode === 'all') {
    if(categorizedFiles.unit.length > 0) console.log(`  Unit Tests: ${categorizedFiles.unit.length}`);
    if(categorizedFiles.integration.length > 0) console.log(`  Integration Tests: ${categorizedFiles.integration.length}`);
    if(categorizedFiles.other.length > 0) console.log(`  Other Tests: ${categorizedFiles.other.length}`);
  }
  console.log(''); // Newline for separation

  const results = {
    unit: { passed: 0, failed: 0, failedFiles: [] },
    integration: { passed: 0, failed: 0, failedFiles: [] },
    other: { passed: 0, failed: 0, failedFiles: [] },
    single: { passed: 0, failed: 0, failedFiles: [] }, // Add single category
  };
  let totalPassedOverall = 0;
  let totalFailedOverall = 0;

  for (const group of filesToRun) {
    if (group.files.length === 0) continue;

    // For 'single' mode, the main header already indicates the file.
    // For 'all' mode, print the group header.
    // For 'unit' or 'integration' mode, the main header is sufficient, no need for sub-header.
    if (runMode === 'all' || runMode === 'single') {
         // In single mode, filesToRun has one group, and its header is already specific.
         // We might not need to print this if the main header is already "Running Single Test File: ..."
         // However, the group.header is "Test File: <basename>", which is a nice confirmation.
         // For 'all', this prints "Unit Tests", "Integration Tests", etc.
        if (group.files.length > 0) { // Only print if there are files in this group
            console.log(`--- Running ${group.header} (${group.files.length} file(s)) ---`);
        }
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
  // The mainHeader already reflects if it's a single file, unit, integration, or all.
  console.log(`\n--- ${mainHeader} Summary ---`);

  if (runMode === 'all') {
    // Report summary for each category that was part of the 'all' run
    const categoriesToReport = ['unit', 'integration', 'other'];
    categoriesToReport.forEach(catKey => {
      // Only report if files were found for this category or it's a primary category
      if (categorizedFiles[catKey] && (categorizedFiles[catKey].length > 0 || (catKey === 'unit' || catKey === 'integration'))) {
        const groupHeader = filesToRun.find(g => g.category === catKey)?.header || (catKey.charAt(0).toUpperCase() + catKey.slice(1) + ' Tests');
        console.log(`\n  --- ${groupHeader} Summary ---`);
        console.log(`  \x1b[32mPASSED:\x1b[0m ${results[catKey].passed}`);
        if (results[catKey].failed > 0) {
          console.log(`  \x1b[31mFAILED:\x1b[0m ${results[catKey].failed}`);
          console.log('  Failed files:');
          results[catKey].failedFiles.forEach(name => console.log(`  - ${name}`));
        } else {
          // console.log(`  \x1b[31mFAILED:\x1b[0m ${results[catKey].failed}`); // No need to print 0 failed
        }
      }
    });
    console.log('\n  --- Totals for All Categories ---');
    console.log(`  \x1b[32mTOTAL FILES PASSED:\x1b[0m ${totalPassedOverall}`);
    if (totalFailedOverall > 0) {
      console.log(`  \x1b[31mTOTAL FILES FAILED:\x1b[0m ${totalFailedOverall}`);
    } else {
      // console.log(`  \x1b[31mTOTAL FILES FAILED:\x1b[0m ${totalFailedOverall}`); // No need to print 0 failed
    }
  } else { // 'unit', 'integration', or 'single' run
    const cat = filesToRun[0].category; // Should be only one group for these modes
    // The main header is already specific, e.g., "Running Unit Tests Summary" or "Running Single Test File: path/to/file.test.js Summary"
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
