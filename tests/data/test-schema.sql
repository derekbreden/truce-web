-- SQLite Schema for Truce Web Test Database
-- Converted from PostgreSQL schema in server/schema.js

-- Sessions table
CREATE TABLE sessions (
    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_uuid CHAR(36) NOT NULL,
    create_date DATETIME DEFAULT TEST_TIMESTAMP
);

-- Users table  
CREATE TABLE users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    display_name VARCHAR(50) DEFAULT '',
    display_name_index INT DEFAULT 0,
    email VARCHAR(255) DEFAULT '',
    password_hash BLOB,
    profile_picture_uuid VARCHAR(36) DEFAULT '',
    admin BOOLEAN DEFAULT 0,
    slug VARCHAR(70) DEFAULT '',
    bio VARCHAR(500) DEFAULT '',
    subscribed_to_users INT DEFAULT 0,
    create_date DATETIME DEFAULT TEST_TIMESTAMP
);

-- User sessions table (links sessions to users)
CREATE TABLE user_sessions (
    user_id INT NOT NULL,
    session_id INT NOT NULL,
    create_date DATETIME DEFAULT TEST_TIMESTAMP,
    PRIMARY KEY (user_id, session_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- Reset tokens table
CREATE TABLE reset_tokens (
    token_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT NOT NULL,
    token_uuid CHAR(36) NOT NULL,
    create_date DATETIME DEFAULT CURRENT_TIMESTAMP, -- An exception to the use real current time
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Posts table
CREATE TABLE posts (
    post_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(140) DEFAULT '',
    body VARCHAR(8000) DEFAULT '',
    note VARCHAR(500) DEFAULT '',
    slug VARCHAR(140) DEFAULT '',
    image_uuids VARCHAR(147) DEFAULT '',
    image_dimensions VARCHAR(31) DEFAULT '',
    reply_count INT DEFAULT 0,
    favorite_count INT DEFAULT 0,
    poll_counts VARCHAR(50) DEFAULT '',
    poll_counts_estimated VARCHAR(50) DEFAULT '',
    poll_1 VARCHAR(50) DEFAULT '',
    poll_2 VARCHAR(50) DEFAULT '',
    poll_3 VARCHAR(50) DEFAULT '',
    poll_4 VARCHAR(50) DEFAULT '',
    poll_expire_date DATETIME,
    counts_max_create_date DATETIME DEFAULT TEST_TIMESTAMP,
    user_id INT NOT NULL,
    admin BOOLEAN DEFAULT 0,
    create_date DATETIME DEFAULT TEST_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
CREATE INDEX idx_posts_create_date ON posts(create_date);

-- Replies table
CREATE TABLE replies (
    reply_id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_post_id INT,
    parent_reply_id INT,
    body VARCHAR(8000) DEFAULT '',
    note VARCHAR(500) DEFAULT '',
    image_uuids VARCHAR(147) DEFAULT '',
    image_dimensions VARCHAR(31) DEFAULT '',
    favorite_count INT DEFAULT 0,
    counts_max_create_date DATETIME DEFAULT TEST_TIMESTAMP,
    user_id INT NOT NULL,
    create_date DATETIME DEFAULT TEST_TIMESTAMP,
    FOREIGN KEY (parent_post_id) REFERENCES posts(post_id),
    FOREIGN KEY (parent_reply_id) REFERENCES replies(reply_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
CREATE INDEX idx_replies_create_date ON replies(create_date);
CREATE INDEX idx_replies_parent_reply_id ON replies(parent_reply_id);
CREATE INDEX idx_replies_parent_post_id ON replies(parent_post_id);

-- Reply ancestors table
CREATE TABLE reply_ancestors (
    reply_id INT NOT NULL,
    ancestor_reply_id INT NOT NULL,
    UNIQUE(reply_id, ancestor_reply_id),
    FOREIGN KEY (reply_id) REFERENCES replies(reply_id),
    FOREIGN KEY (ancestor_reply_id) REFERENCES replies(reply_id)
);

-- Subscriptions table
CREATE TABLE subscriptions (
    subscription_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT NOT NULL,
    subscription_json VARCHAR(1024) DEFAULT '',
    fcm_token VARCHAR(1024) DEFAULT '',
    active BOOLEAN DEFAULT 1,
    create_date DATETIME DEFAULT TEST_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Notifications table
CREATE TABLE notifications (
    notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT NOT NULL,
    reply_id INT,
    read BOOLEAN DEFAULT 0,
    seen BOOLEAN DEFAULT 0,
    create_date DATETIME DEFAULT TEST_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (reply_id) REFERENCES replies(reply_id)
);

-- Favorite posts table
CREATE TABLE favorite_posts (
    favorite_post_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    create_date DATETIME DEFAULT TEST_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (post_id) REFERENCES posts(post_id)
);

-- Favorite replies table
CREATE TABLE favorite_replies (
    favorite_reply_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT NOT NULL,
    reply_id INT NOT NULL,
    create_date DATETIME DEFAULT TEST_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (reply_id) REFERENCES replies(reply_id)
);

-- Flagged replies table
CREATE TABLE flagged_replies (
    flagged_reply_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT NOT NULL,
    reply_id INT NOT NULL,
    create_date DATETIME DEFAULT TEST_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (reply_id) REFERENCES replies(reply_id)
);

-- Flagged posts table
CREATE TABLE flagged_posts (
    flagged_post_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    create_date DATETIME DEFAULT TEST_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (post_id) REFERENCES posts(post_id)
);

-- Blocked users table
CREATE TABLE blocked_users (
    blocked_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id_blocked INT NOT NULL,
    user_id_blocking INT NOT NULL,
    create_date DATETIME DEFAULT TEST_TIMESTAMP,
    FOREIGN KEY (user_id_blocked) REFERENCES users(user_id),
    FOREIGN KEY (user_id_blocking) REFERENCES users(user_id)
);

-- Poll votes table
CREATE TABLE poll_votes (
    poll_vote_id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    poll_choice INT NOT NULL CHECK (poll_choice BETWEEN 1 AND 4),
    create_date DATETIME DEFAULT TEST_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(post_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Post topics table
CREATE TABLE post_topics (
    post_id INT NOT NULL,
    topic_id INT NOT NULL,
    UNIQUE(post_id, topic_id),
    FOREIGN KEY (post_id) REFERENCES posts(post_id),
    FOREIGN KEY (topic_id) REFERENCES topics(topic_id)
);

-- Topics table
CREATE TABLE topics (
    topic_id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_name VARCHAR(10) NOT NULL UNIQUE,
    subtitle VARCHAR(50) NOT NULL
);

-- Subscribers table
CREATE TABLE subscribers (
    subscriber_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT NOT NULL,
    subscribed_to_user_id INT NOT NULL,
    create_date DATETIME DEFAULT TEST_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (subscribed_to_user_id) REFERENCES users(user_id)
);

-- Conversations table
CREATE TABLE conversations (
    conversation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    last_message_id INT,
    create_date DATETIME DEFAULT TEST_TIMESTAMP,
    FOREIGN KEY (last_message_id) REFERENCES messages(message_id)
);

-- Conversation users table
CREATE TABLE conversation_users (
    conversation_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    PRIMARY KEY (conversation_id, user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_conversation_users_user ON conversation_users(user_id);

-- Messages table
CREATE TABLE messages (
    message_id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    body VARCHAR(8000) DEFAULT '',
    note VARCHAR(500) DEFAULT '',
    image_uuids VARCHAR(147) DEFAULT '',
    image_dimensions VARCHAR(31) DEFAULT '',
    create_date DATETIME DEFAULT TEST_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Message notifications table
CREATE TABLE message_notifications (
    notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT NOT NULL,
    message_id INT NOT NULL,
    read BOOLEAN DEFAULT 0,
    seen BOOLEAN DEFAULT 0,
    create_date DATETIME DEFAULT TEST_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (message_id) REFERENCES messages(message_id)
);

-- Reply notifications table (inferred from usage)
CREATE TABLE reply_notifications (
    notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT NOT NULL,
    reply_id INT NOT NULL,
    read BOOLEAN DEFAULT 0,
    seen BOOLEAN DEFAULT 0,
    create_date DATETIME DEFAULT TEST_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (reply_id) REFERENCES replies(reply_id)
);