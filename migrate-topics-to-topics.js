#!/usr/bin/env node

/**
 * Phase 2 Migration: Tags → Topics
 * 
 * This script:
 * 1. Creates new tables using new_schema.js
 * 2. Copies data from old tables to new tables preserving IDs
 * 3. Maintains all relationships by using same ID values
 * 4. Resets sequences to proper next values
 * 
 * Usage: source .env && node migrate-tags-to-topics.js
 */

const pool = require('./server/pool');
const newSchema = require('./server/new_schema');

async function migrate() {
    console.log('🚀 Starting Phase 2 Migration: Tags → Topics');
    
    // Initialize the pool
    pool.init();
    const client = await pool.pool.connect();
    
    try {
        // Step 1: Create all new tables
        console.log('📋 Creating new tables...');
        await newSchema.init();
        console.log('✅ New tables created successfully');

        // Step 2: Copy tags → topics (preserving tag_id as topic_id)
        console.log('🏷️  Migrating tags → topics...');
        const tagsResult = await client.query(`
            INSERT INTO topics (
                topic_id, topic_name, subtitle
            )
            SELECT 
                tag_id, tag_name, subtitle
            FROM tags
            ON CONFLICT (topic_id) DO NOTHING
        `);
        console.log(`✅ Migrated ${tagsResult.rowCount} tags → topics`);

        // Step 3: Copy post_tags → post_topics (mapping foreign keys)
        console.log('🔗 Migrating post_tags → post_topics...');
        const postTagsResult = await client.query(`
            INSERT INTO post_topics (post_id, topic_id)
            SELECT post_id, tag_id
            FROM post_tags
            ON CONFLICT (post_id, topic_id) DO NOTHING
        `);
        console.log(`✅ Migrated ${postTagsResult.rowCount} post_tags → post_topics`);

        // Step 4: Reset sequences to proper next values
        console.log('🔄 Resetting sequences...');
        
        // Get max IDs and set sequences
        const maxTopicId = await client.query('SELECT COALESCE(MAX(topic_id), 0) + 1 as next_id FROM topics');
        
        // Reset sequence
        await client.query(`ALTER SEQUENCE topics_topic_id_seq RESTART WITH ${maxTopicId.rows[0].next_id}`);
        
        console.log('✅ Sequences reset successfully');

        // Step 5: Verify data integrity
        console.log('🔍 Verifying data integrity...');
        
        const verification = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM tags) as original_tags,
                (SELECT COUNT(*) FROM topics) as migrated_topics,
                (SELECT COUNT(*) FROM post_tags) as original_post_tags,
                (SELECT COUNT(*) FROM post_topics) as migrated_post_topics
        `);

        const counts = verification.rows[0];
        console.log('\n📊 Comprehensive Migration Summary:');
        console.log(`   Tags → Topics: ${counts.original_tags} → ${counts.migrated_topics}`);
        console.log(`   Post Tags → Post Topics: ${counts.original_post_tags} → ${counts.migrated_post_topics}`);

        // Check for any integrity issues
        const integrityCheck = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM post_topics WHERE post_id NOT IN (SELECT post_id FROM posts)) as orphaned_post_topics_posts,
                (SELECT COUNT(*) FROM post_topics WHERE topic_id NOT IN (SELECT topic_id FROM topics)) as orphaned_post_topics_topics
        `);

        const integrity = integrityCheck.rows[0];
        console.log('\n🔍 Comprehensive Integrity Check:');
        console.log(`   Orphaned post_topics (missing posts): ${integrity.orphaned_post_topics_posts}`);
        console.log(`   Orphaned post_topics (missing topics): ${integrity.orphaned_post_topics_topics}`);

        const hasIntegrityIssues = Object.values(integrity).some(count => count > 0);
        
        if (hasIntegrityIssues) {
            console.log('⚠️  WARNING: Data integrity issues detected!');
        } else {
            console.log('✅ Data integrity verified - no orphaned records found');
        }

        console.log('\n🎉 Phase 2 Migration completed successfully!');
        console.log('📝 Next steps:');
        console.log('   1. Update server code to use new table names (tags → topics)');
        console.log('   2. Update frontend code to use new terminology');
        console.log('   3. Update all tests');
        console.log('   4. When confident, drop old tables (tags and post_tags)');

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