import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import {
  executeInTerminal,
  showTerminalSuccessToast,
  showTerminalErrorToast,
  getManualCommand,
} from "./utils/terminalLauncher";

interface SessionEntry {
  sessionId: string;
  timestamp: string;
  cwd: string;
  type: string;
  summary?: string;
  message?: {
    content: string;
  };
}

interface Session {
  id: string;
  description: string;
  directory: string;
  timestamp: Date;
  lastActivity: Date;
  filePath: string;
}

interface SessionFileInfo {
  filePath: string;
  modifiedTime: Date;
  size: number;
}

// Global loading state to prevent duplicate calls
let isGlobalLoading = false;

export default function SessionSearch() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (isMounted && !isGlobalLoading) {
        isGlobalLoading = true;
        await loadSessions();
        isGlobalLoading = false;
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadSessions = async () => {
    console.log("🔄 Starting loadSessions...");
    const startTime = Date.now();
    const TIMEOUT_MS = 10000; // 10 second timeout

    try {
      setIsLoading(true);
      setError(null);

      const claudeProjectsPath = join(homedir(), ".claude", "projects");

      // Get all session files with metadata
      const allSessionFiles = await getAllSessionFiles(claudeProjectsPath);

      if (Date.now() - startTime > TIMEOUT_MS) {
        throw new Error("Session loading timeout");
      }

      // Sort by modification time and take only the 15 most recent
      const recentFiles = allSessionFiles
        .sort((a, b) => b.modifiedTime.getTime() - a.modifiedTime.getTime())
        .slice(0, 15);

      console.log(`Loading ${recentFiles.length} most recent session files...`);
      console.log(
        `Recent files:`,
        recentFiles.map((f) => ({ path: f.filePath, size: f.size })),
      );

      // Process files sequentially to avoid memory spikes
      const sessions: Session[] = [];
      for (const fileInfo of recentFiles) {
        // Check timeout before processing each file
        if (Date.now() - startTime > TIMEOUT_MS) {
          console.log("Timeout reached, stopping session loading");
          break;
        }

        try {
          console.log(`Parsing file: ${fileInfo.filePath.split("/").pop()}`);
          const session = await parseSessionFile(fileInfo.filePath);
          if (session) {
            console.log(`✅ Successfully parsed session: ${session.id}`);
            sessions.push(session);
          } else {
            console.log(`❌ Failed to parse session from: ${fileInfo.filePath.split("/").pop()}`);
          }
        } catch (err) {
          console.error(`Error parsing session file ${fileInfo.filePath}:`, err);
          // Continue with other files
        }

        // Force garbage collection hint after each file
        if (global.gc) {
          global.gc();
        }
      }

      setSessions(sessions);
      console.log(`Loaded ${sessions.length} sessions in ${Date.now() - startTime}ms`);
    } catch (err) {
      console.error("Error loading sessions:", err);
      if (err instanceof Error && err.message.includes("timeout")) {
        setError("Session loading timed out. Try again or reduce the number of Claude Code projects.");
      } else {
        setError("Failed to load Claude Code sessions. Make sure Claude Code CLI is installed and has been used.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getAllSessionFiles = async (claudeProjectsPath: string): Promise<SessionFileInfo[]> => {
    const allFiles: SessionFileInfo[] = [];

    try {
      const projectDirs = await readdir(claudeProjectsPath, { withFileTypes: true });

      for (const dir of projectDirs) {
        if (dir.isDirectory()) {
          try {
            const dirPath = join(claudeProjectsPath, dir.name);
            const files = await readdir(dirPath);
            const jsonlFiles = files.filter((file) => file.endsWith(".jsonl"));

            for (const file of jsonlFiles) {
              try {
                const filePath = join(dirPath, file);
                const stats = await stat(filePath);

                // Skip files larger than 50MB to avoid memory issues
                const maxFileSize = 50 * 1024 * 1024; // 50MB
                if (stats.size > maxFileSize) {
                  console.log(`Skipping large file: ${filePath} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);
                  continue;
                }

                allFiles.push({
                  filePath,
                  modifiedTime: stats.mtime,
                  size: stats.size,
                });
              } catch (err) {
                console.error(`Error getting stats for file ${file}:`, err);
              }
            }
          } catch (err) {
            console.error(`Error reading directory ${dir.name}:`, err);
          }
        }
      }
    } catch (err) {
      console.error("Error reading Claude projects directory:", err);
    }

    return allFiles;
  };

  const parseSessionFile = async (filePath: string): Promise<Session | null> => {
    try {
      const content = await readFile(filePath, "utf-8");
      const lines = content
        .trim()
        .split("\n")
        .filter((line) => line.trim())
        .slice(0, 500); // Only process first 500 lines to save memory

      if (lines.length === 0) return null;

      let sessionId = "";
      let directory = "";
      let description = "Claude Code Session";
      let timestamp = new Date();
      let lastActivity = new Date(0);
      let isErrorSession = false;

      // Parse JSONL entries
      for (const line of lines) {
        try {
          const entry: SessionEntry = JSON.parse(line);

          // Get basic session info from first entry
          if (sessionId === "" && entry.sessionId) {
            sessionId = entry.sessionId;
            directory = entry.cwd || "";
            timestamp = new Date(entry.timestamp);
          }

          // Update last activity
          if (entry.timestamp) {
            const entryTime = new Date(entry.timestamp);
            if (entryTime > lastActivity) {
              lastActivity = entryTime;
            }
          }

          // Look for summary entries or meaningful descriptions
          if (entry.type === "summary" && entry.summary) {
            description = entry.summary;
            // Check if this is an error session
            if (entry.summary.includes("Invalid API key") || entry.summary.includes("Please run /login")) {
              isErrorSession = true;
            }
          } else if (entry.message?.content && description === "Claude Code Session") {
            // Use first user message as description if no summary
            const content = entry.message.content;
            if (typeof content === "string" && content.length > 0 && content.length < 200) {
              description = content.substring(0, 100) + (content.length > 100 ? "..." : "");
            }
          }
        } catch {
          // Skip malformed lines
          continue;
        }
      }

      // If no sessionId found in content, try to extract from filename
      if (!sessionId) {
        const filename = filePath.split("/").pop() || "";
        const match = filename.match(/([a-f0-9-]{36})\.jsonl$/);
        if (match) {
          sessionId = match[1];
          console.log(`📁 Extracted sessionId from filename: ${sessionId}`);
        }
      }

      // If still no sessionId, this file can't be parsed
      if (!sessionId) {
        console.log(`❌ No sessionId found in content or filename for: ${filePath.split("/").pop()}`);
        return null;
      }

      // For error sessions, provide better description and default directory
      if (isErrorSession) {
        description = "❌ " + description;
        if (!directory) {
          directory = "~"; // Default directory for failed sessions
        }
      }

      // Set timestamp from file stats if not available from content
      if (!timestamp || timestamp.getTime() === 0) {
        try {
          const stats = await stat(filePath);
          timestamp = stats.mtime;
        } catch {
          timestamp = new Date();
        }
      }

      return {
        id: sessionId,
        description,
        directory: directory || "~",
        timestamp,
        lastActivity: lastActivity.getTime() > 0 ? lastActivity : timestamp,
        filePath,
      };
    } catch (err) {
      console.error(`Error parsing session file ${filePath}:`, err);
      return null;
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  const getDirectoryName = (path: string): string => {
    const parts = path.split("/");
    return parts[parts.length - 1] || path;
  };

  const filteredSessions = sessions.filter((session) => {
    if (!searchText) return true;
    const query = searchText.toLowerCase();
    return (
      session.description.toLowerCase().includes(query) ||
      session.directory.toLowerCase().includes(query) ||
      getDirectoryName(session.directory).toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return <List isLoading searchBarPlaceholder="Loading Claude Code sessions..." />;
  }

  if (error) {
    return (
      <List>
        <List.Item
          title="Error Loading Sessions"
          subtitle={error}
          icon={Icon.XMarkCircle}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={loadSessions} icon={Icon.RotateClockwise} />
              <Action.OpenInBrowser title="Install Claude Code" url="https://docs.anthropic.com/en/docs/claude-code" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (sessions.length === 0) {
    return (
      <List>
        <List.Item
          title="No Claude Code Sessions Found"
          subtitle="Start using Claude Code CLI to see your sessions here"
          icon={Icon.Message}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Learn About Claude Code"
                url="https://docs.anthropic.com/en/docs/claude-code"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={(text: string) => setSearchText(text || "")}
      searchBarPlaceholder="Search Claude Code sessions..."
      navigationTitle="Claude Code Sessions"
    >
      {filteredSessions.map((session) => {
        const isErrorSession = session.description.includes("❌");
        return (
          <List.Item
            key={session.id}
            title={session.description}
            subtitle={getDirectoryName(session.directory)}
            accessories={[{ text: formatTimeAgo(session.lastActivity) }]}
            icon={isErrorSession ? Icon.ExclamationMark : Icon.Message}
            actions={
              <ActionPanel>
                {!isErrorSession && <ResumeSessionAction session={session} />}
                {isErrorSession && (
                  <Action
                    title="Session Failed - Check Claude Code Setup"
                    onAction={async () => {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Session Error",
                        message: "This session failed due to authentication issues. Run 'claude login' to fix.",
                      });
                    }}
                    icon={Icon.ExclamationMark}
                  />
                )}
                <Action.CopyToClipboard
                  title="Copy Claude Command"
                  content={isErrorSession ? `claude login` : `cd "${session.directory}" && claude -r "${session.id}"`}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
                <Action.CopyToClipboard
                  title="Copy Session ID"
                  content={session.id}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                {!isErrorSession && (
                  <Action.CopyToClipboard
                    title="Copy Directory Path"
                    content={session.directory}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                )}
                <Action
                  title="Show Full Description"
                  onAction={async () => {
                    await showToast({
                      style: Toast.Style.Animated,
                      title: "Session Description",
                      message: session.description,
                    });
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function ResumeSessionAction({ session }: { session: Session }) {
  const resumeCommand = `cd "${session.directory}" && claude -r "${session.id}"`;

  return (
    <Action
      title="Resume Session"
      onAction={async () => {
        const result = await executeInTerminal(resumeCommand);

        if (result.success) {
          await showTerminalSuccessToast(
            result.terminalUsed,
            `Claude Code session in ${getDirectoryName(session.directory)}`,
          );
        } else {
          await showTerminalErrorToast(
            getManualCommand(resumeCommand),
            `Claude Code session in ${getDirectoryName(session.directory)}`,
          );
        }
      }}
      icon={Icon.Play}
    />
  );
}

function getDirectoryName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}
