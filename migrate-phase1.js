#!/usr/bin/env node

/**
 * Phase 1 Migration: Topics → Posts, Comments → Replies
 * 
 * This script:
 * 1. Creates new tables using new_schema.js
 * 2. Copies data from old tables to new tables preserving IDs
 * 3. Maintains all relationships by using same ID values
 * 4. Resets sequences to proper next values
 * 
 * Usage: source .env && node migrate-phase1.js
 */

const pool = require('./server/pool');
const newSchema = require('./server/new_schema');

async function migrate() {
    console.log('🚀 Starting Phase 1 Migration: Topics → Posts, Comments → Replies');
    
    // Initialize the pool
    pool.init();
    const client = await pool.pool.connect();
    
    try {
        // Step 1: Create all new tables
        console.log('📋 Creating new tables...');
        await newSchema.init();
        console.log('✅ New tables created successfully');

        // Step 2: Copy topics → posts (preserving topic_id as post_id)
        console.log('📦 Migrating topics → posts...');
        const topicsResult = await client.query(`
            INSERT INTO posts (
                post_id, title, body, note, slug, image_uuids,
                comment_count, favorite_count, poll_counts, poll_counts_estimated,
                poll_1, poll_2, poll_3, poll_4, poll_expire_date,
                counts_max_create_date, user_id, admin, create_date
            )
            SELECT 
                topic_id, title, body, note, slug, image_uuids,
                comment_count, favorite_count, poll_counts, poll_counts_estimated,
                poll_1, poll_2, poll_3, poll_4, poll_expire_date,
                counts_max_create_date, user_id, admin, create_date
            FROM topics
            ON CONFLICT (post_id) DO NOTHING
        `);
        console.log(`✅ Migrated ${topicsResult.rowCount} topics → posts`);

        // Step 3: Copy comments → replies (preserving comment_id as reply_id, mapping foreign keys)
        console.log('💬 Migrating comments → replies...');
        const commentsResult = await client.query(`
            INSERT INTO replies (
                reply_id, parent_post_id, parent_reply_id, body, note, image_uuids,
                favorite_count, counts_max_create_date, user_id, create_date
            )
            SELECT 
                comment_id, parent_topic_id, parent_comment_id, body, note, image_uuids,
                favorite_count, counts_max_create_date, user_id, create_date
            FROM comments
            ON CONFLICT (reply_id) DO NOTHING
        `);
        console.log(`✅ Migrated ${commentsResult.rowCount} comments → replies`);

        // Step 4: Copy comment_ancestors → reply_ancestors
        console.log('🔗 Migrating comment_ancestors → reply_ancestors...');
        const ancestorsResult = await client.query(`
            INSERT INTO reply_ancestors (reply_id, ancestor_reply_id)
            SELECT comment_id, ancestor_id
            FROM comment_ancestors
            ON CONFLICT (reply_id, ancestor_reply_id) DO NOTHING
        `);
        console.log(`✅ Migrated ${ancestorsResult.rowCount} comment ancestors → reply ancestors`);

        // Step 5: Copy topic_tags → post_tags
        console.log('🏷️  Migrating topic_tags → post_tags...');
        const topicTagsResult = await client.query(`
            INSERT INTO post_tags (post_id, tag_id)
            SELECT topic_id, tag_id
            FROM topic_tags
            ON CONFLICT (post_id, tag_id) DO NOTHING
        `);
        console.log(`✅ Migrated ${topicTagsResult.rowCount} topic tags → post tags`);

        // Step 6: Copy favorite_topics → favorite_posts
        console.log('❤️  Migrating favorite_topics → favorite_posts...');
        const favoriteTopicsResult = await client.query(`
            INSERT INTO favorite_posts (favorite_post_id, user_id, post_id, create_date)
            SELECT favorite_topic_id, user_id, topic_id, create_date
            FROM favorite_topics
            ON CONFLICT (favorite_post_id) DO NOTHING
        `);
        console.log(`✅ Migrated ${favoriteTopicsResult.rowCount} favorite topics → favorite posts`);

        // Step 7: Copy favorite_comments → favorite_replies
        console.log('💕 Migrating favorite_comments → favorite_replies...');
        const favoriteCommentsResult = await client.query(`
            INSERT INTO favorite_replies (favorite_reply_id, user_id, reply_id, create_date)
            SELECT favorite_comment_id, user_id, comment_id, create_date
            FROM favorite_comments
            ON CONFLICT (favorite_reply_id) DO NOTHING
        `);
        console.log(`✅ Migrated ${favoriteCommentsResult.rowCount} favorite comments → favorite replies`);

        // Step 8: Copy flagged_topics → flagged_posts
        console.log('🚩 Migrating flagged_topics → flagged_posts...');
        const flaggedTopicsResult = await client.query(`
            INSERT INTO flagged_posts (flagged_post_id, user_id, post_id, create_date)
            SELECT flagged_topic_id, user_id, topic_id, create_date
            FROM flagged_topics
            ON CONFLICT (flagged_post_id) DO NOTHING
        `);
        console.log(`✅ Migrated ${flaggedTopicsResult.rowCount} flagged topics → flagged posts`);

        // Step 9: Copy flagged_comments → flagged_replies
        console.log('🚨 Migrating flagged_comments → flagged_replies...');
        const flaggedCommentsResult = await client.query(`
            INSERT INTO flagged_replies (flagged_reply_id, user_id, reply_id, create_date)
            SELECT flagged_comment_id, user_id, comment_id, create_date
            FROM flagged_comments
            ON CONFLICT (flagged_reply_id) DO NOTHING
        `);
        console.log(`✅ Migrated ${flaggedCommentsResult.rowCount} flagged comments → flagged replies`);

        // Step 10: Copy poll_votes → post_poll_votes
        console.log('🗳️  Migrating poll_votes → post_poll_votes...');
        const pollVotesResult = await client.query(`
            INSERT INTO post_poll_votes (poll_vote_id, post_id, user_id, poll_choice, create_date)
            SELECT poll_vote_id, topic_id, user_id, poll_choice, create_date
            FROM poll_votes
            ON CONFLICT (poll_vote_id) DO NOTHING
        `);
        console.log(`✅ Migrated ${pollVotesResult.rowCount} poll votes → post poll votes`);

        // Step 11: Copy notifications → reply_notifications
        console.log('🔔 Migrating notifications → reply_notifications...');
        const notificationsResult = await client.query(`
            INSERT INTO reply_notifications (notification_id, user_id, reply_id, read, seen, create_date)
            SELECT notification_id, user_id, comment_id, read, seen, create_date
            FROM notifications
            ON CONFLICT (notification_id) DO NOTHING
        `);
        console.log(`✅ Migrated ${notificationsResult.rowCount} comment notifications → reply notifications`);

        // Step 12: Reset sequences to proper next values
        console.log('🔄 Resetting sequences...');
        
        // Get max IDs and set sequences
        const maxPostId = await client.query('SELECT COALESCE(MAX(post_id), 0) + 1 as next_id FROM posts');
        const maxReplyId = await client.query('SELECT COALESCE(MAX(reply_id), 0) + 1 as next_id FROM replies');
        const maxFavoritePostId = await client.query('SELECT COALESCE(MAX(favorite_post_id), 0) + 1 as next_id FROM favorite_posts');
        const maxFavoriteReplyId = await client.query('SELECT COALESCE(MAX(favorite_reply_id), 0) + 1 as next_id FROM favorite_replies');
        const maxFlaggedPostId = await client.query('SELECT COALESCE(MAX(flagged_post_id), 0) + 1 as next_id FROM flagged_posts');
        const maxFlaggedReplyId = await client.query('SELECT COALESCE(MAX(flagged_reply_id), 0) + 1 as next_id FROM flagged_replies');
        const maxPollVoteId = await client.query('SELECT COALESCE(MAX(poll_vote_id), 0) + 1 as next_id FROM post_poll_votes');
        const maxNotificationId = await client.query('SELECT COALESCE(MAX(notification_id), 0) + 1 as next_id FROM reply_notifications');

        // Reset sequences
        await client.query(`ALTER SEQUENCE posts_post_id_seq RESTART WITH ${maxPostId.rows[0].next_id}`);
        await client.query(`ALTER SEQUENCE replies_reply_id_seq RESTART WITH ${maxReplyId.rows[0].next_id}`);
        await client.query(`ALTER SEQUENCE favorite_posts_favorite_post_id_seq RESTART WITH ${maxFavoritePostId.rows[0].next_id}`);
        await client.query(`ALTER SEQUENCE favorite_replies_favorite_reply_id_seq RESTART WITH ${maxFavoriteReplyId.rows[0].next_id}`);
        await client.query(`ALTER SEQUENCE flagged_posts_flagged_post_id_seq RESTART WITH ${maxFlaggedPostId.rows[0].next_id}`);
        await client.query(`ALTER SEQUENCE flagged_replies_flagged_reply_id_seq RESTART WITH ${maxFlaggedReplyId.rows[0].next_id}`);
        await client.query(`ALTER SEQUENCE post_poll_votes_poll_vote_id_seq RESTART WITH ${maxPollVoteId.rows[0].next_id}`);
        await client.query(`ALTER SEQUENCE reply_notifications_notification_id_seq RESTART WITH ${maxNotificationId.rows[0].next_id}`);

        console.log('✅ Sequences reset successfully');

        // Step 13: Verify data integrity
        console.log('🔍 Verifying data integrity...');
        
        const verification = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM topics) as original_topics,
                (SELECT COUNT(*) FROM posts) as migrated_posts,
                (SELECT COUNT(*) FROM comments) as original_comments,
                (SELECT COUNT(*) FROM replies) as migrated_replies,
                (SELECT COUNT(*) FROM topic_tags) as original_topic_tags,
                (SELECT COUNT(*) FROM post_tags) as migrated_post_tags,
                (SELECT COUNT(*) FROM poll_votes) as original_poll_votes,
                (SELECT COUNT(*) FROM post_poll_votes) as migrated_poll_votes,
                (SELECT COUNT(*) FROM favorite_topics) as original_favorite_topics,
                (SELECT COUNT(*) FROM favorite_posts) as migrated_favorite_posts,
                (SELECT COUNT(*) FROM favorite_comments) as original_favorite_comments,
                (SELECT COUNT(*) FROM favorite_replies) as migrated_favorite_replies,
                (SELECT COUNT(*) FROM flagged_topics) as original_flagged_topics,
                (SELECT COUNT(*) FROM flagged_posts) as migrated_flagged_posts,
                (SELECT COUNT(*) FROM flagged_comments) as original_flagged_comments,
                (SELECT COUNT(*) FROM flagged_replies) as migrated_flagged_replies,
                (SELECT COUNT(*) FROM notifications) as original_notifications,
                (SELECT COUNT(*) FROM reply_notifications) as migrated_reply_notifications,
                (SELECT COUNT(*) FROM comment_ancestors) as original_comment_ancestors,
                (SELECT COUNT(*) FROM reply_ancestors) as migrated_reply_ancestors
        `);

        const counts = verification.rows[0];
        console.log('\n📊 Comprehensive Migration Summary:');
        console.log(`   Topics → Posts: ${counts.original_topics} → ${counts.migrated_posts}`);
        console.log(`   Comments → Replies: ${counts.original_comments} → ${counts.migrated_replies}`);
        console.log(`   Topic Tags → Post Tags: ${counts.original_topic_tags} → ${counts.migrated_post_tags}`);
        console.log(`   Poll Votes → Post Poll Votes: ${counts.original_poll_votes} → ${counts.migrated_poll_votes}`);
        console.log(`   Favorite Topics → Favorite Posts: ${counts.original_favorite_topics} → ${counts.migrated_favorite_posts}`);
        console.log(`   Favorite Comments → Favorite Replies: ${counts.original_favorite_comments} → ${counts.migrated_favorite_replies}`);
        console.log(`   Flagged Topics → Flagged Posts: ${counts.original_flagged_topics} → ${counts.migrated_flagged_posts}`);
        console.log(`   Flagged Comments → Flagged Replies: ${counts.original_flagged_comments} → ${counts.migrated_flagged_replies}`);
        console.log(`   Notifications → Reply Notifications: ${counts.original_notifications} → ${counts.migrated_reply_notifications}`);
        console.log(`   Comment Ancestors → Reply Ancestors: ${counts.original_comment_ancestors} → ${counts.migrated_reply_ancestors}`);

        // Check for any integrity issues
        const integrityCheck = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM replies WHERE parent_post_id IS NOT NULL AND parent_post_id NOT IN (SELECT post_id FROM posts)) as orphaned_replies,
                (SELECT COUNT(*) FROM replies WHERE parent_reply_id IS NOT NULL AND parent_reply_id NOT IN (SELECT reply_id FROM replies)) as orphaned_reply_parents,
                (SELECT COUNT(*) FROM reply_ancestors WHERE reply_id NOT IN (SELECT reply_id FROM replies)) as orphaned_ancestors_reply,
                (SELECT COUNT(*) FROM reply_ancestors WHERE ancestor_reply_id NOT IN (SELECT reply_id FROM replies)) as orphaned_ancestors_ancestor,
                (SELECT COUNT(*) FROM post_poll_votes WHERE post_id NOT IN (SELECT post_id FROM posts)) as orphaned_poll_votes,
                (SELECT COUNT(*) FROM favorite_posts WHERE post_id NOT IN (SELECT post_id FROM posts)) as orphaned_favorite_posts,
                (SELECT COUNT(*) FROM favorite_replies WHERE reply_id NOT IN (SELECT reply_id FROM replies)) as orphaned_favorite_replies,
                (SELECT COUNT(*) FROM flagged_posts WHERE post_id NOT IN (SELECT post_id FROM posts)) as orphaned_flagged_posts,
                (SELECT COUNT(*) FROM flagged_replies WHERE reply_id NOT IN (SELECT reply_id FROM replies)) as orphaned_flagged_replies,
                (SELECT COUNT(*) FROM reply_notifications WHERE reply_id IS NOT NULL AND reply_id NOT IN (SELECT reply_id FROM replies)) as orphaned_notifications,
                (SELECT COUNT(*) FROM post_tags WHERE post_id NOT IN (SELECT post_id FROM posts)) as orphaned_post_tags_posts,
                (SELECT COUNT(*) FROM post_tags WHERE tag_id NOT IN (SELECT tag_id FROM tags)) as orphaned_post_tags_tags
        `);

        const integrity = integrityCheck.rows[0];
        console.log('\n🔍 Comprehensive Integrity Check:');
        console.log(`   Orphaned replies (missing parent posts): ${integrity.orphaned_replies}`);
        console.log(`   Orphaned replies (missing parent replies): ${integrity.orphaned_reply_parents}`);
        console.log(`   Orphaned reply ancestors (missing reply): ${integrity.orphaned_ancestors_reply}`);
        console.log(`   Orphaned reply ancestors (missing ancestor): ${integrity.orphaned_ancestors_ancestor}`);
        console.log(`   Orphaned poll votes: ${integrity.orphaned_poll_votes}`);
        console.log(`   Orphaned favorite posts: ${integrity.orphaned_favorite_posts}`);
        console.log(`   Orphaned favorite replies: ${integrity.orphaned_favorite_replies}`);
        console.log(`   Orphaned flagged posts: ${integrity.orphaned_flagged_posts}`);
        console.log(`   Orphaned flagged replies: ${integrity.orphaned_flagged_replies}`);
        console.log(`   Orphaned reply notifications: ${integrity.orphaned_notifications}`);
        console.log(`   Orphaned post tags (missing posts): ${integrity.orphaned_post_tags_posts}`);
        console.log(`   Orphaned post tags (missing tags): ${integrity.orphaned_post_tags_tags}`);

        const hasIntegrityIssues = Object.values(integrity).some(count => count > 0);
        
        if (hasIntegrityIssues) {
            console.log('⚠️  WARNING: Data integrity issues detected!');
        } else {
            console.log('✅ Data integrity verified - no orphaned records found');
        }

        console.log('\n🎉 Phase 1 Migration completed successfully!');
        console.log('📝 Next steps:');
        console.log('   1. Update server code to use new table names');
        console.log('   2. Update frontend code to use new terminology');
        console.log('   3. Update all tests');
        console.log('   4. When confident, drop old tables');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.pool.end();
    }
}

// Run migration if called directly
if (require.main === module) {
    migrate().catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
}

module.exports = { migrate };