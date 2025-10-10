import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useInput, useStdin } from "ink";
import TextInput from "ink-text-input";
import { SpinnerLine } from "../shared/SpinnerLine.js";
import type { ParsedMessage } from "../../mail/imap.js";
import { saveEmailAsHtml, cleanupOldEmailFiles } from "../../utils/emailRenderer.js";
import { openInBrowser } from "../../utils/browser.js";
import fs from "fs";
import path from "path";

type ForwardChoice = "none" | "original" | "all" | "pick" | null;

export function MessageView({
  uid,
  client,
  fetcher,
  onBack,
  onReply,
  onForward,
}: {
  uid: number;
  client: any;
  fetcher: (client: any, uid: number) => Promise<ParsedMessage>;
  onBack: () => void;
  onReply: (m: ParsedMessage) => void;
  onForward: (
    m: ParsedMessage,
    opts?: { attachOriginalEml?: boolean; attachments?: { filename?: string; content?: any; contentType?: string }[] },
  ) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<ParsedMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingDir, setSavingDir] = useState<string>("");
  const [savePrompt, setSavePrompt] = useState(false);
  const [forwardChoice, setForwardChoice] = useState<ForwardChoice>(null);
  const [pickIndex, setPickIndex] = useState<number>(0);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [openedInBrowser, setOpenedInBrowser] = useState(false);
  const [browserError, setBrowserError] = useState<string | null>(null);

  const { isRawModeSupported } = useStdin();

  useInput(
    (input, key) => {
      if (!msg) return;
      if (savePrompt) return;
      if (forwardChoice && forwardChoice !== "pick") return;
      if (input.toLowerCase() === "b" || key.escape) onBack();
      if (input.toLowerCase() === "s" && (msg.attachments?.length || 0) > 0) {
        setSavePrompt(true);
        setSavingDir("");
      }
      if (input.toLowerCase() === "r") onReply(msg);
      if (input.toLowerCase() === "f") {
        if ((msg.attachments?.length || 0) === 0) {
          onForward(msg, { attachOriginalEml: true });
        } else {
          setForwardChoice("none");
        }
      }
      if (input.toLowerCase() === "o") {
        openEmailInBrowser();
      }
    },
    { isActive: isRawModeSupported },
  );

  // Save prompt cancel with ESC
  useInput(
    (input, key) => {
      if (!savePrompt) return;
      if (key.escape) {
        setSavePrompt(false);
        setSavingDir("");
      }
    },
    { isActive: isRawModeSupported && savePrompt },
  );

  // Handle forward choice input
  useInput(
    (input, key) => {
      if (!msg) return;
      if (forwardChoice === null) return;
      if (forwardChoice !== "pick") {
        if (input === "1") {
          onForward(msg, { attachOriginalEml: false, attachments: [] });
          setForwardChoice(null);
        } else if (input === "2") {
          onForward(msg, { attachOriginalEml: true });
          setForwardChoice(null);
        } else if (input === "3") {
          onForward(msg, {
            attachments: (msg.attachments || []).map((a) => ({
              filename: a.filename,
              content: a.content,
              contentType: a.contentType,
            })),
          });
          setForwardChoice(null);
        } else if (input === "4") {
          setForwardChoice("pick");
          setPicked(new Set());
          setPickIndex(0);
        } else if (key.escape) {
          setForwardChoice(null);
        }
      } else {
        // pick mode
        if (key.upArrow) setPickIndex((i) => Math.max(0, i - 1));
        else if (key.downArrow) setPickIndex((i) => Math.min((msg.attachments?.length || 1) - 1, i + 1));
        else if (input === " ") {
          setPicked((prev) => {
            const n = new Set(prev);
            if (n.has(pickIndex)) n.delete(pickIndex);
            else n.add(pickIndex);
            return n;
          });
        } else if (key.return) {
          const selected = Array.from(picked.values()).sort((a, b) => a - b);
          const atts = (msg.attachments || [])
            .map((a, idx) => ({ idx, a }))
            .filter(({ idx }) => selected.includes(idx))
            .map(({ a }) => ({ filename: a.filename, content: a.content, contentType: a.contentType }));
          onForward(msg, { attachments: atts });
          setForwardChoice(null);
        } else if (key.escape || input.toLowerCase() === "q") {
          setForwardChoice(null);
        }
      }
    },
    { isActive: isRawModeSupported && forwardChoice !== null },
  );

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const m = await fetcher(client, uid);
        setMsg(m);

        // Cleanup old email files on load
        cleanupOldEmailFiles();
      } catch (e: any) {
        setError(e.message || "Failed to load message");
      } finally {
        setLoading(false);
      }
    })();
  }, [client, uid]);

  // Allow going back when in error state
  useInput(
    (input, key) => {
      if (!error) return;
      if (key.escape || input.toLowerCase() === "b") onBack();
    },
    { isActive: isRawModeSupported && !!error },
  );

  async function openEmailInBrowser() {
    if (!msg) return;

    try {
      setBrowserError(null);
      const filepath = saveEmailAsHtml(msg, {
        includeInlineImages: true,
        theme: "light", // You can make this configurable
      });

      await openInBrowser(filepath);
      setOpenedInBrowser(true);

      // Reset the status after 2 seconds
      setTimeout(() => {
        setOpenedInBrowser(false);
      }, 2000);
    } catch (e: any) {
      setBrowserError(e.message || "Failed to open in browser");
    }
  }

  if (loading) return <SpinnerLine label="Loading message…" />;
  if (error)
    return (
      <Box flexDirection="column">
        <Text color="red">{error}</Text>
        <Text dimColor>Press b or Esc to go back</Text>
      </Box>
    );
  if (!msg) return null;

  // Preview of the email (first few lines)
  const preview = msg.text ? msg.text.split("\n").slice(0, 5).join("\n") : "[no text preview]";
  const hasMore = msg.text ? msg.text.split("\n").length > 5 : false;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>
          <Text color="blueBright">← Back</Text> <Text dimColor>[b]</Text>
          <Text dimColor> · </Text>
          <Text color="green">Reply</Text> <Text dimColor>[r]</Text>
          <Text dimColor> · </Text>
          <Text color="yellow">Forward</Text> <Text dimColor>[f]</Text>
          <Text dimColor> · </Text>
          <Text color="cyan">Open in Browser</Text> <Text dimColor>[o]</Text>
          {(msg.attachments?.length || 0) > 0 && (
            <>
              <Text dimColor> · </Text>
              <Text color="magenta">Save attachments</Text> <Text dimColor>[s]</Text>
            </>
          )}
        </Text>
      </Box>
      <Text>
        <Text color="green">Subject:</Text> {msg.subject}
      </Text>
      {msg.from && (
        <Text>
          <Text color="green">From:</Text> {msg.from}
        </Text>
      )}
      {msg.to && (
        <Text>
          <Text color="green">To:</Text> {msg.to}
        </Text>
      )}
      {msg.date && (
        <Text>
          <Text color="green">Date:</Text> {msg.date.toLocaleString()}
        </Text>
      )}
      <Box marginTop={1}>
        <Text dimColor>{"─".repeat(50)}</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color="cyan">Preview (press 'o' to open full email in browser):</Text>
        <Box marginTop={1} borderStyle="round" padding={1}>
          <Text>{preview}</Text>
        </Box>
        {hasMore && (
          <Text dimColor marginTop={1}>
            ... (more content available in browser)
          </Text>
        )}
      </Box>
      {msg.attachments && msg.attachments.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text color="green">Attachments ({msg.attachments.length})</Text>
          {msg.attachments.map((a, i) => (
            <Text key={i}>
              {forwardChoice === "pick" && (i === pickIndex ? "› " : "  ")}
              {forwardChoice === "pick" && (picked.has(i) ? "[x] " : "[ ] ")}
              📎 {a.filename || "(unnamed)"}
              {a.size ? ` — ${formatBytes(a.size)}` : ""}
              {a.contentType ? ` — ${a.contentType}` : ""}
            </Text>
          ))}
          {forwardChoice === "pick" && (
            <Text dimColor>Use ↑/↓ to move, space to toggle, Enter to confirm, Esc to cancel</Text>
          )}
        </Box>
      )}
      {openedInBrowser && (
        <Box marginTop={1}>
          <Text color="green">✓ Opened in browser</Text>
        </Box>
      )}
      {browserError && (
        <Box marginTop={1}>
          <Text color="red">Browser error: {browserError}</Text>
        </Box>
      )}
      {!savePrompt && forwardChoice === null && (
        <Box marginTop={1}>
          <Text dimColor>o open in browser · r reply · f forward · s save attachments · b back</Text>
        </Box>
      )}
      {savePrompt && (
        <Box marginTop={1}>
          <Text color="green">Save attachments to directory:</Text>
          <Box>
            <TextInput
              value={savingDir}
              onChange={setSavingDir}
              placeholder="/path/to/folder"
              onSubmit={() => {
                try {
                  const dir = savingDir.trim();
                  if (!dir || !msg) return;
                  fs.mkdirSync(dir, { recursive: true });
                  for (const [i, a] of (msg.attachments || []).entries()) {
                    const name = a.filename || `attachment-${i + 1}`;
                    const safe = name.replace(/[\n\r\t]/g, " ").slice(0, 200);
                    const p = path.join(dir, safe);
                    const content = a.content;
                    if (content) fs.writeFileSync(p, content);
                  }
                } catch {}
                setSavePrompt(false);
                setSavingDir("");
              }}
            />
            <Text dimColor> (Enter to save, Esc to cancel)</Text>
          </Box>
        </Box>
      )}
      {forwardChoice !== null && forwardChoice !== "pick" && (
        <Box marginTop={1} flexDirection="column">
          <Text color="green">Forward options</Text>
          <Text>1) No attachments</Text>
          <Text>2) Attach original email (.eml)</Text>
          <Text>3) Include all attachments</Text>
          <Text>4) Pick attachments…</Text>
          <Text dimColor>Press 1-4 or Esc to cancel</Text>
        </Box>
      )}
    </Box>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
