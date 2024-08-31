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
profile_picture_uuid VARCHAR(36),
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
image_uuids VARCHAR(147),
comment_count INT DEFAULT 0,
favorite_count INT DEFAULT 0,
poll_counts VARCHAR(50),
poll_counts_estimated VARCHAR(50),
poll_1 VARCHAR(50),
poll_2 VARCHAR(50),
poll_3 VARCHAR(5p0),
poll_4 VARCHAR(50),
poll_expire_date TIMESTAMP(3),
counts_max_create_date TIMESTAMP(3) NOT NULL DEFAULT NOW(),
user_id INT NOT NULL,
admin BOOL DEFAULT false,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_topics_create_date ON topics(create_date);
CREATE INDEX idx_topics_create_date_counts_max_create_date 
ON topics(create_date, counts_max_create_date)
STORING (comment_count, favorite_count);
CREATE INDEX idx_topics_counts_max_create_date ON topics(counts_max_create_date) STORING (comment_count, create_date, favorite_count);

CREATE TABLE IF NOT EXISTS comments (
comment_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
parent_topic_id INT,
parent_comment_id INT,
body VARCHAR(8000),
note VARCHAR(500),
image_uuids VARCHAR(147),
favorite_count INT DEFAULT 0,
counts_max_create_date TIMESTAMP(3) NOT NULL DEFAULT NOW(),
user_id INT NOT NULL,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_comments_create_date ON comments(create_date) STORING (parent_topic_id, parent_comment_id, body, note, user_id, favorite_count, counts_max_create_date);
CREATE INDEX idx_comments_parent_comment_id ON comments(parent_comment_id);
CREATE INDEX idx_comments_parent_topic_id ON comments(parent_topic_id) STORING (user_id);
CREATE INDEX idx_comments_create_date_counts_max_create_date 
ON comments(create_date, counts_max_create_date)
STORING (favorite_count);
CREATE INDEX idx_comments_parent_topic_id_parent_comment_id_user_id ON comments (parent_topic_id, parent_comment_id, user_id) STORING (body, note, create_date, favorite_count, counts_max_create_date);

CREATE TABLE IF NOT EXISTS comment_ancestors (
comment_id INT NOT NULL,
ancestor_id INT NOT NULL
);
CREATE INDEX idx_comment_ancestor ON comment_ancestors (comment_id, ancestor_id);
ALTER TABLE comment_ancestors
ADD CONSTRAINT unique_comment_ancestor UNIQUE (comment_id, ancestor_id);

CREATE TABLE IF NOT EXISTS subscriptions (
subscription_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
user_id INT NOT NULL,
subscription_json VARCHAR(1024),
fcm_token VARCHAR(1024),
active BOOL DEFAULT true,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id) STORING (subscription_json, fcm_token, active);

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
CREATE INDEX idx_favorites_topics_topic_id ON favorite_topics(topic_id) STORING (user_id);

CREATE TABLE IF NOT EXISTS favorite_comments (
favorite_comment_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
user_id INT NOT NULL,
comment_id INT NOT NULL,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_favorites_comments_user_id ON favorite_comments(user_id) STORING (comment_id);
CREATE INDEX idx_favorites_comments_comment_id ON favorite_comments(comment_id) STORING (user_id);

CREATE TABLE IF NOT EXISTS flagged_comments (
flagged_comment_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
user_id INT NOT NULL,
comment_id INT NOT NULL,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_flagged_comments_comment_id ON flagged_comments(comment_id);

CREATE TABLE IF NOT EXISTS flagged_topics (
flagged_topic_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
user_id INT NOT NULL,
topic_id INT NOT NULL,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_flagged_topics_topic_id ON flagged_topics(topic_id);

CREATE TABLE IF NOT EXISTS blocked_users (
blocked_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
user_id_blocked INT NOT NULL,
user_id_blocking INT NOT NULL,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_blocked_users_user_id_blocking ON blocked_users(user_id_blocking) STORING (user_id_blocked);

CREATE TABLE IF NOT EXISTS poll_votes (
poll_vote_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
topic_id INT NOT NULL,
user_id INT NOT NULL,
poll_choice INT NOT NULL CHECK (poll_choice BETWEEN 1 AND 4),
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_poll_votes_topic_id_user_id ON poll_votes(topic_id, user_id);

CREATE TABLE IF NOT EXISTS topic_tags (
topic_id INT NOT NULL,
tag_id INT NOT NULL
);
CREATE INDEX idx_topic_tags_topic_id_tag_id ON topic_tags(topic_id, tag_id);
ALTER TABLE topic_tags
ADD CONSTRAINT unique_topic_tag UNIQUE (topic_id, tag_id);

CREATE TABLE IF NOT EXISTS tags (
tag_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
tag_name VARCHAR(10) NOT NULL,
subtitle VARCHAR(50) NOT NULL
);
CREATE INDEX idx_tags_tag_id_tag_name ON tags(tag_id, tag_name);

INSERT INTO TAGS (tag_name, subtitle) VALUES
('politics', 'Uniting our divides'),
('media', 'Movies, TV, books'),
('religion', 'Ethics, philosophy'),
('animals', 'Pets, nature'),
('asks', 'Requests, questions'),
('polls', 'Multiple choice'),
('sports', 'Anything competitive'),
('history', 'Anything before 2010'),
('weather', 'Seasons, environment'),
('food', 'Cooking, farming'),
('parenting', 'Advice, experiences'),
('health', 'Physical and mental'),
('science', 'Testing the falsifiable'),
('work', 'Jobs and money');

      `);*/
      
    } catch (err) {
      console.error("error executing query:", err);
    } finally {
      client.release();
    }
  },
};
