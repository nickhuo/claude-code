import { getSelectedFinderItems, showToast, Toast, List, ActionPanel, Action } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useState, useEffect } from "react";

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
  const fileName = item.path.split("/").pop() || item.path;

  // Determine the directory to navigate to
  const targetDir = item.path.includes(".") ? item.path.split("/").slice(0, -1).join("/") : item.path;

  // Simple Terminal command that relies on user's environment
  const simpleCommand = `cd "${targetDir}" && claude --add-dir "${item.path}"`;

  // Debug information
  console.log("Target directory:", targetDir);
  console.log("Item path:", item.path);
  console.log("Simple command:", simpleCommand);

  // Properly escape the command for AppleScript
  const escapedCommand = simpleCommand.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  console.log("Escaped command:", escapedCommand);
  console.log("Full osascript command:", `tell application "Terminal" to do script "${escapedCommand}"`);

  const { isLoading, error: launchError } = useExec(
    "osascript",
    ["-e", `tell application "Terminal" to do script "${escapedCommand}"`],
    {
      execute: true, // Always execute
      onData: (result) => {
        console.log("osascript result:", result);
        showToast({
          style: Toast.Style.Success,
          title: "Success!",
          message: `Claude Code launched with ${fileName}`,
        });
      },
      onError: (error) => {
        console.log("osascript error:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "osascript Failed",
          message: `Error: ${error.message}`,
        });
      },
    },
  );

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
        title={isLoading ? `Launching Claude Code...` : `Successfully opened ${fileName}`}
        subtitle={item.path}
        icon={isLoading ? "⚡" : "✅"}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Path" content={item.path} />
            {!isLoading && (
              <Action
                title="Launch Again"
                onAction={async () => {
                  await showToast({
                    style: Toast.Style.Animated,
                    title: "Launching again...",
                    message: `Opening ${fileName} with Claude Code`,
                  });
                }}
              />
            )}
          </ActionPanel>
        }
      />
    </List>
  );
}
