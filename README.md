# Claude Code

A Raycast extension for working with Claude Code.

## Features

- **Search Sessions**: Search through your Claude coding sessions

## Development

### Prerequisites

You need to have [Raycast](https://raycast.com) installed and the Raycast CLI tools.

### Setup

1. Install Raycast CLI tools:
   ```bash
   npm install -g @raycast/api@latest
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development:
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run dev` - Start development mode
- `npm run build` - Build the extension
- `npm run lint` - Run ESLint
- `npm run fix-lint` - Fix ESLint issues automatically
- `npm run publish` - Publish to Raycast Store

### Project Structure

```
src/
├── search-sessions.ts    # Search Sessions command
└── open-with-cc.ts      # Open with Claude Code command
```

## Commands

### Search Sessions
Search through your Claude coding sessions.

## Installation

This extension can be installed from the [Raycast Store](https://raycast.com/store) or built from source.