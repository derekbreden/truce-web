-- SQLite Test Fixtures for Truce Web
-- This replaces the hardcoded JavaScript mock data with actual SQL inserts

-- Insert topics first (reordered to match test expectations - Religion first)
INSERT INTO topics (topic_id, topic_name, subtitle) VALUES
(1, 'religion', 'Ethics, philosophy'),
(2, 'media', 'Movies, TV, books'),
(3, 'politics', 'Uniting our divides'),
(4, 'animals', 'Pets, nature'),
(5, 'asks', 'Requests, questions'),
(6, 'polls', 'Multiple choice'),
(7, 'sports', 'Anything competitive'),
(8, 'history', 'Anything before 2010'),
(9, 'weather', 'Seasons, environment'),
(10, 'food', 'Cooking, farming'),
(11, 'parenting', 'Advice, experiences'),
(12, 'health', 'Physical and mental'),
(13, 'science', 'Testing the falsifiable'),
(14, 'work', 'Jobs and money');

-- Insert test users
INSERT INTO users (user_id, display_name, display_name_index, email, slug, profile_picture_uuid, admin, subscribed_to_users) VALUES
(10, 'User A', 0, 'usera@example.com', 'user-a', NULL, 0, 0),
(20, 'User B', 0, 'userb@example.com', 'user-b', NULL, 0, 0),
(30, 'User C', 0, 'userc@example.com', 'user-c', NULL, 0, 0),
(40, 'Existing User', 0, 'existing@example.com', 'existing-user', NULL, 0, 0);

-- Insert test sessions
INSERT INTO sessions (session_id, session_uuid) VALUES
(1, 'user-a-session-123'),
(2, 'user-b-session-456');

-- Insert user sessions (link sessions to users)
INSERT INTO user_sessions (session_id, user_id) VALUES
(1, 10),
(2, 20);

-- Insert test posts
INSERT INTO posts (post_id, user_id, title, body, slug, create_date, favorite_count, reply_count, counts_max_create_date, admin) VALUES
(1, 10, 'User A''s Post', 'This is User A''s own post with full content', 'user-as-post', '2024-01-02T00:00:00.000Z', 0, 0, '2024-01-02T00:00:00.000Z', 0),
(2, 20, 'User B''s Post', 'This is User B''s post', 'user-bs-post', '2024-01-01T01:00:00.000Z', 0, 0, '2024-01-01T01:00:00.000Z', 0);

-- Link posts to topics (using new topic_id assignments)
INSERT INTO post_topics (post_id, topic_id) VALUES
(1, 1),
(1, 2),
(2, 1),
(2, 2);

-- Create some test replies first 
INSERT INTO replies (reply_id, parent_post_id, parent_reply_id, user_id, body, create_date) VALUES
(1, 1, NULL, 20, 'First reply to the post', '2024-01-02T01:00:00.000Z'),
(2, 1, 1, 10, 'Reply to the first reply', '2024-01-02T02:00:00.000Z'),
(97, 2, NULL, 20, 'This was an old reply to User A', '2023-12-30T00:00:00.000Z'),
(98, 2, NULL, 20, 'First notification for User A', '2024-01-01T00:00:00.000Z'),
(99, 2, NULL, 20, 'Second notification for User A', '2023-12-31T00:00:00.000Z'),
(100, 2, NULL, 20, 'Great point!', '2023-12-31T00:00:00.000Z');

-- Insert reply ancestors for nested replies
INSERT INTO reply_ancestors (reply_id, ancestor_reply_id) VALUES
(2, 1); -- Reply 2 is a child of reply 1

-- Insert initial reply notifications (from mock data)
INSERT INTO reply_notifications (notification_id, user_id, reply_id, read, seen, create_date) VALUES
(1, 10, 98, 0, 0, '2024-01-01T00:00:00.000Z'),
(2, 10, 99, 0, 1, '2023-12-31T00:00:00.000Z'),
(97, 10, 97, 1, 1, '2023-12-30T00:00:00.000Z');

-- Insert favorite posts (User A has favorited one post)
INSERT INTO favorite_posts (favorite_post_id, user_id, post_id, create_date) VALUES
(1, 10, 2, '2024-01-01T02:00:00.000Z');

-- Insert favorite replies (User A has favorited one reply)
INSERT INTO favorite_replies (favorite_reply_id, user_id, reply_id, create_date) VALUES
(1, 10, 100, '2024-01-02T03:00:00.000Z');

-- Set password hash for existing user (password: "existingpass123")
UPDATE users SET password_hash = 'mocked_hash_existingpass123' WHERE user_id = 40;