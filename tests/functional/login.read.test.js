const path = require("path")
const {
	setupTestEnvironment,
} = require("../testSetupHelpers.js")
const { assertEquals, runTests } = require("../testRunUtils.js")

const tests = {
	testFlow: async () => {
		// Start with a logged-out user (no session)
		const window = await setupTestEnvironment({
			beforeParse: (window) => {
				window.localStorage.removeItem("trucev1:session_uuid")
				window.localStorage.setItem("trucev1:agreed", true)
			}
		})
		const { $old } = window
		
		// Verify user starts logged out (no email in state)
		assertEquals(
			"",
			window.state.email || "",
			"User should start without email/logged out",
		)
		
		// Open hamburger menu to access login form
		$old("hamburger").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify login form is shown instead of logged-in content
		assertEquals(
			"Sign up / Sign in",
			$old("menu sign-in button[submit]").textContent,
			"Should show sign up / sign in button for logged out user",
		)
		
		// Fill in existing account credentials (from test fixtures)
		$old("menu sign-in input[type=email]").value = "existing@example.com"
		$old("menu sign-in input[type=password]").value = "existingpass123"
		
		// Submit the form to log in to existing account
		$old("menu sign-in button[submit]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify existing account login success message (NOT creation message)
		assertEquals(
			"You have been signed in to your existing account",
			$old("modal[info] info").textContent.trim(),
			"Should show existing account login success message",
		)
		
		// Close the modal
		$old("modal[info] button").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify user is now logged in
		assertEquals(
			"existing@example.com",
			window.state.email,
			"User should now have email set in state",
		)
		
		// Verify user has the correct user_id (40 from test fixtures)
		assertEquals(
			40,
			window.state.user_id,
			"User should have the existing user_id from fixtures",
		)
		
		// Verify display name is set correctly
		assertEquals(
			"Existing User",
			window.state.display_name,
			"User should have the existing display name from fixtures",
		)
		
		// Verify menu now shows logged-in state
		$old("hamburger").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		assertEquals(
			"Log out",
			$old("menu signed-in button[sign-out]").textContent,
			"Should show log out button for logged in user",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))