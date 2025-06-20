# Messaging/Conversations Consistency Review Instructions

## Goal
Review every line of the messaging and conversations feature to ensure complete consistency with the rest of the codebase.

## Approach
Use existing features (posts, replies, notifications) as the authoritative reference for all design decisions.

## Areas to Examine

### 1. Naming Conventions
- Database schema (table names, column names)
- Function names (client and server)
- Variable names
- API endpoints
- File names
- WebSocket event names

### 2. Architecture Patterns
- What data flows over HTTP vs WebSockets
- When to create new functions vs inline code
- Function length and complexity
- Code organization and file structure

### 3. Implementation Patterns
- Database query patterns
- API response formats
- Error handling approaches
- Cache update strategies
- DOM manipulation patterns
- State management patterns

### 4. Testing Patterns
- Test file naming
- Test structure and organization
- Assertion patterns
- Selector usage

## Process
1. For each aspect of messaging/conversations, find the equivalent pattern in posts/replies/notifications
2. Document the current implementation vs the expected pattern
3. Refactor to match the established pattern
4. Ensure tests pass after each change

## Guiding Principle
Every decision should answer: "How is this done elsewhere in the codebase?"