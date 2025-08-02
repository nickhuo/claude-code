# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See @README.md for project overview and @package.json for available npm commands for this project.

## Project Overview

This is a sophisticated Raycast extension called "Claude Code" that provides comprehensive integration with the Claude Code CLI. The extension offers five advanced commands for session management, project launching, and extensibility through custom commands and subagents.

## Development Commands

- `npm run dev` - Start development mode for the extension with live reload
- `npm run build` - Build the extension for production using `ray build`
- `npm run lint` - Run ESLint to check code quality using `ray lint`
- `npm run fix-lint` - Automatically fix ESLint issues using `ray lint --fix`
- `npm run publish` - Publish extension to Raycast Store using `@raycast/api publish`

## Architecture

### Core Commands (5 Commands)

**`sessionSearch`** (`src/sessionSearch.tsx`) - Advanced Claude Code session browser

- Parses JSONL session files from `~/.claude/projects`
- Implements intelligent file filtering (5MB limit, 15 most recent files)
- Provides search functionality across session descriptions and directories
- Enables session resumption with `claude -r` command
- Handles timeout protection (10-second limit) and memory management

**`launchWithCC`** (`src/launchWithCC.tsx`) - Enhanced Finder integration

- Multi-file/directory selection support from Finder
- Intelligent path resolution (parent dir for files, direct path for directories)
- AppleScript automation for Terminal launching
- Robust error handling with fallback manual commands
- Real-time execution feedback with Toast notifications

**`launchProjects`** (`src/launchProjects.tsx`) - Project management system

- Scans `~/.claude/projects` for project directories
- Extracts project paths from JSONL session files
- Displays project availability status (exists/missing)
- Provides project launching with directory navigation
- Sorts by last activity with human-readable timestamps

**`userCommandManager`** (`src/userCommandManager.tsx`) - Custom command system

- Creates and manages custom commands in `~/.claude/commands`
- Supports both Markdown (.md) and YAML (.yaml/.yml) formats
- YAML frontmatter parsing for metadata
- Custom parameter system with array support
- File system operations with validation and error handling

**`userAgentsManager`** (`src/userAgentsManager.tsx`) - Subagent management

- Creates and manages Claude Code subagents in `~/.claude/agents`
- Tool specification system with available tools validation
- Color-coded agent organization (8 color options)
- Advanced form handling with custom parameters
- System prompt editing for agent behavior customization

### Advanced Features

**Session Management**:

- JSONL parsing with malformed line handling
- Memory-efficient processing (sequential file processing)
- Session metadata extraction (ID, directory, timestamps, descriptions)
- Intelligent description generation from session content
- Resume functionality with proper command escaping

**File System Integration**:

- AppleScript automation for Terminal control
- Path escaping and sanitization for shell commands
- Multi-platform file path handling (macOS-focused)
- Directory existence validation and status reporting
- Recursive directory scanning with error recovery

**Extensibility Framework**:

- Plugin-like command and agent creation systems
- Metadata-driven configuration with custom parameters
- File format flexibility (Markdown with YAML frontmatter, pure YAML)
- Tool restriction and validation systems
- Form-based creation and editing interfaces

### Claude Code CLI Integration

The extension integrates with Claude Code CLI through multiple patterns:

**Command Patterns**:

- `cd "{targetDir}" && claude --add-dir "{itemPath}"` (launch with context)
- `cd "{directory}" && claude -r "{sessionId}"` (resume session)
- `claude --add-dir "{projectPath}"` (launch project)

**Path Resolution Logic**:

- Files: Navigate to parent directory, add file path to Claude context
- Directories: Navigate directly to directory, add directory path to Claude context
- Projects: Extract working directory from session JSONL files
- Handles complex path escaping for AppleScript execution

**Execution Flow**:

1. Context detection (Finder selection, session choice, project selection)
2. Path validation and resolution with error handling
3. Command construction with proper escaping
4. AppleScript execution through `osascript` command
5. Real-time feedback through Raycast Toast notifications
6. Error recovery with manual command fallbacks

### Development Architecture

**File Structure**:

- `src/` - TypeScript React components (all `.tsx` except for types)
- `assets/` - Static assets including high-resolution extension icon
- `package.json` - Command definitions and dependency management
- `tsconfig.json` - TypeScript configuration with React JSX support

**Configuration System**:

- Commands defined in `package.json` commands array
- Each command maps to corresponding TypeScript file
- Uses `@raycast/api` and `@raycast/utils` for core functionality
- ESLint extends `@raycast/eslint-config` for code quality

**Command Architecture**:

- All commands use `view` mode for rich interactive UI
- React hooks for state management (`useState`, `useEffect`)
- Async operations with proper error boundaries
- ActionPanel system for keyboard shortcuts and actions
- Toast notification system for user feedback

**Error Handling Patterns**:

- Graceful degradation with helpful error messages
- Timeout protection for long-running operations
- File system error recovery with user-friendly messaging
- Validation systems for user input and file formats
- Fallback mechanisms for CLI execution failures

### Data Persistence

**Session Data**:

- Reads from `~/.claude/projects/{encoded-dir-name}/*.jsonl`
- Parses session entries with timestamp and metadata extraction
- Implements file size limits and processing timeouts
- Memory management with garbage collection hints

**User Configuration**:

- Custom commands stored in `~/.claude/commands/`
- Subagents stored in `~/.claude/agents/`
- Supports nested directory organization
- Automatic directory creation with recursive mkdir

**File Format Support**:

- JSONL for session data (Claude Code CLI format)
- Markdown with YAML frontmatter for user content
- Pure YAML for configuration files
- JSON for package configuration and metadata
