const path = require("path")
const {
	setupTestEnvironment,
} = require("./testSetupHelpers.js")
const { assertEquals, runTests } = require("./testRunUtils.js")


const tests = {
	testFlow: async () => {
		// Phase 1: User A checks baseline notifications
		const window_user_a = await setupTestEnvironment()
		const { $: $a } = window_user_a
		
		$a("footer a[href='/notifications']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		assertEquals(
			"Unread (2)",
			$a("main-content notifications h3").textContent.trim(),
			"User A should have 2 unread notifications initially",
		)
		
		assertEquals(
			"User B",
			$a("main-content notifications notification:nth-child(2) b:first-child").textContent,
			"First notification should be from User B",
		)
		
		assertEquals(
			`"First notification for User A"`,
			$a("main-content notifications notification:nth-child(2) i").textContent,
			"First notification should show correct content",
		)
		
		// Phase 2: User B navigates to User A's profile from posts list
		const window_user_b = await setupTestEnvironment({
			beforeParse: (window) => {
				window.localStorage.setItem("trucev1:session_uuid", "user-b-session-456")
			}
		})
		const { $: $b } = window_user_b
		
		// Click on User A's profile link directly from posts list
		// User A's post is the first post in the list
		$b("posts post:nth-child(1) author").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Phase 3: User B clicks message button for User A
		$b("post[user] button[message]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Phase 4: User B sends a message to User A
		// Read 1024x1024 PNG that will get resized to itself and return the same at the end
		const fs = require("fs")
		const path = require("path")
		const processed_data_file = path.join(__dirname, "test-data", "1024_base64.txt")
		const valid_png_base64 = await fs.promises.readFile(processed_data_file, "utf8")
		const binary_string = window_user_b.atob(valid_png_base64)
		const bytes = new Uint8Array(binary_string.length)
		for (let i = 0; i < binary_string.length; i++) {
			bytes[i] = binary_string.charCodeAt(i)
		}
		const file = new window_user_b.File([bytes], "test.png", { type: "image/png" })

		// Add the image to the file input and trigger change
		const $file_input = $b("main-content-wrapper[active] input[image]")
		Object.defineProperty($file_input, "files", {
			value: {
				0: file,
				length: 1,
				item: (i) => i === 0 ? file : null
			}
		})
		await $file_input.dispatchEvent(new window_user_b.Event("change", { bubbles: true }))
		await new Promise(resolve => setTimeout(resolve, 0))

		// Verify thumbnail has same image
		await window_user_b.waitForElement("main-content-wrapper[active] image-previews preview img")
		assertEquals(
			"data:image/png;base64," + valid_png_base64,
			$b("main-content-wrapper[active] image-previews preview img").src,
			"Should have thumbnail from canvas resize",
		)

		$b("main-content-wrapper[active] textarea").value = "Hello User A, this is a message from User B"
		
		$b("main-content-wrapper[active] send-button").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify User B sees their own sent message
		assertEquals(
			"Hello User A, this is a message from User B",
			$b("main-content-wrapper[active] messages message:nth-child(1) message-content p span").textContent,
			"User B should see their own sent message"
		)

		// Verify round-trip image is the same calling our endpoint that pulls it from S3
		const $image_element = $b("main-content-wrapper[active] messages message:nth-child(1) message-content p[img] img")
		const image_response = await window_user_b.fetch($image_element.getAttribute("src"), { method: "GET" })
		const response_data = await image_response.json()
		assertEquals(valid_png_base64, response_data, "Retrieved message image data should match input data")
		
		// Verify the instant alert banner appears for User A
		assertEquals(
			"User B replied\nHello User A, this is a message from User B",
			$a("alert-wrapper alert:nth-child(1) info").textContent.trim(),
			`Alert should show "User B replied" with message content`,
		)
		
		// Wait for notifications to re-render
		await new Promise(resolve => setTimeout(resolve, 0))
		
		assertEquals(
			"Unread (2)",
			$a("main-content notifications h3").textContent.trim(),
			"User A should still have 2 unread notifications after User B's message (instant alert marks new message as read, but 2 reply notifications remain unread)",
		)
		assertEquals(
			"User B",
			$a("main-content notifications notification:nth-child(2) b:first-child").textContent,
			"First unread notification should still be from User B",
		)
		
		assertEquals(
			`"First notification for User A"`,
			$a("main-content notifications notification:nth-child(2) i").textContent,
			"First unread notification should show first notification content",
		)
	},

}

runTests(path.basename(__filename), Object.values(tests))