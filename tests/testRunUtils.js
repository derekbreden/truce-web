let test_results = []

const assertEquals = (expected, actual, message) => {
	const pass = expected === actual // Consider a deep equality check for objects/arrays if needed
	test_results.push({
		pass,
		message,
		expected,
		actual,
	})
}

const getTestResults = () => {
	return [...test_results]
}

const clearTestResults = () => {
	test_results = []
}

const runTests = async (test_file_name, test_functions) => {
	clearTestResults()
	console.log(`  ${test_file_name}`)

	for (let i = 0; i < test_functions.length; i++) {
		const testFn = test_functions[i]
		try {
			const result = testFn()
			if (result && typeof result.then === "function") {
				await result
			}
			
			// Capture visual after test completes if window exists and capture mode enabled
			if (global._test_window?.length && process.env.CAPTURE_VISUALS === "true") {
				try {
					const { captureVisual } = require("./testVisualHelpers.js")
					const test_name = test_file_name.replace(".test.js", "")
					const function_name = testFn.name || `test${i + 1}`
					global._test_window.forEach(async (_test_window, index) => {
						// Capture visual for each test window
						await captureVisual(_test_window, `${test_name}-${function_name}-${index}`)
					})
				} catch (visual_error) {
					console.log(`Visual capture failed: ${visual_error.message}`)
				}
			}
		} catch (error) {
			// If a test function itself throws an error, record it as a failure.
			// This is a basic way to catch unexpected errors within a test.
			test_results.push({
				pass: false,
				message: `Test function "${testFn.name || "anonymous"}" threw an error:
    ${error.message}
    ${error.stack}`,
				expected: "Test to complete without error",
				actual: `Error: ${error.message}`,
			})
		}
	}

	let passed_count = 0
	let failed_count = 0

	test_results.forEach((result) => {
		if (result.pass) {
			// Individual passes are not super relevant information.
			// We only want to see total passes and any failures.
			// console.log(`\x1b[32mPASS:\x1b[0m ${result.message}`)
			passed_count++
		} else {
			console.log(`    \x1b[31mFAIL:\x1b[0m ${result.message}`)
			console.log(`      Expected: ${JSON.stringify(result.expected)}`)
			console.log(`      Actual:   ${JSON.stringify(result.actual)}`)
			failed_count++
		}
	})

	console.log(`    \x1b[32mPASSED:\x1b[0m ${passed_count}`)
	if (failed_count) {
		console.log(`    \x1b[31mFAILED:\x1b[0m ${failed_count}`)
	}

	if (failed_count > 0) {
		console.log("  \x1b[31mSome tests failed. Exiting with status 1.\x1b[0m")
		process.exit(1)
	}
	console.log(``)
}

module.exports = {
	assertEquals,
	getTestResults,
	clearTestResults,
	runTests,
}
