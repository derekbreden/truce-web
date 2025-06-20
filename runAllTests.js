const fs = require("fs")
const path = require("path")
const { spawn } = require("child_process")

const testDir = path.join(__dirname, "tests")

const start_time = new Date()

/**
 * Recursively finds all files ending with .test.js in a given directory
 * and categorizes them.
 * @param {string} directory - The directory to search.
 * @param {object} filesToRun - An array of file paths.
 */
const findTestFiles = (directory, filesToRun) => {
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
const executeTestFile = (filePath) => {
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
const main = async () => {
	const allArgs = process.argv.splice(2)
	const captureMode = allArgs.includes("capture")
	const searchArgs = allArgs.filter(arg => arg !== "capture")
	const pathArg = searchArgs.join(" ")
	
	let filesToRun = []

	// Clean visual output directory if in capture mode
	if (captureMode) {
		const captureDir = path.join(__dirname, "tests", "capture")
		if (fs.existsSync(captureDir)) {
			const files = fs.readdirSync(captureDir)
			files.forEach(file => {
				fs.unlinkSync(path.join(captureDir, file))
			})
		}
		// Set environment variable for child processes
		process.env.CAPTURE_VISUALS = "true"
	}

	console.log("--- Searching for test files ---")
	findTestFiles(testDir, filesToRun)
	if (pathArg) {
		const searchTerms = pathArg.split(" ")
		filesToRun = filesToRun
			.filter(filename => searchTerms.some(term => filename.includes(term)))
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
	const end_time = new Date()
	const duration = ((end_time - start_time) / 1000).toFixed(2)
	console.log(`\n--- Test run completed ---`)
	console.log(`  Duration: ${duration} seconds`)
	if (results.passed > 0) {
		console.log(`  \x1b[32mAll passed tests were successful!\x1b[0m`)
	} else {
		console.log(`  \x1b[31mNo tests passed successfully.\x1b[0m`)
	}
	if (results.failed > 0) {
		process.exit(1)
	} else {
		process.exit(0)
	}
}

main().catch((error) => {
	console.error("A critical error occurred in the test runner:", error)
	process.exit(1)
})
