const { assertEquals, runTests } = require("../shared/testUtils.js")
const { setupIntegrationTestEnvironment } = require("../shared/integrationTestSetup.js")

async function testNotificationsInfiniteScrollFlow() {
	const window = await setupIntegrationTestEnvironment()
	const { state, $ } = window

	// Set up initial notifications page with some notifications
	window.setMockFetchResponseForPaths({
		"/posts": {
			success: true,
			user_id: "test-user-123",
			display_name: "Test User",
			email: "test@example.com",
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/posts"
		},
		"/notifications": {
			success: true,
			user_id: "test-user-123",
			display_name: "Test User", 
			email: "test@example.com",
			notifications: [
				{
					notification_id: "notif-1",
					read: false,
					seen: false,
					create_date: "2024-01-15T10:00:00Z",
					display_name: "User One",
					display_name_index: 0,
					reply_id: "reply-1",
					body: "First notification content",
					note: "",
					title: "First Post",
					reply_type: "post"
				},
				{
					notification_id: "notif-2", 
					read: false,
					seen: false,
					create_date: "2024-01-15T09:00:00Z",
					display_name: "User Two",
					display_name_index: 0,
					reply_id: "reply-2",
					body: "Second notification content",
					note: "",
					title: "Second Post",
					reply_type: "post"
				},
				{
					notification_id: "notif-3",
					read: true,
					seen: true,
					create_date: "2024-01-15T08:00:00Z",
					display_name: "User Three",
					display_name_index: 0,
					reply_id: "reply-3",
					body: "Third notification content - read",
					note: "",
					title: "Third Post",
					reply_type: "post"
				}
			],
			posts: [],
			replies: [],
			activities: [],
			path: "/notifications"
		}
	})

	// Navigate to notifications page
	const $join_button = $(`a[href="/posts"][big]`)
	$join_button.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $hamburger = $("hamburger")
	$hamburger.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $notifications_link = $(`menu-wrapper a[href="/notifications"]`)
	$notifications_link.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Verify initial notifications loaded
	const $notifications = $("notification")
	assertEquals(3, $notifications.length, "Should show initial 3 notifications")

	// Verify cache setup and finished flag is not set initially  
	assertEquals(true, Boolean(state.cache["/notifications"]), "Should have cached notifications")
	assertEquals(undefined, state.cache["/notifications"].finished, "Should not be marked as finished initially")

	// Mock the infinite scroll API response (older notifications)
	window.addMockFetchMatcher({
		match: (url, options) => {
			if (url === "/session" && options?.method === "POST") {
				const body = JSON.parse(options.body)
				return body.path === "/notifications" 
					&& body.max_notification_unread_create_date 
					&& body.max_notification_read_create_date
			}
			return false
		},
		response: {
			success: true,
			user_id: "test-user-123",
			display_name: "Test User",
			email: "test@example.com", 
			notifications: [
				{
					notification_id: "notif-4",
					read: false,
					seen: false,
					create_date: "2024-01-15T07:00:00Z",
					display_name: "User Four",
					display_name_index: 0,
					reply_id: "reply-4",
					body: "Fourth notification - loaded via infinite scroll",
					note: "",
					title: "Fourth Post",
					reply_type: "post"
				},
				{
					notification_id: "notif-5",
					read: true,
					seen: true,
					create_date: "2024-01-15T06:00:00Z",
					display_name: "User Five",
					display_name_index: 0,
					reply_id: "reply-5",
					body: "Fifth notification - also from infinite scroll",
					note: "",
					title: "Fifth Post", 
					reply_type: "post"
				}
			],
			posts: [],
			replies: [],
			activities: [],
			path: "/notifications"
		}
	})

	// Test infinite scroll trigger by setting scroll position near bottom
	const $main_content = $("main-content-wrapper[active]")
	
	// Set up scroll dimensions to trigger infinite scroll
	// From onScroll.js: threshold = scrollHeight - clientHeight * 3
	// We need scrollTop > threshold to trigger
	Object.defineProperty($main_content, 'scrollHeight', { value: 1000, configurable: true })
	Object.defineProperty($main_content, 'clientHeight', { value: 200, configurable: true })
	// threshold = 1000 - 200 * 3 = 400
	// Set scrollTop to 500 to trigger (500 > 400)
	$main_content.scrollTop = 500

	// Trigger scroll event manually since JSDOM doesn't auto-trigger
	const scrollEvent = new window.Event('scroll')
	$main_content.dispatchEvent(scrollEvent)
	await new Promise(resolve => setTimeout(resolve, 0))

	// Verify infinite scroll was triggered and new notifications added
	const $updated_notifications = $("notification")
	assertEquals(5, $updated_notifications.length, "Should show 5 notifications after infinite scroll")

	// Verify cache was updated with new notifications
	assertEquals(5, state.cache["/notifications"].notifications.length, "Cache should contain 5 notifications")

	// Check that the new notifications have the expected content
	const last_notification = state.cache["/notifications"].notifications[4]
	assertEquals("notif-5", last_notification.notification_id, "Should have loaded notif-5")
	assertEquals("2024-01-15T06:00:00Z", last_notification.create_date, "Should have correct date")
}

