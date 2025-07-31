# Claude Code

A sophisticated Raycast extension that provides comprehensive integration with the Claude Code CLI. The extension offers five advanced commands for session management, project launching, and extensibility through custom commands and subagents.

## Features

### Core Commands

- **🔍 Session Search** - Advanced Claude Code session browser with intelligent filtering and search
- **🚀 Launch with Claude Code** - Enhanced Finder integration with multi-file/directory selection
- **📁 Launch Projects** - Project management system with availability status tracking
- **⚙️ User Command Manager** - Custom command creation and management system
- **🤖 User Agents Manager** - Claude Code subagent creation and management

### Advanced Capabilities

- **Session Management**: JSONL parsing, memory-efficient processing, resume functionality
- **File System Integration**: AppleScript automation, path resolution, Terminal control
- **Extensibility Framework**: Plugin-like command and agent creation with metadata-driven configuration
- **Error Handling**: Graceful degradation, timeout protection, validation systems

## Development

### Prerequisites

- [Raycast](https://raycast.com) installed
- Raycast CLI tools
- [Claude Code CLI](https://claude.ai/code) installed and configured

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

- `npm run dev` - Start development mode with live reload
- `npm run build` - Build the extension for production
- `npm run lint` - Run ESLint to check code quality
- `npm run fix-lint` - Automatically fix ESLint issues
- `npm run publish` - Publish extension to Raycast Store

### Project Structure

```
src/
├── sessionSearch.tsx          # Advanced session browser with search
├── launchWithCC.tsx          # Enhanced Finder integration
├── launchProjects.tsx        # Project management system
├── userCommandManager.tsx    # Custom command creation system
├── userAgentsManager.tsx     # Subagent management system
└── terminalLauncher.ts       # Unified terminal launcher utility
```

## Commands

### Session Search
Browse and search through your Claude Code sessions with intelligent filtering. Parses JSONL session files from `~/.claude/projects` with memory management and timeout protection.

### Launch with Claude Code
Launch Claude Code from Finder selections with multi-file/directory support. Uses AppleScript automation for Terminal launching with robust error handling.

### Launch Projects
Manage and launch projects from your Claude Code project directory. Displays project availability status and provides launching with directory navigation.

### User Command Manager
Create and manage custom commands stored in `~/.claude/commands`. Supports Markdown and YAML formats with custom parameter systems.

### User Agents Manager
Create and manage Claude Code subagents in `~/.claude/agents`. Features tool specification, color organization, and system prompt editing.

## Claude Code Integration

The extension integrates with Claude Code CLI through multiple command patterns:

- Session resumption: `claude -r "{sessionId}"`
- Context launching: `claude --add-dir "{path}"`
- Project launching with proper path resolution and escaping

## Installation

This extension can be installed from the [Raycast Store](https://raycast.com/store) or built from source using the development setup above.