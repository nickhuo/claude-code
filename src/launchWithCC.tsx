import { getSelectedFinderItems, showToast, Toast, List, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  executeInTerminal,
  showTerminalSuccessToast,
  showTerminalErrorToast,
  getManualCommand,
} from "./utils/terminalLauncher";

interface FileSystemItem {
  path: string;
}

export default function OpenWithClaudeCode() {
  const [selectedItems, setSelectedItems] = useState<FileSystemItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getFinderSelection = async () => {
      try {
        const items = await getSelectedFinderItems();
        setSelectedItems(items);
      } catch {
        setError("Please select a file or directory in Finder first. Make sure Finder is the frontmost application.");
      } finally {
        setIsLoading(false);
      }
    };

    getFinderSelection();
  }, []);

  if (isLoading) {
    return <List isLoading />;
  }

  if (error || selectedItems.length === 0) {
    return (
      <List>
        <List.Item
          title="No Selection Found"
          subtitle={error || "Please select a file or directory in Finder"}
          icon="⚠️"
          actions={
            <ActionPanel>
              <Action
                title="How to Use"
                onAction={async () => {
                  await showToast({
                    style: Toast.Style.Animated,
                    title: "Instructions",
                    message: "Select a file or folder in Finder, then run this command",
                  });
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (selectedItems.length === 1) {
    return <ClaudeCodeLauncher item={selectedItems[0]} />;
  }

  return (
    <List navigationTitle="Choose Item to Open with Claude Code">
      {selectedItems.map((item, index) => {
        const fileName = item.path.split("/").pop() || item.path;
        const isDirectory = !fileName.includes(".");

        return (
          <List.Item
            key={index}
            title={fileName}
            subtitle={item.path}
            icon={isDirectory ? "📁" : "📄"}
            actions={
              <ActionPanel>
                <Action.Push title="Open with Claude Code" target={<ClaudeCodeLauncher item={item} />} />
                <Action.CopyToClipboard
                  title="Copy Claude Command"
                  content={`cd "${item.path.includes(".") ? item.path.split("/").slice(0, -1).join("/") : item.path}" && claude --add-dir "${item.path}"`}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={item.path}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function ClaudeCodeLauncher({ item }: { item: FileSystemItem }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLaunched, setIsLaunched] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const fileName = item.path.split("/").pop() || item.path;

  // Determine the directory to navigate to
  const targetDir = item.path.includes(".") ? item.path.split("/").slice(0, -1).join("/") : item.path;

  // Claude Code command
  const command = `cd "${targetDir}" && claude --add-dir "${item.path}"`;

  useEffect(() => {
    const launchClaudeCode = async () => {
      setIsLoading(true);

      try {
        const result = await executeInTerminal(command);

        if (result.success) {
          await showTerminalSuccessToast(result.terminalUsed, fileName);
          setIsLaunched(true);
        } else {
          setLaunchError("Failed to launch terminal");
          await showTerminalErrorToast(getManualCommand(command), fileName);
        }
      } catch (error) {
        console.error("Error launching Claude Code:", error);
        setLaunchError(error instanceof Error ? error.message : "Unknown error");
        await showTerminalErrorToast(getManualCommand(command), fileName);
      } finally {
        setIsLoading(false);
      }
    };

    launchClaudeCode();
  }, [command, fileName]);

  if (launchError) {
    return (
      <List>
        <List.Item
          title="Claude Code CLI Issue"
          subtitle="Terminal window opened - please check for any error messages"
          icon="⚠️"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Installation Guide" url="https://docs.anthropic.com/en/docs/claude-code" />
              <Action
                title="Manual Command"
                onAction={async () => {
                  await showToast({
                    style: Toast.Style.Animated,
                    title: "Manual Command",
                    message: `Run: claude --add-dir "${item.path}"`,
                  });
                }}
              />
              <Action.CopyToClipboard
                title="Copy Command"
                content={`claude --add-dir "${item.path}"`}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      <List.Item
        title={
          isLoading
            ? `Launching Claude Code...`
            : isLaunched
              ? `Successfully opened ${fileName}`
              : `Ready to launch ${fileName}`
        }
        subtitle={item.path}
        icon={isLoading ? "⚡" : isLaunched ? "✅" : "📁"}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Claude Command"
              content={command}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
            />
            <Action.CopyToClipboard title="Copy Path" content={item.path} shortcut={{ modifiers: ["cmd"], key: "c" }} />
            {!isLoading && (
              <Action
                title="Launch Again"
                onAction={async () => {
                  setIsLoading(true);
                  setLaunchError(null);
                  setIsLaunched(false);

                  try {
                    const result = await executeInTerminal(command);

                    if (result.success) {
                      await showTerminalSuccessToast(result.terminalUsed, fileName);
                      setIsLaunched(true);
                    } else {
                      setLaunchError("Failed to launch terminal");
                      await showTerminalErrorToast(getManualCommand(command), fileName);
                    }
                  } catch (error) {
                    console.error("Error launching Claude Code:", error);
                    setLaunchError(error instanceof Error ? error.message : "Unknown error");
                    await showTerminalErrorToast(getManualCommand(command), fileName);
                  } finally {
                    setIsLoading(false);
                  }
                }}
              />
            )}
            <Action
              title="Copy Manual Command"
              onAction={async () => {
                await showToast({
                  style: Toast.Style.Animated,
                  title: "Manual Command",
                  message: `Run: claude --add-dir "${item.path}"`,
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