async function testNotificationsInfiniteScrollFinished() {
	const window = await setupIntegrationTestEnvironment()
	const { state, $ } = window

	// Set up notifications page
	window.setMockFetchResponseForPaths({
		"/posts": {
			success: true,
			user_id: "test-user-123",
			display_name: "Test User",
			email: "test@example.com", 
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/posts"
		},
		"/notifications": {
			success: true,
			user_id: "test-user-123",
			display_name: "Test User",
			email: "test@example.com",
			notifications: [
				{
					notification_id: "last-notif",
					read: false,
					seen: false,
					create_date: "2024-01-15T10:00:00Z",
					display_name: "Last User",
					display_name_index: 0,
					reply_id: "last-reply",
					body: "Last notification",
					note: "",
					title: "Last Post",
					reply_type: "post"
				}
			],
			posts: [],
			replies: [],
			activities: [],
			path: "/notifications"
		}
	})

	// Navigate to notifications
	const $join_button = $(`a[href="/posts"][big]`)
	$join_button.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $hamburger = $("hamburger")
	$hamburger.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $notifications_link = $(`menu-wrapper a[href="/notifications"]`)
	$notifications_link.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Mock empty response (no more notifications to load)
	window.addMockFetchMatcher({
		match: (url, options) => {
			if (url === "/session" && options?.method === "POST") {
				const body = JSON.parse(options.body)
				return body.path === "/notifications" 
					&& body.max_notification_unread_create_date 
					&& body.max_notification_read_create_date
			}
			return false
		},
		response: {
			success: true,
			user_id: "test-user-123",
			display_name: "Test User",
			email: "test@example.com",
			notifications: [], // Empty - no more to load
			posts: [],
			replies: [],
			activities: [],
			path: "/notifications"
		}
	})

	// Trigger scroll
	const $main_content = $("main-content-wrapper[active]")
	Object.defineProperty($main_content, 'scrollHeight', { value: 1000, configurable: true })
	Object.defineProperty($main_content, 'clientHeight', { value: 200, configurable: true })
	$main_content.scrollTop = 500

	const scrollEvent = new window.Event('scroll')
	$main_content.dispatchEvent(scrollEvent)
	await new Promise(resolve => setTimeout(resolve, 0))

	// Verify finished flag was set when empty results returned
	assertEquals(true, state.cache["/notifications"].finished, "Should mark notifications as finished when no more results")

	// Try to scroll again - should not make another request since finished = true
	let secondRequestMade = false
	window.addMockFetchMatcher({
		match: () => {
			secondRequestMade = true
			return false
		},
		response: {}
	})

	$main_content.dispatchEvent(scrollEvent)
	await new Promise(resolve => setTimeout(resolve, 0))

	assertEquals(false, secondRequestMade, "Should not make second request when finished = true")
}

runTests("notifications_infinite_scroll.integration.test.js", [
	testNotificationsInfiniteScrollFlow,
	testNotificationsInfiniteScrollFinished
])