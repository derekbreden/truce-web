const path = require("path")
const {
	setupTestEnvironment,
} = require("./testSetupHelpers.js")
const { assertEquals, runTests } = require("./testRunUtils.js")

const tests = {
	testFlow: async () => {
		// Start with a logged-out user (no session)
		const window = await setupTestEnvironment({
			beforeParse: (window) => {
				window.localStorage.removeItem("trucev1:session_uuid")
				window.localStorage.setItem("trucev1:agreed", true)
			}
		})
		const { $ } = window
		
		// Verify user starts logged out (no email in state)
		assertEquals(
			"",
			window.state.email || "",
			"User should start without email/logged out",
		)
		
		// Open hamburger menu to access login form
		$("hamburger").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify login form is shown instead of logged-in content
		assertEquals(
			"Sign up / Sign in",
			$("menu sign-in button[submit]").innerText,
			"Should show sign up / sign in button for logged out user",
		)
		
		// Fill in new account credentials
		$("menu sign-in input[type=email]").value = "newuser@example.com"
		$("menu sign-in input[type=password]").value = "testpassword123"
		
		// Submit the form to create account
		$("menu sign-in button[submit]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify account creation success message
		assertEquals(
			"You have created a new account",
			$("modal[info] info").innerText.trim(),
			"Should show account creation success message",
		)
		
		// Close the modal
		$("modal[info] button").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify user is now logged in
		assertEquals(
			"newuser@example.com",
			window.state.email,
			"User should now have email set in state",
		)
		
		// Verify user has a user_id (account was created)
		assertEquals(
			true,
			Boolean(window.state.user_id),
			"User should have a user_id after account creation",
		)
		
		// Verify menu now shows logged-in state
		$("hamburger").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		assertEquals(
			"Log out",
			$("menu signed-in button[sign-out]").innerText,
			"Should show log out button for logged in user",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))