# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension called "Claude Code" that provides commands for integrating with the Claude Code CLI. The extension allows users to launch Claude Code CLI from Finder selections and search through Claude coding sessions.

## Development Commands

- `npm run dev` - Start development mode for the extension with live reload
- `npm run build` - Build the extension for production using `ray build`
- `npm run lint` - Run ESLint to check code quality using `ray lint`
- `npm run fix-lint` - Automatically fix ESLint issues using `ray lint --fix`
- `npm run publish` - Publish extension to Raycast Store using `@raycast/api publish`

## Architecture

### Core Components

**Main Commands**:
- **sessionSearch** (`src/sessionSearch.ts`) - Currently a placeholder that copies the current date to clipboard
- **launchWithCC** (`src/launchWithCC.tsx`) - Main integration command that launches Claude Code CLI with Finder selections

**Key Features**:
- **Finder Integration**: Uses `getSelectedFinderItems()` from Raycast API to get current Finder selection
- **Terminal Automation**: Executes AppleScript via `osascript` to open Terminal and run Claude Code CLI
- **Path Handling**: Intelligently determines target directory (parent dir for files, direct path for directories)
- **Error Handling**: Provides helpful error messages and fallback manual commands

### Claude Code CLI Integration

The extension integrates with Claude Code CLI through Terminal automation:

**Command Pattern**: `cd "{targetDir}" && claude --add-dir "{itemPath}"`

**Path Resolution Logic**:
- For files: Navigate to parent directory, add file path to Claude
- For directories: Navigate to directory, add directory path to Claude
- Handles path escaping for AppleScript execution

**Execution Flow**:
1. Get Finder selection using Raycast API
2. Determine target directory and item path
3. Construct and escape shell command
4. Execute via AppleScript to open Terminal
5. Provide user feedback through Toast notifications

### Development Architecture

**File Structure**:
- `src/` - TypeScript source files (both `.ts` and `.tsx`)
- `assets/` - Static assets including extension icon
- Several placeholder files exist for future features (hooksCreator, sessionManager, etc.)

**Configuration**:
- Commands defined in `package.json` under `commands` array
- Each command maps to a corresponding TypeScript file
- Uses `@raycast/api` and `@raycast/utils` for core functionality
- ESLint configuration extends `@raycast/eslint-config`

**Command Types**:
- `no-view` commands (sessionSearch) - Execute without UI
- `view` commands (launchWithCC) - Present interactive UI