# Documentation

This documentation covers a **social media platform** with several non-standard architectural approaches that differentiate it from typical web applications.

## Standards
Development conventions and coding standards to ensure consistency across the codebase.

- **[CSS Standards](standards/css.md)** - Property ordering, naming conventions, file organization
- **[JavaScript Standards](standards/javascript.md)** - Naming conventions, code style, DOM patterns  
- **[Database Standards](standards/database.md)** - SQL style, schema patterns, data type conventions

## Architecture  
High-level system design and technical approaches unique to this platform.

- **[Testing Architecture](architecture/testing.md)** - Complete application simulation in JSDOM with 24 scenarios in 8 seconds
- **[Client-Side Modules](architecture/client-modules.md)** - Server-side includes creating global scope across all client files
- **[Real-Time Features](architecture/realtime.md)** - WebSocket integration with bidirectional communication patterns

## Reference
Quick reference guides for working with specific systems.

- **[API Endpoints](reference/api-endpoints.md)** - Request/response formats for all endpoints
- **[CSS-UI Guide](reference/css-ui-guide.md)** - Quick lookup tables for custom elements and semantic attributes

## Key Architectural Patterns

This codebase implements several **non-standard patterns** that require understanding before making changes:

### Non-Standard Module System
All client JavaScript files are concatenated via server-side includes, creating a **global scope** where all `const`/`let` declarations are shared. No traditional imports/exports exist.

### Semantic CSS Architecture  
CSS uses **custom HTML elements** (`<posts>`, `<conversation>`, `<message>`) and **semantic attributes** (`[muted]`, `[center]`, `[favorited]`) instead of CSS classes.

### Single API Endpoint
All server communication flows through **one `/session` endpoint** with a middleware chain that processes multiple operations per request based on request body content.

### Aggressive Client Caching
The client maintains an **aggressive caching layer** with `counts_max_create_date` timestamps to minimize server requests while keeping real-time data synchronized.

### Complete Test Simulation
Tests simulate the **entire application stack** in JSDOM with perfect mocking of external dependencies while exercising 100% of actual code paths.

## For AI Assistants

These documents are designed to be:
- **Comprehensive** - Cover all architectural decisions and their rationale
- **Practical** - Focus on actionable patterns with working examples  
- **Stable** - Based on established patterns, not implementation details
- **Code-First** - Derived from deep analysis of actual implementation

**Critical for new contributors**: This codebase uses non-standard approaches throughout. Reading the architecture and standards documentation is essential before making any changes, as conventional web development patterns may not apply.