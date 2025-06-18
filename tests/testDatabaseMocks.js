function setupDefaultDatabaseMocks(databaseMocks, sessionState) {
	const getPostCreatedInThisSession = sessionState?.postCreatedInThisSession || (() => false)
	const setPostCreatedInThisSession = sessionState?.setPostCreatedInThisSession || (() => {})
	const getPostEditedInThisSession = sessionState?.postEditedInThisSession || (() => false)
	const setPostEditedInThisSession = sessionState?.setPostEditedInThisSession || (() => {})
	const getEditedPostData = sessionState?.editedPostData || (() => null)
	const setEditedPostData = sessionState?.setEditedPostData || (() => {})
	
	// Global state tracker for reply.create.test.js scenario
	// Initialize only if not already set (don't reset during same test run)
	if (global.userANotificationQueries === undefined) {
		global.userANotificationQueries = 0
	}
	if (global.replyCreatedInSession === undefined) {
		global.replyCreatedInSession = false
	}
	if (global.messageCreatedInSession === undefined) {
		global.messageCreatedInSession = false
	}
	
	return {
		...{
			sessionValidation: (sql, params) => {
				// Handle both HTTP session validation (with display_name) and WebSocket session validation (user_id only)
				if (sql.includes("SELECT") && sql.includes("sessions.session_uuid") && (sql.includes("users.display_name") || sql.includes("users.user_id"))) {
					if (params && params[0] === "user-a-session-123") {
						return { 
							rows: [{ 
								session_uuid: "user-a-session-123",
								session_id: 1, 
								email: "usera@example.com",
								display_name: "User A",
								admin: false,
								user_id: 10,
								profile_picture_uuid: null,
								slug: "user-a",
								subscribed_to_users: "0"
							}] 
						}
					}
					if (params && params[0] === "user-b-session-456") {
						return { 
							rows: [{ 
								session_uuid: "user-b-session-456",
								session_id: 2, 
								email: "userb@example.com",
								display_name: "User B",
								admin: false,
								user_id: 20,
								profile_picture_uuid: null,
								slug: "user-b",
								subscribed_to_users: "0"
							}] 
						}
					}
					// Anonymous/guest session - no user associated
					return { rows: [] }
				}
			},
			sessionResponse: (sql, params) => {
				// This handles the /session endpoint calls, not database queries
				// When the client calls /session with different paths, we need to mock the response
				return null // Database mock - not applicable, handled in fetch mocking
			},
			notifications: (sql, params) => {
				const user_id = params?.[0] // First parameter is typically user_id in notification queries
				
				// Unread count and unseen count query
				if (sql.includes("WITH combined_notifications") || sql.includes("unseen_count")) {
					if (user_id === 10) { // User A (Post Owner)
						// Track User A notification count queries for reply.create.test.js scenario
						global.userANotificationQueries++
						
						// Determine unread count: 2 baseline, 3 after second query (after reply/message created)
						let unread_count = 2 // baseline
						if (global.userANotificationQueries >= 2) {
							unread_count = 3 // Second query always shows 3 (after reply or message was created)
						}
						return { 
							rows: [{ 
								unseen_count: global.userANotificationQueries === 1 ? 1 : 0,
								unread_count: unread_count
							}] 
						}
					} else { // Default for other users including User B
						return { 
							rows: [{ 
								unseen_count: 0,
								unread_count: 2
							}] 
						}
					}
				}
				
				// Unread notifications query
				if (sql.includes("WITH combined_unread") && sql.includes("n.read = FALSE")) {
					if (user_id === 10) { // User A (Post Owner)
						// Show appropriate notification based on what was created
						if (global.userANotificationQueries >= 2 && global.messageCreatedInSession) {
							// Show new message notification first after message creation
							return {
								rows: [
									{
										notification_id: 200, // New message notification
										read: false,
										seen: false,
										create_date: "2024-01-03T02:30:00.000Z", // Newest notification
										display_name: "User B",
										display_name_index: "user-b",
										reply_id: null,
										body: "Hello User A, this is a message from User B",
										note: null,
										title: null,
										reply_type: null,
										conversation_id: 100,
										message_id: 500,
										notification_type: "message"
									},
									{
										notification_id: 100,
										read: false,
										seen: false,
										create_date: "2024-01-03T01:00:00.000Z",
										display_name: "User B",
										display_name_index: "user-b",
										reply_id: 201,
										body: "First notification for User A",
										note: null,
										title: "User A's Post",
										reply_type: "post",
										conversation_id: null,
										message_id: null,
										notification_type: "reply"
									},
									{
										notification_id: 101,
										read: false,
										seen: false,
										create_date: "2024-01-03T00:30:00.000Z",
										display_name: "User B",
										display_name_index: "user-b",
										reply_id: null,
										body: "Second notification for User A",
										note: null,
										title: null,
										reply_type: null,
										conversation_id: 5,
										message_id: 10,
										notification_type: "message"
									}
								]
							}
						} else if (global.userANotificationQueries >= 2 && global.replyCreatedInSession) {
							return {
								rows: [
									{
										notification_id: 103,
										read: false,
										seen: false,
										create_date: "2024-01-03T02:00:00.000Z", // Newest notification
										display_name: "User B",
										display_name_index: "user-b",
										reply_id: 201,
										body: "Reply from User B to User A",
										note: null,
										title: "User A's Post",
										reply_type: "post",
										conversation_id: null,
										message_id: null,
										notification_type: "reply"
									},
									{
										notification_id: 100,
										read: false,
										seen: false,
										create_date: "2024-01-03T01:00:00.000Z",
										display_name: "User B",
										display_name_index: "user-b",
										reply_id: 201,
										body: "First notification for User A",
										note: null,
										title: "User A's Post",
										reply_type: "post",
										conversation_id: null,
										message_id: null,
										notification_type: "reply"
									},
									{
										notification_id: 101,
										read: false,
										seen: false,
										create_date: "2024-01-03T00:30:00.000Z",
										display_name: "User B",
										display_name_index: "user-b",
										reply_id: null,
										body: "Second notification for User A",
										note: null,
										title: null,
										reply_type: null,
										conversation_id: 5,
										message_id: 10,
										notification_type: "message"
									}
								]
							}
						} else {
							// First query: baseline 2 notifications
							return {
								rows: [
									{
										notification_id: 100,
										read: false,
										seen: false,
										create_date: "2024-01-03T01:00:00.000Z",
										display_name: "User B",
										display_name_index: "user-b",
										reply_id: 201,
										body: "First notification for User A",
										note: null,
										title: "User A's Post",
										reply_type: "post",
										conversation_id: null,
										message_id: null,
										notification_type: "reply"
									},
									{
										notification_id: 101,
										read: false,
										seen: false,
										create_date: "2024-01-03T00:30:00.000Z",
										display_name: "User B",
										display_name_index: "user-b",
										reply_id: null,
										body: "Second notification for User A",
										note: null,
										title: null,
										reply_type: null,
										conversation_id: 5,
										message_id: 10,
										notification_type: "message"
									}
								]
							}
						}
					}
				}
				
				// Read notifications query
				if (sql.includes("WITH combined_read") && sql.includes("n.read = TRUE")) {
					if (user_id === 10) { // User A (Post Owner)
						return {
							rows: [
								{
									notification_id: 102,
									read: true,
									seen: true,
									create_date: "2024-01-02T15:00:00.000Z",
									display_name: "User B",
									display_name_index: "user-b",
									reply_id: 202,
									body: "This was an old reply to User A",
									note: null,
									title: "User A's Other Post",
									reply_type: "post",
									conversation_id: null,
									message_id: null,
									notification_type: "reply"
								}
							]
						}
					} else { // Default for other users
						return {
							rows: [
								{
									notification_id: 3,
									read: true,
									seen: true,
									create_date: "2024-01-02T15:00:00.000Z",
									display_name: "Old User",
									display_name_index: "old-user",
									reply_id: 102,
									body: "This was an old reply",
									note: null,
									title: "Other Post",
									reply_type: "post",
									conversation_id: null,
									message_id: null,
									notification_type: "reply"
								}
							]
						}
					}
				}
				
				// Mark all notifications as seen (reply_notifications)
				if (sql.includes("UPDATE reply_notifications") && sql.includes("SET seen = TRUE")) {
					return { rows: [] }
				}
				
				// Mark all notifications as seen (message_notifications)
				if (sql.includes("UPDATE message_notifications") && sql.includes("SET seen = TRUE")) {
					return { rows: [] }
				}
				
				// Mark notifications as read (for WebSocket users)
				if (sql.includes("UPDATE reply_notifications") && sql.includes("SET read = TRUE")) {
					return { rows: [] }
				}
				
				if (sql.includes("UPDATE message_notifications") && sql.includes("SET read = TRUE")) {
					return { rows: [] }
				}
				
				// Get unread count for WebSocket users
				if (sql.includes("SELECT sum(unread_count) AS unread_count")) {
					return { rows: [{ unread_count: 0 }] }
				}
			},
			posts: (sql, params) => {
				const user_id = params?.[0] // First parameter is typically user_id in posts queries
				
				// Regular posts queries (not single post)
				if (sql.includes("SELECT") && sql.includes("p.create_date") && sql.includes("p.post_id") && !sql.includes("p.slug = $2")) {
					// Only return newly created post if one was actually created in this test session
					// and we're asking for posts newer than existing posts (getMoreRecent call)
					// params[0] = user_id, params[1] = min_post_create_date, params[2] = max_post_create_date
					if (getPostCreatedInThisSession() && params && params[1] && new Date(params[1]) >= new Date("2024-01-02T00:00:00.000Z")) {
						return { 
							rows: [
								{
									post_id: 123, // The newly created post
									title: "Newly Created Post Title",
									body: "This is the body content of the newly created post. It needs to be longer than the title to pass validation.",
									create_date: "2024-01-02T01:00:00.000Z",
									user_id: 1,
									reply_count: 0,
									favorite_count: 0,
									topics: "religion,media",
									edit: true,
									slug: "newly_created_post_title",
									favorited: false
								}
							] 
						}
					}
					
					// Infinite scroll - loading older posts
					if (params && params[2]) {
						const max_date = new Date(params[2])
						
						// First scroll - return third post when scrolling past User B's Post date
						if (max_date <= new Date("2024-01-01T01:00:00.000Z") && max_date > new Date("2023-12-31T00:00:00.000Z")) {
							return {
								rows: [
									{
										post_id: 3,
										title: "Third post loaded via scroll",
										body: "This is the third post that loads when you scroll",
										create_date: "2023-12-31T00:00:00.000Z",
										user_id: 30,
										reply_count: 0,
										favorite_count: 0,
										topics: "religion,media",
										edit: user_id === 30,
										slug: "third-post-loaded-via-scroll",
										favorited: false,
										display_name: "User C",
										display_name_index: "user-c",
										user_slug: "user-c",
										profile_picture_uuid: null,
										user_verified: false
									}
								]
							}
						}
						
						// Second scroll or beyond - no more posts
						if (max_date <= new Date("2023-12-31T00:00:00.000Z")) {
							return { rows: [] }
						}
					}
					
					// Default posts for all users (everyone sees the same posts)
					return { 
						rows: [
							{
								post_id: 1,
								title: "User A's Post",
								body: "This is User A's own post",
								create_date: "2024-01-02T00:00:00.000Z",
								user_id: 10, // User A owns this
								display_name: "User A",
								display_name_index: "user-a",
								user_slug: "user-a",
								profile_picture_uuid: null,
								user_verified: true,
								reply_count: 0,
								favorite_count: 0,
								topics: "religion,media",
								edit: user_id === 10, // Only User A can edit
								slug: "user-as-post",
								favorited: false,
								replyed: false,
								voted: false,
								poll_1: null,
								poll_2: null,
								poll_3: null,
								poll_4: null,
								poll_counts: null,
								poll_counts_estimated: null,
								note: null,
								counts_max_create_date: "2024-01-02T00:00:00.000Z",
								image_uuids: null
							},
							{
								post_id: 2,
								title: "User B's Post", 
								body: "This is User B's post",
								create_date: "2024-01-01T01:00:00.000Z",
								user_id: 20, // User B owns this
								display_name: "User B",
								display_name_index: "user-b",
								user_slug: "user-b",
								profile_picture_uuid: null,
								user_verified: true,
								reply_count: 0,
								favorite_count: 0,
								topics: "religion,media",
								edit: user_id === 20, // Only User B can edit
								slug: "user-bs-post",
								favorited: false,
								replyed: false,
								voted: false,
								poll_1: null,
								poll_2: null,
								poll_3: null,
								poll_4: null,
								poll_counts: null,
								poll_counts_estimated: null,
								note: null,
								counts_max_create_date: "2024-01-01T01:00:00.000Z",
								image_uuids: null
							}
						] 
					}
				}
			},
			topics: (sql, params) => {
				/*
					NOTE TO CLAUDE:
						I am leaving this large comment block here, as guidance to you for
						how to go about mocking new queries.
						
						(1) Find the query that you are working with in the server handler
						(2) Find the table schemas in schema.js for each table involved

					-- Table Schemas from schema.js
					CREATE TABLE IF NOT EXISTS post_topics (
					post_id INT NOT NULL,
					topic_id INT NOT NULL
					)
					CREATE TABLE IF NOT EXISTS topics (
					topic_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
					topic_name VARCHAR(10) NOT NULL UNIQUE,
					subtitle VARCHAR(50) NOT NULL
					)

					-- The query we are working with from getTopics.js
					SELECT
						ts.topic_name,
						ts.subtitle,
						COUNT(tt.topic_id) AS posts
					FROM
						topics ts
						LEFT JOIN post_topics tt ON ts.topic_id = tt.topic_id
					GROUP BY
						ts.topic_id,
						ts.topic_name,
						ts.subtitle
					ORDER BY ts.topic_id ASC
				*/
				if (sql.includes("SELECT") && sql.includes("topics ts") && sql.includes("COUNT(tt.topic_id) AS posts")) {
					return { 
						rows: [
							{ topic_name: "religion", subtitle: "Discussions about religion", posts: 2 },
							{ topic_name: "media", subtitle: "Media discussions", posts: 2 }
						] 
					}
				}
			},
			activities: (sql, params) => {
				// The query is for favorites page - combines posts and replies that were favorited
				if (sql.includes("WITH combined AS") && sql.includes("combined.favorited = TRUE")) {
					
					// Check if this is after favorite creation (looks for newer favorited items)
					// params[0] = user_id, params[1] = max_create_date, params[2] = min_create_date
					// Since client bug uses create_date instead of favorite_create_date, check for My Post's create_date
					if (params && params[2] && new Date(params[2]) >= new Date("2024-01-02T00:00:00.000Z")) {
						return { 
							rows: [
								// The newly favorited post
								{
									id: 1,
									create_date: "2024-01-02T00:00:00.000Z",
									title: "User A's Post",
									body: "This is User A's own post",
									poll_1: null,
									poll_2: null,
									poll_3: null,
									poll_4: null,
									poll_counts: null,
									poll_counts_estimated: null,
									note: null,
									slug: "user-as-post",
									favorite_count: 1,
									reply_count: 0,
									counts_max_create_date: "2024-01-02T00:00:00.000Z",
									type: "post",
									edit: true,
									image_uuids: null,
									favorited: true,
									replyed: false,
									voted: false,
									favorite_create_date: "2024-01-03T01:00:00.000Z", // Newer than existing favorite
									user_id: 10,
									display_name: "User A",
									display_name_index: "user-a",
									user_slug: "user-a",
									profile_picture_uuid: null,
									user_verified: true,
									parent_post_title: null,
									parent_post_slug: null,
									parent_reply_id: null,
									parent_reply_body: null,
									parent_reply_note: null,
									parent_reply_display_name: null,
									parent_reply_display_name_index: null,
									parent_reply_user_slug: null,
									parent_reply_profile_picture_uuid: null,
									parent_reply_favorited: false,
									topics: "religion,media"
								}
							] 
						}
					}
					
					// Default favorited items for initial load
					return { 
						rows: [
							// A favorited post
							{
								id: 2,
								create_date: "2024-01-01T01:00:00.000Z",
								title: "User B's Post",
								body: "This is User B's post",
								poll_1: null,
								poll_2: null,
								poll_3: null,
								poll_4: null,
								poll_counts: null,
								poll_counts_estimated: null,
								note: null,
								slug: "user-bs-post",
								favorite_count: 5,
								reply_count: 3,
								counts_max_create_date: "2024-01-01T01:00:00.000Z",
								type: "post",
								edit: false,
								image_uuids: null,
								favorited: true,
								replyed: false,
								voted: false,
								favorite_create_date: "2024-01-03T00:00:00.000Z",
								user_id: 20,
								display_name: "User B",
								display_name_index: "user-b",
								user_slug: "user-b",
								profile_picture_uuid: null,
								user_verified: true,
								parent_post_title: null,
								parent_post_slug: null,
								parent_reply_id: null,
								parent_reply_body: null,
								parent_reply_note: null,
								parent_reply_display_name: null,
								parent_reply_display_name_index: null,
								parent_reply_user_slug: null,
								parent_reply_profile_picture_uuid: null,
								parent_reply_favorited: false,
								topics: "religion,media"
							},
							// A favorited reply
							{
								id: 10,
								create_date: "2024-01-02T00:00:00.000Z",
								title: null,
								body: "Great point!",
								poll_1: null,
								poll_2: null,
								poll_3: null,
								poll_4: null,
								poll_counts: null,
								poll_counts_estimated: null,
								note: null,
								slug: null,
								favorite_count: 2,
								reply_count: null,
								counts_max_create_date: "2024-01-02T00:00:00.000Z",
								type: "reply",
								edit: false,
								image_uuids: null,
								favorited: true,
								replyed: false,
								voted: false,
								favorite_create_date: "2024-01-04T00:00:00.000Z",
								user_id: 3,
								display_name: "Reply User",
								display_name_index: "reply-user",
								user_slug: "reply-user",
								profile_picture_uuid: null,
								user_verified: true,
								parent_post_title: "My Post",
								parent_post_slug: "my-post",
								parent_reply_id: null,
								parent_reply_body: null,
								parent_reply_note: null,
								parent_reply_display_name: null,
								parent_reply_display_name_index: null,
								parent_reply_user_slug: null,
								parent_reply_profile_picture_uuid: null,
								parent_reply_favorited: false,
								topics: ""
							}
						] 
					}
				}
			},
			singlePost: (sql, params) => {
				// Single post query from getSinglePost.js
				if (sql.includes("SELECT") && sql.includes("p.post_id as post_id") && sql.includes("p.slug = $2")) {
					const editedData = getEditedPostData()
					const isEdited = getPostEditedInThisSession()
					const user_id = params?.[0] // First param is user_id
					const slug = params?.[1] // Second param is slug
					
					// Handle User A's post
					if (slug === "user-as-post" || slug === "User_As_Post") {
						return {
							rows: [
								{
									create_date: "2024-01-02T00:00:00.000Z",
									post_id: 1,
									title: isEdited && editedData ? editedData.title : "User A's Post",
									user_id: 10,
									display_name: "User A",
									display_name_index: "user-a",
									user_slug: "user-a",
									profile_picture_uuid: null,
									user_verified: true,
									slug: "user-as-post",
									body: isEdited && editedData ? editedData.body : "This is User A's own post with full content",
									poll_1: null,
									poll_2: null,
									poll_3: null,
									poll_4: null,
									poll_counts: null,
									poll_counts_estimated: null,
									note: null,
									favorite_count: 2,
									reply_count: 2,
									counts_max_create_date: "2024-01-02T12:00:00.000Z",
									edit: user_id === 10,
									image_uuids: null,
									favorited: false,
									replyed: false,
									voted: false,
									topics: "religion,media"
								}
							]
						}
					}
					
					// Handle User B's post
					if (slug === "user-bs-post" || slug === "User_Bs_Post") {
						return {
							rows: [
								{
									create_date: "2024-01-01T01:00:00.000Z",
									post_id: 2,
									title: "User B's Post",
									user_id: 20,
									display_name: "User B",
									display_name_index: "user-b",
									user_slug: "user-b",
									profile_picture_uuid: null,
									user_verified: true,
									slug: "user-bs-post",
									body: "This is User B's post with full content",
									poll_1: null,
									poll_2: null,
									poll_3: null,
									poll_4: null,
									poll_counts: null,
									poll_counts_estimated: null,
									note: null,
									favorite_count: 1,
									reply_count: 0,
									counts_max_create_date: "2024-01-01T01:00:00.000Z",
									edit: user_id === 20,
									image_uuids: null,
									favorited: false,
									replyed: false,
									voted: false,
									topics: "religion,media"
								}
							]
						}
					}
				}
				
				// Post ID lookup query
				if (sql.includes("SELECT p.post_id as post_id") && sql.includes("WHERE p.slug = $2")) {
					const slug = params?.[1] // Second param is slug
					if (slug === "user-as-post" || slug === "User_As_Post") {
						return {
							rows: [{ post_id: 1 }]
						}
					}
					if (slug === "user-bs-post" || slug === "User_Bs_Post") {
						return {
							rows: [{ post_id: 2 }]
						}
					}
					return {
						rows: [{ post_id: 1 }] // Default fallback
					}
				}
				
				// Root replies query
				if (sql.includes("SELECT") && sql.includes("r.reply_id as reply_id") && sql.includes("r.parent_reply_id IS NULL")) {
					// Check if this is after reply creation (looks for newer replies)
					// params[0] = user_id, params[1] = post_id, params[2] = min_reply_create_date, params[3] = max_reply_create_date
					if (params && params[2] && new Date(params[2]) >= new Date("2024-01-02T01:00:00.000Z")) {
						return {
							rows: [
								{
									create_date: "2024-01-02T03:00:00.000Z",
									reply_id: 201, // The newly created reply
									body: "Newly Created Reply Content",
									note: null,
									parent_reply_id: null,
									favorite_count: 0,
									counts_max_create_date: "2024-01-02T03:00:00.000Z",
									user_id: 10, // Same as logged-in user
									display_name: "Test User",
									display_name_index: "test-user",
									user_slug: "test-user",
									profile_picture_uuid: null,
									user_verified: true,
									edit: true,
									image_uuids: null,
									favorited: false
								}
							]
						}
					}
					
					// Default replies for initial load
					return {
						rows: [
							{
								create_date: "2024-01-02T01:00:00.000Z",
								reply_id: 101,
								body: "First reply to the post",
								note: null,
								parent_reply_id: null,
								favorite_count: 1,
								counts_max_create_date: "2024-01-02T01:00:00.000Z",
								user_id: 20,
								display_name: "Other User",
								display_name_index: "other-user",
								user_slug: "other-user",
								profile_picture_uuid: null,
								user_verified: true,
								edit: false,
								image_uuids: null,
								favorited: false
							}
						]
					}
				}
				
				// Reply replies query 
				if (sql.includes("SELECT") && sql.includes("r.reply_id as reply_id") && sql.includes("reply_ancestors")) {
					return {
						rows: [
							{
								create_date: "2024-01-02T02:00:00.000Z",
								reply_id: 102,
								body: "Reply to the first reply",
								note: null,
								parent_reply_id: 101,
								favorite_count: 0,
								counts_max_create_date: "2024-01-02T02:00:00.000Z",
								user_id: 30,
								display_name: "Reply User",
								display_name_index: "reply-user",
								user_slug: "reply-user",
								profile_picture_uuid: null,
								user_verified: true,
								edit: false,
								image_uuids: null,
								favorited: false
							}
						]
					}
				}
			},
			savePost: (sql, params) => {
				// Check if slug exists
				if (sql.includes("SELECT slug FROM posts WHERE slug = $1")) {
					return { rows: [] } // Slug doesn't exist
				}
				
				// Insert new post
				if (sql.includes("INSERT INTO posts") && sql.includes("RETURNING post_id")) {
					setPostCreatedInThisSession(true) // Mark that a post was created
					return { 
						rows: [{ post_id: 123 }] 
					}
				}
				
				// Get all topics for topic assignment
				if (sql.includes("SELECT topic_id, topic_name FROM topics")) {
					return { 
						rows: [
							{ topic_id: 1, topic_name: "religion" },
							{ topic_id: 2, topic_name: "media" }
						] 
					}
				}
				
				// Insert post topics
				if (sql.includes("INSERT INTO post_topics")) {
					return { rows: [] }
				}
				
				// Update existing post (for editing)
				if (sql.includes("UPDATE posts") && sql.includes("title = $1") && sql.includes("body = $3")) {
					// Capture the edited data
					setPostEditedInThisSession(true)
					setEditedPostData({
						title: params[0],
						body: params[2]  // body is the 3rd parameter (index 2)
					})
					return { rows: [] }
				}
				
				// Get existing images for cleanup (for editing)
				if (sql.includes("SELECT image_uuids") && sql.includes("FROM posts") && sql.includes("WHERE post_id = $1")) {
					return { rows: [{ image_uuids: "" }] } // No existing images
				}
				
				// Delete existing poll votes (for editing)
				if (sql.includes("DELETE FROM post_poll_votes") && sql.includes("WHERE post_id = $1")) {
					return { rows: [] }
				}
				
				// Update post with image UUIDs
				if (sql.includes("UPDATE posts") && sql.includes("image_uuids")) {
					return { rows: [] }
				}
				
				// Delete post topics (for editing)
				if (sql.includes("DELETE FROM post_topics")) {
					return { rows: [] }
				}
				
				// Update poll counts estimated
				if (sql.includes("UPDATE posts") && sql.includes("poll_counts_estimated")) {
					return { rows: [] }
				}
			},
			saveReply: (sql, params) => {
				// Post lookup by slug for reply creation
				if (sql.includes("SELECT post_id as post_id") && sql.includes("FROM posts") && sql.includes("WHERE slug = $1")) {
					return { rows: [{ post_id: 1 }] }
				}
				
				// Get post details for AI moderation context
				if (sql.includes("SELECT") && sql.includes("t.title") && sql.includes("t.body") && sql.includes("FROM posts t")) {
					return { 
						rows: [{ 
							title: "My Post",
							body: "This is my own post with full content",
							note: null,
							display_name: "Test User",
							image_uuids: null
						}] 
					}
				}
				
				// Insert new reply
				if (sql.includes("INSERT INTO replies") && sql.includes("RETURNING reply_id")) {
					global.replyCreatedInSession = true // Mark that a reply was created
					return { rows: [{ reply_id: 201 }] }
				}
				
				// Update post reply count
				if (sql.includes("UPDATE posts") && sql.includes("reply_count = COALESCE")) {
					return { rows: [] }
				}
				
				// Update reply image UUIDs
				if (sql.includes("UPDATE replies") && sql.includes("image_uuids")) {
					return { rows: [] }
				}
				
				// Update user display name (called from saveReply)
				if (sql.includes("UPDATE users") && sql.includes("display_name = $1")) {
					return { rows: [] }
				}
				
				// Get users to notify about reply
				if (sql.includes("SELECT user_id") && sql.includes("FROM posts") && sql.includes("UNION")) {
					// Return User A (post owner) to be notified when User B creates a reply
					return { rows: [{ user_id: 10 }] }
				}
				
				// Insert reply notification
				if (sql.includes("INSERT INTO reply_notifications")) {
					return { rows: [{ notification_id: 1 }] }
				}
				
				// Get subscriptions for push notifications
				if (sql.includes("SELECT") && sql.includes("subscription_json") && sql.includes("fcm_token")) {
					return { rows: [] }
				}
				
				// Get updated post counts
				if (sql.includes("SELECT") && sql.includes("t.post_id as post_id") && sql.includes("t.favorite_count")) {
					return { rows: [] }
				}
				
				// Get updated reply counts
				if (sql.includes("SELECT") && sql.includes("c.reply_id") && sql.includes("c.favorite_count")) {
					return { rows: [] }
				}
			},
			saveFavorite: (sql, params) => {
				// Insert favorite post
				if (sql.includes("INSERT INTO favorite_posts")) {
					return { rows: [] }
				}
				
				// Update post favorite count after adding/removing favorite
				if (sql.includes("UPDATE posts") && sql.includes("favorite_count = COALESCE")) {
					return { rows: [] }
				}
				
				// Delete favorite post (when unfavoriting)
				if (sql.includes("DELETE FROM favorite_posts")) {
					return { rows: [] }
				}
				
				// Insert favorite reply
				if (sql.includes("INSERT INTO favorite_replies")) {
					return { rows: [] }
				}
				
				// Update reply favorite count
				if (sql.includes("UPDATE replies") && sql.includes("favorite_count = COALESCE")) {
					return { rows: [] }
				}
				
				// Delete favorite reply (when unfavoriting)
				if (sql.includes("DELETE FROM favorite_replies")) {
					return { rows: [] }
				}
			},
			messageFlow: (sql, params) => {
				// User profile query for /user/user-a
				if (sql.includes("SELECT") && sql.includes("u.user_id") && sql.includes("u.display_name") && sql.includes("CASE WHEN (u.slug = '' OR u.slug IS NULL)")) {
					const user_slug = params?.[1] // Second param is user slug
					if (user_slug === "user-a") {
						return {
							rows: [{
								user_id: 10,
								display_name: "User A",
								display_name_index: "user-a",
								user_slug: "user-a",
								profile_picture_uuid: null,
								user_verified: true,
								subscribed: false // User B is not subscribed to User A
							}]
						}
					}
					if (user_slug === "user-b") {
						return {
							rows: [{
								user_id: 20,
								display_name: "User B",
								display_name_index: "user-b",
								user_slug: "user-b",
								profile_picture_uuid: null,
								user_verified: true,
								subscribed: false
							}]
						}
					}
				}
				
				// Check if participants exist (createConversation)
				if (sql.includes("SELECT user_id") && sql.includes("FROM users") && sql.includes("WHERE user_id = ANY($1)")) {
					return { rows: [{ user_id: 10 }, { user_id: 20 }] } // Both users exist
				}
				
				// Check for blocked relationships (createConversation)
				if (sql.includes("SELECT user_id_blocked") && sql.includes("FROM blocked_users")) {
					return { rows: [] } // No blocks
				}
				
				// Check if conversation already exists (createConversation)
				if (sql.includes("SELECT conversation_id") && sql.includes("FROM conversations") && sql.includes("participant_user_ids @> $1")) {
					return { rows: [] } // No existing conversation
				}
				
				// Create new conversation (createConversation)
				if (sql.includes("INSERT INTO conversations") && sql.includes("participant_user_ids") && sql.includes("RETURNING conversation_id")) {
					return { rows: [{ conversation_id: 100 }] } // New conversation ID
				}
				
				// Verify user is participant in conversation (sendMessage)
				if (sql.includes("SELECT participant_user_ids") && sql.includes("FROM conversations") && sql.includes("WHERE conversation_id = $1")) {
					return { rows: [{ participant_user_ids: [10, 20] }] } // User A and User B
				}
				
				// Insert new message (sendMessage)
				if (sql.includes("INSERT INTO messages") && sql.includes("RETURNING message_id")) {
					global.messageCreatedInSession = true // Mark that a message was created
					return { rows: [{ message_id: 500 }] } // New message ID
				}
				
				// Update message with image UUIDs (sendMessage)
				if (sql.includes("UPDATE messages") && sql.includes("SET image_uuids")) {
					return { rows: [] }
				}
				
				// Update conversation's last_message_id (sendMessage)
				if (sql.includes("UPDATE conversations") && sql.includes("SET last_message_id")) {
					return { rows: [] }
				}
				
				// Insert message notification (sendMessage)
				if (sql.includes("INSERT INTO message_notifications") && sql.includes("RETURNING notification_id")) {
					return { rows: [{ notification_id: 200 }] } // New notification ID
				}
				
				// Get subscriptions for push notifications (sendMessage)
				if (sql.includes("SELECT") && sql.includes("subscription_json") && sql.includes("fcm_token") && sql.includes("FROM subscriptions")) {
					return { rows: [] } // No push subscriptions
				}
				
				// Get messages for a conversation (getMessages)
				if (sql.includes("SELECT") && sql.includes("m.create_date") && sql.includes("m.message_id") && sql.includes("m.body") && sql.includes("m.sender_user_id")) {
					if (global.messageCreatedInSession) {
						// Return the message that was sent in this session
						return { 
							rows: [{
								create_date: "2024-01-03T02:26:00.000Z",
								message_id: 500,
								body: "Hello User A, this is a message from User B",
								image_uuids: null,
								sender_user_id: 20, // User B
								display_name: "User B",
								display_name_index: "user-b",
								user_slug: "user-b",
								profile_picture_uuid: null,
								user_verified: true,
								edit: false // User A viewing User B's message
							}]
						}
					} else {
						// Return empty messages initially (conversation just created)
						return { rows: [] }
					}
				}
				
				// Get conversations for a user (getConversations)
				if (sql.includes("SELECT") && sql.includes("c.conversation_id") && sql.includes("c.create_date") && sql.includes("c.last_message_id") && sql.includes("array_agg")) {
					const conversation_id = params?.[0] // First param is conversation_id when loading specific conversation
					if (conversation_id === 100) {
						// Return the conversation that was just created
						return {
							rows: [{
								conversation_id: 100,
								create_date: "2024-01-03T02:25:00.000Z",
								last_message_id: null,
								participants: [
									{
										user_id: 10,
										display_name: "User A",
										display_name_index: "user-a",
										user_slug: "user-a",
										profile_picture_uuid: null,
										user_verified: true
									},
									{
										user_id: 20,
										display_name: "User B", 
										display_name_index: "user-b",
										user_slug: "user-b",
										profile_picture_uuid: null,
										user_verified: true
									}
								],
								unread_count: 0
							}]
						}
					}
				}
			},
		},
		...databaseMocks, // Allow user to override or add more mocks
	}
}

module.exports = { setupDefaultDatabaseMocks }