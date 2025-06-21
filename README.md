# Truce.net

A Node.js social media platform focused on constructive dialogue and community building. Truce.net provides a space for meaningful conversations with AI-powered content moderation and real-time interaction features.

## What is Truce.net?

Truce.net is a social media platform that emphasizes:
- **Constructive dialogue** over divisive content
- **Community-driven moderation** with AI assistance
- **Real-time conversations** through WebSocket integration
- **Topic-based organization** to facilitate focused discussions
- **User privacy and safety** with comprehensive blocking and reporting features

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- OpenAI API key (for content moderation)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/derekbreden/truce-web.git
   cd truce-web
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file with your database and API configurations:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/truce_db
   OPENAI_API_KEY=your_openai_api_key
   # Add other required environment variables
   ```

4. **Initialize the database**
   ```bash
   # Run the schema setup (creates tables and initial data)
   node -e "require('./server/schema').init()"
   ```

5. **Start the server**
   ```bash
   node index.js
   ```

The application will be available at `http://localhost:3000` (or your configured port).

## Development

### Running Tests
```bash
npm test                        # Run all tests
npm test post.create.test.js   # Run specific test file
npm test capture               # Run tests with visual capture (debugging)
```

### Linting
```bash
npm run lint                   # Run ESLint with auto-fix
```

### Visual Test Debugging
The test suite includes visual capture capabilities for debugging UI issues:
```bash
npm test capture               # Screenshots saved to tests/capture/
npm test notifications.simple capture  # Run specific test with screenshots
```

## Architecture Overview

### Core Components
- **Server**: Express-like HTTP server with PostgreSQL database
- **Client**: Non-standard module system using server-side includes
- **Real-time**: WebSocket integration for live updates  
- **AI Integration**: OpenAI-powered content moderation
- **Testing**: Comprehensive end-to-end test suite with visual capture

### Key Features
- **Posts and Replies**: Threaded conversations with real-time updates
- **Topics**: Organized discussion categories
- **Direct Messages**: Private conversations between users
- **Notifications**: Real-time alerts for interactions
- **Content Moderation**: AI-powered spam and harassment detection
- **User Management**: Profiles, blocking, favorites, and subscriptions

### Unique Client Architecture
Truce.net uses a non-standard client-side module system where all JavaScript files are concatenated server-side and included in `index.html`. This creates a global scope across all client files, requiring specific patterns for testing and development.

## Project Structure

```
├── client/           # Client-side JavaScript and CSS
├── server/           # Server-side logic and API endpoints
│   └── session/      # Session middleware functions
├── tests/            # End-to-end integration tests
├── resources/        # Static assets and images
└── index.js          # Application entry point
```

## Contributing

### Development Guidelines
- Follow established coding conventions (see CLAUDE.md for detailed patterns)
- Write tests for new features
- Use visual capture testing for UI changes
- Maintain the existing architecture patterns

### Code Style
- Use arrow functions: `const func = () => {}`
- Double quotes for strings: `"string"`
- Omit semicolons
- Prefix DOM variables with `$`: `const $button = $("button")`

For comprehensive coding conventions and patterns, see [CLAUDE.md](./CLAUDE.md).

## License

[ISC](LICENSE)

## Support

For questions or issues, please create a GitHub issue or reach out to the development team.