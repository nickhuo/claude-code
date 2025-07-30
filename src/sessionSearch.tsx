import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { execSync } from "child_process";

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

export default function SessionSearch() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
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

      // Process files sequentially to avoid memory spikes
      const sessions: Session[] = [];
      for (const fileInfo of recentFiles) {
        // Check timeout before processing each file
        if (Date.now() - startTime > TIMEOUT_MS) {
          console.log("Timeout reached, stopping session loading");
          break;
        }

        try {
          const session = await parseSessionFile(fileInfo.filePath);
          if (session) {
            sessions.push(session);
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

                // Skip files larger than 5MB to avoid memory issues
                const maxFileSize = 5 * 1024 * 1024; // 5MB
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

      if (!sessionId) return null;

      return {
        id: sessionId,
        description,
        directory,
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
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Claude Code sessions..."
      navigationTitle="Claude Code Sessions"
    >
      {filteredSessions.map((session) => (
        <List.Item
          key={session.id}
          title={session.description}
          subtitle={getDirectoryName(session.directory)}
          accessories={[{ text: formatTimeAgo(session.lastActivity) }]}
          icon={Icon.Message}
          actions={
            <ActionPanel>
              <ResumeSessionAction session={session} />
              <Action.CopyToClipboard
                title="Copy Session ID"
                content={session.id}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Directory Path"
                content={session.directory}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
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
      ))}
    </List>
  );
}

function ResumeSessionAction({ session }: { session: Session }) {
  const resumeCommand = `cd "${session.directory}" && claude -r "${session.id}"`;
  const escapedCommand = resumeCommand.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  return (
    <Action
      title="Resume Session"
      onAction={async () => {
        try {
          execSync(`osascript -e 'tell application "Terminal" to do script "${escapedCommand}"'`);

          await showToast({
            style: Toast.Style.Success,
            title: "Session Resumed",
            message: `Resumed Claude Code session in ${getDirectoryName(session.directory)}`,
          });
        } catch (error) {
          console.error("Error resuming session:", error);
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to Resume Session",
            message: "Please ensure Claude Code CLI is installed",
          });
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
