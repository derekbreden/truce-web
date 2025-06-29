const path = require("path")
const {
	setupTestEnvironment,
} = require("../testSetupHelpers.js")
const { assertEquals, runTests } = require("../testRunUtils.js")

const tests = {
	testFlow: async () => {
		await setupTestEnvironment({
			beforeParse: (window) => {
				window.localStorage.removeItem("trucev1:session_uuid")
				window.localStorage.removeItem("trucev1:agreed") 
				window.localStorage.removeItem("trucev1:last_root_path")
			}
		})
	},
}

runTests(path.basename(__filename), Object.values(tests))