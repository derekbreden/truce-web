const fs = require("fs")
const path = require("path")
const { spawn } = require("child_process")

const testDir = path.join(__dirname, "tests")

/**
 * Recursively finds all files ending with .test.js in a given directory
 * and categorizes them.
 * @param {string} directory - The directory to search.
 * @param {object} filesToRun - An array of file paths.
 */
function findTestFiles(directory, filesToRun) {
	try {
		const entries = fs.readdirSync(directory, { withFileTypes: true })
		for (const entry of entries) {
			const fullPath = path.join(directory, entry.name)
			if (entry.isDirectory()) {
				findTestFiles(fullPath, filesToRun)
			} else if (entry.isFile() && entry.name.endsWith(".test.js")) {
				filesToRun.push(fullPath)
			}
		}
	} catch (error) {
		console.error(`Error reading directory ${directory}: ${error.message}`)
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
		const testProcess = spawn("node", [filePath], { stdio: "pipe" })

		// Pipe stdout and stderr of the child process to the main process
		testProcess.stdout.on("data", (data) => {
			process.stdout.write(data)
		})
		testProcess.stderr.on("data", (data) => {
			process.stderr.write(data)
		})

		testProcess.on("error", (error) => {
			console.error(
				`Failed to start test process for ${path.basename(filePath)}: ${error.message}`,
			)
			reject(error)
		})

		testProcess.on("exit", (code) => {
			resolve(code === null ? 1 : code)
		})
	})
}

/**
 * Main function to run all tests.
 */
async function main() {
	const pathArg = process.argv[2]
	let filesToRun = []

	console.log("--- Searching for test files ---")
	findTestFiles(testDir, filesToRun)
	if (pathArg) {
		filesToRun = filesToRun
			.filter(filename => filename.includes(pathArg))
	}

	console.log(`  Files Found: ${filesToRun.length}`)

	const results = { passed: 0, failed: 0, failedFiles: [] }

	console.log(`\n--- Running test files ---`)
	for (const filePath of filesToRun) {
		const fileName = path.basename(filePath)
		try {
			const exitCode = await executeTestFile(filePath)
			if (exitCode === 0) {
				results.passed++
			} else {
				results.failed++
				results.failedFiles.push(fileName)
			}
		} catch (error) {
			results.failed++
			results.failedFiles.push(
				`${fileName} (execution error)`,
			)
		}
	}

	console.log(`\n--- Summary ---`)
	console.log(`  \x1b[32mTOTAL FILES PASSED:\x1b[0m ${results.passed}`)
	if (results.failed > 0) {
		console.log(`  \x1b[31mTOTAL FILES FAILED:\x1b[0m ${results.failed}`)
		console.log("  Failed file names:")
		results.failedFiles.forEach((name) =>
			console.log(`  - ${name}`),
		)
	} else {
		console.log(`  TOTAL FILES FAILED: ${results.failed}`)
	}
	if (results.failed > 0) {
		console.log("\nSome test files failed. Exiting with status 1.")
		process.exit(1)
	} else {
		console.log("\nAll selected test files passed successfully!")
		process.exit(0)
	}
}

main().catch((error) => {
	console.error("A critical error occurred in the test runner:", error)
	process.exit(1)
})
