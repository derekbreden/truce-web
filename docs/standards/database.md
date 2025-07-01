# Database Standards

## SQL Style

- **Quotes**: Use double quotes for identifiers, single quotes for strings
- **Keywords**: Use UPPERCASE for SQL keywords (`SELECT`, `FROM`, `WHERE`)
- **Indentation**: Align clauses for readability
- **Parameters**: Use parameterized queries with `$1`, `$2` syntax

## Schema Patterns

- **Primary keys**: Use `id` for auto-incrementing primary keys
- **Foreign keys**: Use `{table}_id` naming convention
- **Timestamps**: Use `create_date`, `update_date` with consistent naming
- **Booleans**: Use clear boolean column names like `is_verified`, `has_permission`

## ID Conventions

**Critical distinction**: UUIDs are used ONLY for specific cases:

**UUIDs (CHAR(36))**:
- **S3 stored images**: `profile_picture_uuid`, `image_uuids`
- **Sessions**: `session_uuid` for client identification
- **Reset tokens**: `token_uuid` for password reset

**Auto-incrementing INTEGERs** (everything else):
- **Users**: `user_id`
- **Posts**: `post_id`
- **Replies**: `reply_id`
- **Messages**: `message_id`
- **Conversations**: `conversation_id`
- **All other entities**

**Rationale**: UUIDs prevent enumeration attacks for S3 images and provide session security. Integers are more efficient for all internal references and relationships.

## Migration Approach

- **Schema file**: Single `schema.sql` file for structure
- **Fixtures**: Separate `fixtures.sql` for test data
- **Production**: Manual migration management (no ORM)

## Query Patterns

### Session Validation
```sql
SELECT user_id FROM sessions 
WHERE session_uuid = $1 AND expires_at > NOW()
```

### Joins
```sql
SELECT p.*, u.display_name 
FROM posts p
JOIN users u ON p.user_id = u.user_id
WHERE p.is_visible = true
ORDER BY p.create_date DESC
```

### Pagination
```sql
SELECT * FROM posts 
WHERE create_date < $1
ORDER BY create_date DESC 
LIMIT $2
```

## Data Types

- **IDs**: `INTEGER` for auto-increment, `CHAR(36)` for UUIDs
- **Dates**: `TIMESTAMP` with timezone awareness
- **Text**: Use `TEXT` for variable length, `VARCHAR(n)` only when length matters
- **JSON**: Use PostgreSQL `JSONB` for structured data

## Performance Considerations

- **Indexes**: Add indexes for frequently queried columns
- **Relationships**: Use proper foreign key constraints
- **Transactions**: Wrap related operations in transactions
- **Prepared statements**: Always use parameterized queries for security