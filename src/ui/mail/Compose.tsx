import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Box, Text, useInput, useStdin } from "ink";
import TextInput from "ink-text-input";
import type { Account, SignatureConfig } from "../../utils/store";
import { sendMail, type Attachment } from "../../mail/smtp.js";
import fs from "fs";
import path from "path";
import { lookup as lookupMime } from "mime-types";
import { SpinnerLine } from "../shared/SpinnerLine.js";
import { buildHtmlEmail } from "../../utils/format.js";
import type Conf from "conf";
import { saveDraft, deleteDraft, type DraftsStore } from "../../utils/drafts.js";

type Field = "to" | "subject" | "body" | "footer";
type Mode = "normal" | "insert";

export function Compose({
  account,
  onClose,
  initialTo,
  initialSubject,
  initialBody,
  initialAttachments,
  draftId,
  signatureConfig,
  draftsStore,
  onSetSignatureEnabled,
  onSetSignatureContent,
}: {
  account: Account;
  onClose: () => void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  initialAttachments?: Attachment[];
  draftId?: string;
  signatureConfig?: SignatureConfig;
  draftsStore?: Conf<DraftsStore>;
  onSetSignatureEnabled?: (enabled: boolean) => void;
  onSetSignatureContent?: (content: string, format: "text" | "html") => void;
}) {
  const [to, setTo] = useState(initialTo || "");
  const [subject, setSubject] = useState(initialSubject || "");
  const [body, setBody] = useState(initialBody || "");
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments || []);
  const [focus, setFocus] = useState<Field>("to");
  const [mode, setMode] = useState<Mode>("normal");
  const [cursor, setCursor] = useState<number>(0);
  const [pendingCmd, setPendingCmd] = useState<string | null>(null);
  const [yankBuffer, setYankBuffer] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentInfo, setSentInfo] = useState<string | null>(null);
  const [addingPath, setAddingPath] = useState(false);
  const [attachPath, setAttachPath] = useState("");
  const [addingSigPath, setAddingSigPath] = useState(false);
  const [sigPath, setSigPath] = useState("");
  const [includeSignature, setIncludeSignature] = useState<boolean>(signatureConfig?.enabled ?? false);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);

  const { isRawModeSupported } = useStdin();

  // Ensure cursor stays within bounds when body changes
  useEffect(() => {
    setCursor((c) => Math.min(Math.max(0, c), body.length));
  }, [body]);

  // Initialize cursor at end if we received initial body
  useEffect(() => {
    setCursor((c) => (c === 0 && (initialBody?.length || 0) > 0 ? initialBody?.length || 0 : c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lines = useMemo(() => body.split("\n"), [body]);

  function lineInfoAt(pos: number) {
    let acc = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const start = acc;
      const end = acc + line.length; // exclusive
      if (pos <= end) {
        const col = Math.min(line.length, Math.max(0, pos - start));
        return { index: i, start, end, col, len: line.length };
      }
      acc = end + 1; // account for the newline
    }
    // fallback to last line
    const lastIndex = Math.max(0, lines.length - 1);
    const lastStart = body.lastIndexOf("\n") + 1;
    const lastLen = lines[lastIndex]?.length || 0;
    return { index: lastIndex, start: lastStart, end: lastStart + lastLen, col: lastLen, len: lastLen };
  }

  function setCursorLineCol(lineIdx: number, col: number) {
    lineIdx = Math.min(Math.max(0, lineIdx), Math.max(0, lines.length - 1));
    const before = lines.slice(0, lineIdx).join("\n");
    const start = before.length + (lineIdx > 0 ? 1 : 0);
    const lineLen = (lines[lineIdx] || "").length;
    const c = Math.min(Math.max(0, col), lineLen);
    setCursor(start + c);
  }

  function moveLeft() {
    setCursor((c) => Math.max(0, c - 1));
  }
  function moveRight() {
    setCursor((c) => Math.min(body.length, c + 1));
  }
  function moveStartOfLine() {
    const li = lineInfoAt(cursor);
    setCursor(li.start);
  }
  function moveEndOfLine() {
    const li = lineInfoAt(cursor);
    setCursor(li.end);
  }
  function isSpace(ch: string) {
    return ch === " " || ch === "\\t" || ch === "\\n" || ch === "\\r";
  }
  function nextWordStart(pos: number): number {
    let i = Math.min(Math.max(0, pos), body.length);
    // If currently in a word, skip to its end
    while (i < body.length && !isSpace(body[i]!)) i++;
    // Skip spaces to the start of the next word
    while (i < body.length && isSpace(body[i]!)) i++;
    return i;
  }
  function prevWordStart(pos: number): number {
    let i = Math.min(Math.max(0, pos), body.length) - 1;
    // Skip spaces left
    while (i >= 0 && isSpace(body[i]!)) i--;
    if (i < 0) return 0;
    // Move to the beginning of this word
    while (i >= 0 && !isSpace(body[i]!)) i--;
    return i + 1;
  }
  function moveWordForward() {
    setCursor((c) => nextWordStart(c));
  }
  function moveWordBackward() {
    setCursor((c) => prevWordStart(c));
  }
  function deleteRange(start: number, end: number, copyToYank?: boolean) {
    const a = Math.max(0, Math.min(start, end));
    const b = Math.max(0, Math.max(start, end));
    if (a >= b) return;
    const chunk = body.slice(a, b);
    if (copyToYank) setYankBuffer(chunk);
    const newBody = body.slice(0, a) + body.slice(b);
    setBody(newBody);
    setCursor(a);
  }
  function moveUp() {
    const li = lineInfoAt(cursor);
    const targetLine = Math.max(0, li.index - 1);
    const targetLen = (lines[targetLine] || "").length;
    const col = Math.min(li.col, targetLen);
    setCursorLineCol(targetLine, col);
  }
  function moveDown() {
    const li = lineInfoAt(cursor);
    const targetLine = Math.min(lines.length - 1, li.index + 1);
    const targetLen = (lines[targetLine] || "").length;
    const col = Math.min(li.col, targetLen);
    setCursorLineCol(targetLine, col);
  }

  function insertText(txt: string) {
    setBody((b) => b.slice(0, cursor) + txt + b.slice(cursor));
    setCursor((c) => c + txt.length);
  }

  function isPrintableChar(ch: string): boolean {
    if (!ch || ch.length === 0) return false;
    const code = ch.charCodeAt(0);
    // printable ASCII >= 32 and not DEL (127); allow extended unicode (>127)
    return (code >= 32 && code !== 127) || code > 127;
  }

  function deleteCharAt(pos: number) {
    if (pos < 0 || pos >= body.length) return;
    setBody((b) => b.slice(0, pos) + b.slice(pos + 1));
  }

  function backspace() {
    if (cursor > 0) {
      setBody((b) => b.slice(0, cursor - 1) + b.slice(cursor));
      setCursor((c) => Math.max(0, c - 1));
    }
  }

  function newlineAtCursor() {
    insertText("\n");
  }

  function deleteCurrentLine(copyToYank?: boolean) {
    const li = lineInfoAt(cursor);
    const lineText = body.slice(li.start, li.end);
    if (copyToYank) setYankBuffer(lineText + "\n");
    // remove line including trailing newline if present
    const hasFollowingNewline = body.slice(li.end, li.end + 1) === "\n";
    const removeEnd = hasFollowingNewline ? li.end + 1 : li.end;
    const newBody = body.slice(0, li.start) + body.slice(removeEnd);
    setBody(newBody);
    // position cursor at start of this line (or previous if it was the last)
    if (newBody.length === 0) setCursor(0);
    else if (li.start < newBody.length) setCursor(li.start);
    else setCursor(Math.max(0, newBody.length - 1));
  }

  function yankCurrentLine() {
    const li = lineInfoAt(cursor);
    const lineText = body.slice(li.start, li.end);
    setYankBuffer(lineText + "\n");
  }

  function pasteAfterLine() {
    if (!yankBuffer) return;
    const li = lineInfoAt(cursor);
    const insertPos = body.slice(li.end, li.end + 1) === "\n" ? li.end + 1 : li.end;
    setBody((b) => b.slice(0, insertPos) + yankBuffer + b.slice(insertPos));
    setCursor(insertPos);
  }
  useInput(
    (input, key) => {
      if (addingPath || addingSigPath) return;
      if (key.tab) {
        setFocus((f) => (f === "to" ? "subject" : f === "subject" ? "body" : f === "body" ? "footer" : "to"));
      } else if (key.shift && key.tab) {
        setFocus((f) => (f === "footer" ? "body" : f === "body" ? "subject" : f === "subject" ? "to" : "footer"));
      } else if (key.escape) {
        // In body+insert: leave insert mode; otherwise cancel compose
        if (focus === "body" && mode === "insert") {
          setMode("normal");
          setPendingCmd(null);
          return;
        }
        onClose();
      } else if (key.ctrl && input === "s") {
        void doSend();
      } else if (key.ctrl && key.return) {
        if (focus === "body") newlineAtCursor();
      } else if (focus === "body" && key.ctrl && input.toLowerCase() === "a") {
        // Start add-attachment prompt (Ctrl+A) without interfering with typing
        setAddingPath(true);
        setAttachPath("");
      } else if (focus === "body" && key.ctrl && input.toLowerCase() === "r") {
        // Remove last attachment (Ctrl+R)
        setAttachments((arr) => arr.slice(0, -1));
      } else if (focus === "body" && key.ctrl && input.toLowerCase() === "d") {
        // Clear all attachments (Ctrl+D). Avoid Ctrl+C which can signal SIGINT in terminals.
        setAttachments([]);
      } else if (focus === "body" && key.ctrl && input.toLowerCase() === "g") {
        // Toggle signature
        const next = !includeSignature;
        setIncludeSignature(next);
        onSetSignatureEnabled?.(next);
      } else if (focus === "body" && key.ctrl && input === "G") {
        // Set signature file
        setAddingSigPath(true);
        setSigPath("");
      } else if (focus === "footer") {
        if (key.return) setShowInstructions((v) => !v);
      } else if (focus === "body") {
        // Vim-style editor for body
        if (mode === "insert") {
          if (key.escape) {
            setMode("normal");
            setPendingCmd(null);
          } else if (key.return) {
            newlineAtCursor();
          } else if (key.backspace || input === "\\x7f" || input === "\\b") {
            backspace();
          } else if (key.delete) {
            deleteCharAt(cursor);
          } else if (key.leftArrow) {
            moveLeft();
          } else if (key.rightArrow) {
            moveRight();
          } else if (key.upArrow) {
            moveUp();
          } else if (key.downArrow) {
            moveDown();
          } else if (!key.ctrl && !key.meta && !key.tab && input && input.length === 1 && isPrintableChar(input)) {
            insertText(input);
          }
        } else {
          // normal mode
          const ch = input;
          if (pendingCmd === "d") {
            setPendingCmd(null);
            if (ch === "d") {
              deleteCurrentLine();
              return;
            } else if (ch === "w") {
              const end = nextWordStart(cursor);
              deleteRange(cursor, end, true);
              return;
            } else if (ch === "b") {
              const start = prevWordStart(cursor);
              deleteRange(start, cursor, true);
              return;
            }
          } else if (pendingCmd === "y") {
            setPendingCmd(null);
            if (ch === "y") {
              yankCurrentLine();
              return;
            }
          }

          if (key.backspace || ch === "\\x7f" || ch === "\\b") {
            backspace();
            return;
          }
          if (ch === "i") setMode("insert");
          else if (ch === "a") {
            moveRight();
            setMode("insert");
          } else if (ch === "I") {
            moveStartOfLine();
            setMode("insert");
          } else if (ch === "A") {
            moveEndOfLine();
            setMode("insert");
          } else if (ch === "o") {
            moveEndOfLine();
            newlineAtCursor();
            setMode("insert");
          } else if (ch === "O") {
            moveStartOfLine();
            insertText("\n");
            setCursor((c) => Math.max(0, c - 1));
            setMode("insert");
          } else if (ch === "h" || key.leftArrow) moveLeft();
          else if (ch === "l" || key.rightArrow) moveRight();
          else if (ch === "j" || key.downArrow) moveDown();
          else if (ch === "k" || key.upArrow) moveUp();
          else if (ch === "0") moveStartOfLine();
          else if (ch === "$") moveEndOfLine();
          else if (ch === "w") moveWordForward();
          else if (ch === "b") moveWordBackward();
          else if (ch === "x") deleteCharAt(cursor);
          else if (ch === "d") setPendingCmd("d");
          else if (ch === "y") setPendingCmd("y");
          else if (ch === "p") pasteAfterLine();
          else if (key.return) {
            // ignore in normal mode
          }
        }
      }
    },
    { isActive: isRawModeSupported },
  );

  // While adding a path, allow ESC to cancel the path prompt
  useInput(
    (input, key) => {
      if (key.escape) {
        setAddingPath(false);
        setAttachPath("");
      }
    },
    { isActive: isRawModeSupported && addingPath },
  );

  // While adding signature path, allow ESC to cancel the path prompt
  useInput(
    (input, key) => {
      if (key.escape) {
        setAddingSigPath(false);
        setSigPath("");
      }
    },
    { isActive: isRawModeSupported && addingSigPath },
  );

  async function doSend() {
    if (!to) {
      setError("Recipient is required");
      return;
    }
    setSending(true);
    setError(null);
    try {
      // signature
      const sigEnabled = includeSignature && (signatureConfig?.content || "").trim().length > 0;
      const sigText = sigEnabled && signatureConfig?.format === "text" ? signatureConfig.content : undefined;
      const sigHtml = sigEnabled && signatureConfig?.format === "html" ? signatureConfig.content : undefined;
      const textWithSig = sigText ? `${body}\n\n-- \n${sigText}` : body;
      const html = buildHtmlEmail({
        subject,
        bodyText: body,
        signatureText: sigEnabled && !sigHtml ? signatureConfig?.content : undefined,
        signatureHtml: sigEnabled ? sigHtml : undefined,
      });
      const info = await sendMail(account, { to, subject, text: textWithSig, html, attachments });
      setSentInfo(typeof info?.messageId === "string" ? info.messageId : "sent");
      // brief success then close
      setTimeout(() => onClose(), 600);
    } catch (e: any) {
      setError(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    // noop - ensures useInput registered
  }, []);

  return (
    <Box flexDirection="column">
      <Text color="green">Compose</Text>
      <Box marginTop={1}>
        <Text dimColor>To: </Text>
        <TextInput value={to} onChange={setTo} focus={!addingPath && focus === "to"} placeholder="person@example.com" />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Signature: </Text>
        <Text>{includeSignature ? (signatureConfig?.content?.trim() ? "On" : "On (empty)") : "Off"}</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>Attachments: {attachments.length > 0 ? "" : "(none)"}</Text>
        {attachments.map((a, i) => (
          <Text key={i}>
            📎 {a.filename || "(unnamed)"}
            {typeof a.content === "string" ? "" : ""}
          </Text>
        ))}
        {addingPath && (
          <Box>
            <Text dimColor>Path: </Text>
            <TextInput
              value={attachPath}
              onChange={setAttachPath}
              focus={addingPath}
              onSubmit={() => {
                try {
                  const p = attachPath.trim();
                  if (!p) return setAddingPath(false);
                  const content = fs.readFileSync(p);
                  const filename = path.basename(p);
                  const contentType = (lookupMime(filename) || "application/octet-stream") as string;
                  setAttachments((arr) => [...arr, { filename, content, contentType }]);
                  setAddingPath(false);
                } catch (e: any) {
                  setError(`Failed to add attachment: ${e.message || e}`);
                  setAddingPath(false);
                }
              }}
              placeholder="/path/to/file"
            />
            <Text dimColor> (Enter to add, Esc to cancel)</Text>
          </Box>
        )}
        {addingSigPath && (
          <Box>
            <Text dimColor>Signature file path: </Text>
            <TextInput
              value={sigPath}
              onChange={setSigPath}
              focus={addingSigPath}
              onSubmit={() => {
                try {
                  const p = sigPath.trim();
                  if (!p) return setAddingSigPath(false);
                  const content = fs.readFileSync(p, "utf8");
                  const ext = path.extname(p).toLowerCase();
                  const format: "text" | "html" = ext === ".html" || ext === ".htm" ? "html" : "text";
                  onSetSignatureContent?.(content, format);
                  setIncludeSignature(true);
                } catch (e: any) {
                  setError(`Failed to set signature: ${e.message || e}`);
                } finally {
                  setAddingSigPath(false);
                  setSigPath("");
                }
              }}
              placeholder="/path/to/signature.(txt|html)"
            />
            <Text dimColor> (Enter to set, Esc to cancel)</Text>
          </Box>
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Subject: </Text>
        <TextInput
          value={subject}
          onChange={setSubject}
          focus={!addingPath && focus === "subject"}
          placeholder="Hello"
        />
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>Body: </Text>
        <Box borderStyle="round" paddingX={1} paddingY={0} width={80}>
          <Text>
            {(() => {
              if (focus !== "body") return body;
              const pre = body.slice(0, cursor);
              const post = body.slice(cursor);
              if (mode === "insert") return pre + "▌" + post;
              // normal mode: show block at cursor position; if at end, show block
              if (cursor < body.length) return pre + "█" + post.slice(1);
              return pre + "█";
            })()}
          </Text>
        </Box>
      </Box>
      <Box>
        <Text dimColor>
          Words: {useMemo(() => (body.trim().length ? body.trim().split(/\s+/).length : 0), [body])} · Letters:{" "}
          {body.length}
        </Text>
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}
      {sending ? (
        <Box marginTop={1}>
          <SpinnerLine label="Sending…" />
        </Box>
      ) : (
        <>
          <Box marginTop={1}>
            <Text dimColor>{focus === "footer" ? "› " : ""}See instructions (Enter)</Text>
          </Box>
          {showInstructions && (
            <Box marginTop={1}>
              <Text dimColor>
                Body uses Vim editing — normal/insert modes. In normal: h j k l move · w/b next/prev word · i/a/I/A/o/O
                insert · x delete char · dd delete line · dw/db delete to next/prev word · yy yank line · p paste · 0/$
                line start/end. Backspace deletes in insert or normal. Esc leaves insert. Tab/Shift+Tab navigate ·
                ctrl+enter newline · ctrl+s send · esc cancel · ctrl+a add file · ctrl+r remove last · ctrl+d clear
                attachments · ctrl+g toggle signature · ctrl+G set signature file
              </Text>
            </Box>
          )}
        </>
      )}
      {attachments.length > 0 && (
        <Box marginTop={1}>
          <Text dimColor>
            {attachments.length} attachment{attachments.length > 1 ? "s" : ""} will be sent
          </Text>
        </Box>
      )}
      {sentInfo && (
        <Box marginTop={1}>
          <Text color="green">Sent ✓</Text>
        </Box>
      )}
      {focus === "body" && (
        <Box marginTop={1}>
          <Text dimColor>-- {mode.toUpperCase()} --</Text>
        </Box>
      )}
    </Box>
  );
}
