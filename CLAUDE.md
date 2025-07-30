# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension called "Claude Code" that provides basic commands for interacting with Claude. The extension is built using TypeScript and the Raycast API.

## Development Commands

- `npm run dev` - Start development mode for the extension
- `npm run build` - Build the extension for production
- `npm run lint` - Run ESLint to check code quality
- `npm run fix-lint` - Automatically fix ESLint issues
- `npm run publish` - Publish extension to Raycast Store

## Architecture

### Project Structure
- `src/` - Source code directory containing TypeScript files
- `assets/` - Static assets including the extension icon
- Individual command files are placed directly in `src/`

### Raycast Extension Commands
Commands are defined in `package.json` under the `commands` array. Each command corresponds to a TypeScript file in the `src/` directory that exports a default function.

Current commands:
- `search-sessions` - Simple command that copies the current date to clipboard and shows a HUD message

### Development Notes
- Uses standard Raycast extension configuration with TypeScript
- ESLint configuration extends from `@raycast/eslint-config`
- Target ES2023 with CommonJS modules
- React JSX support enabled for Raycast UI components