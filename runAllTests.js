const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const testDir = path.join(__dirname, 'tests');
let testFilesFound = [];

/**
 * Recursively finds all files ending with .test.js in a given directory.
 * @param {string} directory - The directory to search.
 */
function findTestFiles(directory) {
  try {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        findTestFiles(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
        testFilesFound.push(fullPath);
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
  console.log('--- Searching for test files ---');
  findTestFiles(testDir);

  if (testFilesFound.length === 0) {
    console.log('No test files found in tests/ ending with .test.js.');
    process.exit(0); // Exit successfully as per requirement
    return;
  }

  console.log(`Found ${testFilesFound.length} test file(s):\n${testFilesFound.map(f => `- ${path.relative(__dirname, f)}`).join('\n')}\n`);

  let passedCount = 0;
  let failedCount = 0;
  const failedFileNames = [];

  for (const filePath of testFilesFound) {
    const fileName = path.basename(filePath);
    // A small separator before each test file's output begins, handled by testUtils.js now.
    // console.log(`\n--- Executing: ${fileName} ---`);
    try {
      const exitCode = await executeTestFile(filePath);
      if (exitCode === 0) {
        passedCount++;
        // Test file itself prints PASS/FAIL summary, so only add to overall summary here.
      } else {
        failedCount++;
        failedFileNames.push(fileName);
        // Test file itself prints PASS/FAIL summary.
        // console.error(`--- ${fileName} FAILED (Exit Code: ${exitCode}) ---`);
      }
    } catch (error) {
      // This catch is for errors in spawning the process itself, already logged in executeTestFile
      failedCount++;
      failedFileNames.push(`${fileName} (execution error)`);
    }
    // Add a small visual separator in the main runner's log after a file finishes.
    console.log(`--- Finished: ${fileName} ---\n`);
  }

  // --- Report Final Summary ---
  console.log('\n--- Overall Test Summary ---');
  console.log(`Total test files found: ${testFilesFound.length}`);
  console.log(`Test files passed: ${passedCount}`);
  console.log(`Test files failed: ${failedCount}`);

  if (failedCount > 0) {
    console.log('\nFailed test files:');
    failedFileNames.forEach(name => console.log(`- ${name}`));
    console.log('\nSome test files failed. Exiting with status 1.');
    process.exit(1);
  } else {
    console.log('\nAll test files passed successfully!');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('A critical error occurred in the test runner:', error);
  process.exit(1);
});
