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
				global.test_email_sent = null // Clear any previous email
			}
		})
		const { $old } = window
		
		// Phase 1: Request password reset
		// Open hamburger menu to access login form
		$old("hamburger").click()
		
		// Click the "password-help" link to open forgot password modal
		$old("menu sign-in password-help").click()
		
		// Verify forgot password modal is shown
		assertEquals(
			"Reset password",
			$old("modal[password-help] button[submit]").textContent,
			"Should show password reset modal",
		)
		
		// Enter email for existing user
		$old("modal[password-help] input[type=email]").value = "existing@example.com"
		
		// Submit password reset request
		$old("modal[password-help] button[submit]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify success message
		assertEquals(
			"An email was sent with password reset instructions.",
			$old("modal[info] info").textContent.trim(),
			"Should show email sent confirmation",
		)
		
		// Verify email was sent via mock
		assertEquals(
			"existing@example.com",
			global.test_email_sent.to,
			"Email should be sent to correct address",
		)
		
		assertEquals(
			"Reset your password on Truce.net",
			global.test_email_sent.subject,
			"Email should have correct subject",
		)
		
		// Extract the reset token from the email text
		const resetUrlMatch = global.test_email_sent.text.match(/https:\/\/truce\.net\/reset\/([a-f0-9-]+)/)
		assertEquals(
			true,
			Boolean(resetUrlMatch),
			"Email should contain reset URL",
		)
		
		const resetToken = resetUrlMatch[1]
		
		// Close the email sent modal
		$old("modal[info] button").click()
		
		// Phase 2: Use the reset link to set new password
		// Create a new window to simulate visiting the reset URL
		const resetWindow = await setupTestEnvironment({
			url: `http://localhost/reset/${resetToken}`,
			beforeParse: (window) => {
				window.localStorage.removeItem("trucev1:session_uuid")
				window.localStorage.setItem("trucev1:agreed", true)
			}
		})
		const { $old: $reset } = resetWindow
		
		// Verify password reset modal is shown
		assertEquals(
			"Set password",
			$reset("modal[password-reset] button[submit]").textContent,
			"Should show password reset form",
		)
		
		// Enter new password
		$reset("modal[password-reset] input[type=password]").value = "newpassword456"
		
		// Submit new password
		$reset("modal[password-reset] button[submit]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify password reset success
		assertEquals(
			"Your password has been set",
			$reset("modal[info] info").textContent.trim(),
			"Should show password set confirmation",
		)
		
		// Close the success modal
		$reset("modal[info] button").click()
		
		// Phase 3: Verify the new password works by logging in
		// Create a fresh window to test login with new password
		const loginWindow = await setupTestEnvironment({
			beforeParse: (window) => {
				window.localStorage.removeItem("trucev1:session_uuid")
				window.localStorage.setItem("trucev1:agreed", true)
			}
		})
		const { $old: $login } = loginWindow
		
		// Open hamburger menu
		$login("hamburger").click()
		
		// Enter credentials with new password
		$login("menu sign-in input[type=email]").value = "existing@example.com"
		$login("menu sign-in input[type=password]").value = "newpassword456"
		
		// Submit login
		$login("menu sign-in button[submit]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify successful login
		assertEquals(
			"You have been signed in to your existing account",
			$login("modal[info] info").textContent.trim(),
			"Should successfully log in with new password",
		)
		
		// Verify user is logged in
		assertEquals(
			"existing@example.com",
			loginWindow.state.email,
			"User should be logged in with correct email",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))