const pool = require("./pool");

module.exports = {
  async init() {
    const client = await pool.pool.connect();
    try {
      /*await client.query(`
CREATE TABLE IF NOT EXISTS sessions (
session_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
session_uuid CHAR(36) NOT NULL,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
user_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
display_name VARCHAR(50),
display_name_index INT DEFAULT 0,
email VARCHAR(255),
password_hash BYTEA,
admin BOOL DEFAULT false,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
user_id INT NOT NULL,
session_id INT NOT NULL,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW(),
PRIMARY KEY (user_id, session_id)
);

CREATE TABLE IF NOT EXISTS reset_tokens (
token_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
user_id INT NOT NULL,
token_uuid CHAR(36) NOT NULL,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topics (
topic_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
title VARCHAR(140),
body VARCHAR(8000),
note VARCHAR(500),
slug VARCHAR(140),
comment_count INT DEFAULT 0,
favorite_count INT DEFAULT 0,
counts_max_create_date TIMESTAMP(3) NOT NULL DEFAULT NOW(),
user_id INT NOT NULL,
admin BOOL DEFAULT false,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_topics_create_date ON topics(create_date);
CREATE INDEX idx_topics_create_date_counts_max_create_date 
ON topics(create_date, counts_max_create_date)
STORING (comment_count, favorite_count);

CREATE TABLE IF NOT EXISTS comments (
comment_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
parent_topic_id INT,
parent_comment_id INT,
body VARCHAR(8000),
note VARCHAR(500),
favorite_count INT DEFAULT 0,
counts_max_create_date TIMESTAMP(3) NOT NULL DEFAULT NOW(),
user_id INT NOT NULL,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_comments_create_date ON comments(create_date);
CREATE INDEX idx_comments_parent_comment_id ON comments(parent_comment_id);
CREATE INDEX idx_comments_parent_topic_id ON comments(parent_topic_id);
CREATE INDEX idx_comments_create_date_counts_max_create_date 
ON comments(create_date, counts_max_create_date)
STORING (favorite_count);

CREATE TABLE IF NOT EXISTS comment_ancestors (
comment_id INT NOT NULL,
ancestor_id INT NOT NULL
);
CREATE INDEX idx_comment_ancestor ON comment_ancestors (comment_id, ancestor_id);
ALTER TABLE comment_ancestors
ADD CONSTRAINT unique_comment_ancestor UNIQUE (comment_id, ancestor_id);

CREATE TABLE IF NOT EXISTS topic_images (
topic_image_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
topic_id INT NOT NULL,
image_uuid CHAR(36) NOT NULL,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_topic_images_topic_id ON topic_images(topic_id) STORING (image_uuid);

CREATE TABLE IF NOT EXISTS comment_images (
comment_image_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
comment_id INT NOT NULL,
image_uuid CHAR(36) NOT NULL,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_comment_images_comment_id ON comment_images(comment_id) STORING (image_uuid);

CREATE TABLE IF NOT EXISTS subscriptions (
subscription_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
user_id INT NOT NULL,
subscription_json VARCHAR(1024),
fcm_token VARCHAR(1024),
active BOOL DEFAULT true,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id) STORING (subscription_json);

CREATE TABLE IF NOT EXISTS notifications (
notification_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
user_id INT NOT NULL,
comment_id INT,
read BOOL DEFAULT false,
seen BOOL DEFAULT false,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user_id_create_date_read_seen ON notifications(user_id, create_date, read, seen);
CREATE INDEX idx_notifications_comment_id ON notifications(comment_id);

CREATE TABLE IF NOT EXISTS favorite_topics (
favorite_topic_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
user_id INT NOT NULL,
topic_id INT NOT NULL,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_favorites_topics_user_id ON favorite_topics(user_id) STORING (topic_id);

CREATE TABLE IF NOT EXISTS favorite_comments (
favorite_comment_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
user_id INT NOT NULL,
comment_id INT NOT NULL,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_favorites_comments_user_id ON favorite_comments(user_id) STORING (comment_id);

CREATE TABLE IF NOT EXISTS flagged_comments (
flagged_comment_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
user_id INT NOT NULL,
comment_id INT NOT NULL,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flagged_topics (
flagged_topic_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
user_id INT NOT NULL,
topic_id INT NOT NULL,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blocked_users (
blocked_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
user_id_blocked INT NOT NULL,
user_id_blocking INT NOT NULL,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

      `);*/
      
    } catch (err) {
      console.error("error executing query:", err);
    } finally {
      client.release();
    }
  },
};
