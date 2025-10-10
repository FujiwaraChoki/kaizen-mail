import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Box, Text, useInput, useStdin } from "ink";
import { getStore, getDraftsStore } from "../../utils/store.js";
import type { Account, SignatureConfig } from "../../utils/store.js";
import {
  connectImap,
  reconnectImap,
  fetchMessage,
  listMailboxes,
  listMessagesByUids,
  openMailbox,
  searchMessages,
  toggleFlagged,
  deleteMessages,
  markMultipleSeen,
  markMultipleFlagged,
  createMailbox,
  deleteMailbox,
  renameMailbox,
  type MessageListItem,
  type Mailbox,
  type SearchCriteria,
} from "../../mail/imap.js";
import { SpinnerLine } from "../shared/SpinnerLine.js";
import { MailboxList } from "./MailboxList.js";
import { MessageList } from "./MessageList.js";
import { MessageView } from "./MessageView.js";
import { Compose } from "./Compose.js";
import type { ParsedMessage } from "../../mail/imap.js";
import { Settings } from "../settings/Settings.js";
import { SearchPanel, type SearchFilters } from "./SearchPanel.js";
import { DraftsPanel } from "./DraftsPanel.js";
import { MailboxManager } from "./MailboxManager.js";
import { MailHelp } from "./MailHelp.js";
import { saveDraft, getDrafts, deleteDraft, type Draft } from "../../utils/drafts.js";
import { closeAllConnections } from "../../mail/smtp.js";

type Screen =
  | "mailboxes"
  | "messages"
  | "reader"
  | "compose"
  | "settings"
  | "search"
  | "drafts"
  | "mailboxManager"
  | "help";

export function MailUI({ encryptionKey, onQuit }: { encryptionKey: string; onQuit: () => void }) {
  const store = useMemo(() => getStore(encryptionKey), [encryptionKey]);
  const draftsStore = useMemo(() => getDraftsStore(encryptionKey), [encryptionKey]);
  const account = store.get("account") as Account;
  const [signature, setSignature] = useState<SignatureConfig | undefined>(
    () => store.get("signature") as SignatureConfig | undefined,
  );
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "reconnecting">(
    "disconnected",
  );
  const [screen, setScreen] = useState<Screen>("mailboxes");
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [selectedMailbox, setSelectedMailbox] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageListItem[]>([]);
  const [allUids, setAllUids] = useState<number[]>([]);
  const [filteredUids, setFilteredUids] = useState<number[]>([]);
  const [uids, setUids] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [selectedMessage, setSelectedMessage] = useState<number | null>(null);
  const [composeInit, setComposeInit] = useState<{
    to?: string;
    subject?: string;
    body?: string;
    attachments?: any[];
    draftId?: string;
  } | null>(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [activeFilters, setActiveFilters] = useState<SearchFilters | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const { isRawModeSupported, setRawMode } = useStdin();

  // Load drafts
  const loadDrafts = useCallback(() => {
    setDrafts(getDrafts(draftsStore));
  }, [draftsStore]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  // Handle reconnection
  const handleReconnect = useCallback(async () => {
    if (!client) return;
    setConnectionStatus("reconnecting");
    try {
      const newClient = await reconnectImap(client, account);
      setClient(newClient);
      setConnectionStatus("connected");
      if (selectedMailbox) {
        await openMailbox(newClient, selectedMailbox);
      }
    } catch (e: any) {
      setConnectionStatus("disconnected");
      setError(`Reconnection failed: ${e.message || "Unknown error"}`);
    }
  }, [client, account, selectedMailbox]);

  useInput(
    (input, key) => {
      if (
        screen === "compose" ||
        screen === "reader" ||
        screen === "settings" ||
        screen === "search" ||
        screen === "drafts" ||
        screen === "mailboxManager" ||
        screen === "help"
      ) {
        if (input.toLowerCase() === "q") {
          closeAllConnections();
          onQuit();
        }
        if (key.escape && screen === "search") setScreen("messages");
        if (key.escape && screen === "drafts") setScreen("messages");
        if (key.escape && screen === "mailboxManager") setScreen("mailboxes");
        if (key.escape && screen === "help") setScreen(selectedMailbox ? "messages" : "mailboxes");
        return;
      }
      if (input.toLowerCase() === "q") {
        closeAllConnections();
        onQuit();
      }
      if (input.toLowerCase() === "b") {
        if (screen === "messages") setScreen("mailboxes");
      }
      if (input.toLowerCase() === "c" && screen === "messages") {
        setComposeInit(null);
        setScreen("compose");
      }
      if (input.toLowerCase() === "r" && screen === "messages" && selectedMailbox) void refreshMessages();
      if (input.toLowerCase() === "n" && screen === "messages") void nextPage();
      if (input.toLowerCase() === "p" && screen === "messages") void prevPage();
      if (input.toLowerCase() === "o" && (screen === "messages" || screen === "mailboxes")) setScreen("settings");
      if (input === "/" && screen === "messages") setScreen("search");
      if (input.toLowerCase() === "d" && screen === "messages") {
        loadDrafts();
        setScreen("drafts");
      }
      if (input.toLowerCase() === "m" && screen === "mailboxes") setScreen("mailboxManager");
      if (input.toLowerCase() === "v" && screen === "messages") setMultiSelectMode(!multiSelectMode);
      if (input === "?" || (key.ctrl && input === "h")) setScreen("help");
    },
    { isActive: isRawModeSupported },
  );

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setConnectionStatus("reconnecting");
        const c = await connectImap(account);
        setClient(c);
        setConnectionStatus("connected");
        const boxes = await listMailboxes(c);
        setMailboxes(boxes);
        const last = store.get("lastSelectedMailbox") || "INBOX";
        setSelectedMailbox(last);
        await openMailbox(c, last);
        const all = await c.search({ all: true }, { uid: true });
        setAllUids(all);
        setFilteredUids(all);
        setUids(all);
        setPage(0);
        const pageUids = slicePage(all, 0, pageSize);
        const msgs = await listMessagesByUids(c, pageUids);
        setMessages(msgs);
        setScreen("messages");
      } catch (e: any) {
        setConnectionStatus("disconnected");
        setError(e.message || "Failed to connect");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function openBox(path: string) {
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      await openMailbox(client, path);
      const all = await client.search({ all: true }, { uid: true });
      setAllUids(all);
      setFilteredUids(all);
      setUids(all);
      setPage(0);
      const pageUids = slicePage(all, 0, pageSize);
      const msgs = await listMessagesByUids(client, pageUids);
      setSelectedMailbox(path);
      store.set("lastSelectedMailbox", path);
      setMessages(msgs);
      setActiveFilters(null);
      setScreen("messages");
    } catch (e: any) {
      setError(e.message || "Failed to open mailbox");
    } finally {
      setLoading(false);
    }
  }

  async function refreshMessages() {
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      const all = await client.search({ all: true }, { uid: true });
      setAllUids(all);
      if (activeFilters) {
        await applyFilters(activeFilters);
      } else {
        setFilteredUids(all);
        setUids(all);
        setPage(0);
        const pageUids = slicePage(all, 0, pageSize);
        const msgs = await listMessagesByUids(client, pageUids);
        setMessages(msgs);
      }
    } catch (e: any) {
      setError(e.message || "Failed to refresh");
    } finally {
      setLoading(false);
    }
  }

  async function applyFilters(filters: SearchFilters) {
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      const criteria: SearchCriteria = {};
      if (filters.from) criteria.from = filters.from;
      if (filters.to) criteria.to = filters.to;
      if (filters.subject) criteria.subject = filters.subject;
      if (filters.body) criteria.body = filters.body;
      if (filters.unreadOnly) criteria.unseen = true;
      if (filters.flaggedOnly) criteria.flagged = true;
      if (filters.dateFrom) {
        const date = new Date(filters.dateFrom);
        if (!isNaN(date.getTime())) criteria.since = date;
      }
      if (filters.dateTo) {
        const date = new Date(filters.dateTo);
        if (!isNaN(date.getTime())) criteria.before = date;
      }

      // If no criteria, use all
      if (Object.keys(criteria).length === 0) {
        criteria.all = true;
      }

      const results = await searchMessages(client, criteria);
      setFilteredUids(results);
      setUids(results);
      setPage(0);
      const pageUids = slicePage(results, 0, pageSize);
      const msgs = await listMessagesByUids(client, pageUids);
      setMessages(msgs);
      setActiveFilters(filters);
      setScreen("messages");
    } catch (e: any) {
      setError(e.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function totalPages(): number {
    return Math.max(1, Math.ceil(uids.length / pageSize));
  }

  function slicePage(allUids: number[], pageIndex: number, size: number): number[] {
    const total = allUids.length;
    const end = total - pageIndex * size;
    const start = Math.max(0, end - size);
    return allUids.slice(start, end);
  }

  async function loadPage(pageIndex: number) {
    if (!client) return;
    const maxPages = totalPages();
    const p = Math.min(Math.max(0, pageIndex), maxPages - 1);
    setPage(p);
    const pageUids = slicePage(uids, p, pageSize);
    const msgs = await listMessagesByUids(client, pageUids);
    setMessages(msgs);
  }

  async function nextPage() {
    if (page + 1 < totalPages()) await loadPage(page + 1);
  }

  async function prevPage() {
    if (page > 0) await loadPage(page - 1);
  }

  function prefixSubject(prefix: string, subject?: string) {
    const s = (subject || "").trim();
    if (!s) return `${prefix}: `;
    const re = new RegExp(`^${prefix}\\s*:`, "i");
    return re.test(s) ? s : `${prefix}: ${s}`;
  }

  function quoteBody(msg: ParsedMessage) {
    const original = msg.text || "";
    const quoted = original
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n");
    const header = `On ${msg.date ? msg.date.toLocaleString() : "unknown date"}, ${msg.from || "unknown"} wrote:`;
    return `\n\n${header}\n${quoted}`;
  }

  function openReply(msg: ParsedMessage) {
    setComposeInit({
      to: msg.from || "",
      subject: prefixSubject("Re", msg.subject),
      body: quoteBody(msg),
    });
    setScreen("compose");
  }

  function openForward(
    msg: ParsedMessage,
    opts?: { attachOriginalEml?: boolean; attachments?: { filename?: string; content?: any; contentType?: string }[] },
  ) {
    const hdr = [
      "----- Forwarded message -----",
      `From: ${msg.from || ""}`,
      `Date: ${msg.date ? msg.date.toLocaleString() : ""}`,
      `Subject: ${msg.subject || ""}`,
      `To: ${msg.to || ""}`,
      "",
    ].join("\n");
    const init: {
      to?: string;
      subject?: string;
      body?: string;
      attachments?: { filename?: string; content?: any; contentType?: string }[];
    } = {
      to: "",
      subject: prefixSubject("Fwd", msg.subject),
      body: `${hdr}\n${msg.text || ""}`,
    };
    if (opts?.attachments && opts.attachments.length > 0) {
      init.attachments = opts.attachments;
    } else if (opts?.attachOriginalEml && msg.raw) {
      init.attachments = [
        {
          filename: msg.subject ? `${msg.subject}.eml` : "forwarded-message.eml",
          content: msg.raw,
          contentType: "message/rfc822",
        },
      ];
    }
    setComposeInit(init);
    setScreen("compose");
  }

  function openInReader(uid: number) {
    setSelectedMessage(uid);
    setScreen("reader");
  }

  async function handleToggleFlagged(uid: number, flagged: boolean) {
    if (!client) return;
    try {
      await toggleFlagged(client, uid, flagged);
      await refreshMessages();
    } catch (e: any) {
      setError(e.message || "Failed to toggle flag");
    }
  }

  async function handleBatchDelete(uids: number[]) {
    if (!client || uids.length === 0) return;
    try {
      await deleteMessages(client, uids);
      await refreshMessages();
    } catch (e: any) {
      setError(e.message || "Failed to delete messages");
    }
  }

  async function handleBatchMarkSeen(uids: number[], seen: boolean) {
    if (!client || uids.length === 0) return;
    try {
      await markMultipleSeen(client, uids, seen);
      await refreshMessages();
    } catch (e: any) {
      setError(e.message || "Failed to mark messages");
    }
  }

  async function handleBatchMarkFlagged(uids: number[], flagged: boolean) {
    if (!client || uids.length === 0) return;
    try {
      await markMultipleFlagged(client, uids, flagged);
      await refreshMessages();
    } catch (e: any) {
      setError(e.message || "Failed to flag messages");
    }
  }

  async function handleCreateMailbox(path: string) {
    if (!client) return;
    await createMailbox(client, path);
    const boxes = await listMailboxes(client);
    setMailboxes(boxes);
  }

  async function handleDeleteMailbox(path: string) {
    if (!client) return;
    await deleteMailbox(client, path);
    const boxes = await listMailboxes(client);
    setMailboxes(boxes);
  }

  async function handleRenameMailbox(oldPath: string, newPath: string) {
    if (!client) return;
    await renameMailbox(client, oldPath, newPath);
    const boxes = await listMailboxes(client);
    setMailboxes(boxes);
  }

  function handleOpenDraft(draft: Draft) {
    setComposeInit({
      to: draft.to,
      subject: draft.subject,
      body: draft.body,
      attachments: draft.attachments,
      draftId: draft.id,
    });
    setScreen("compose");
  }

  function handleDeleteDraft(id: string) {
    deleteDraft(draftsStore, id);
    loadDrafts();
  }

  if (loading)
    return (
      <Box flexDirection="column">
        <Header account={account} status={connectionStatus} unreadCount={0} />
        <SpinnerLine label="Connecting…" />
      </Box>
    );

  if (error && !client)
    return (
      <Box flexDirection="column">
        <Header account={account} status={connectionStatus} unreadCount={0} />
        <Text color="red">{error}</Text>
        <Text dimColor marginTop={1}>
          Press r to retry connection
        </Text>
      </Box>
    );

  const unreadCount = messages.filter((m) => !m.seen).length;

  return (
    <Box flexDirection="column">
      <Header account={account} status={connectionStatus} unreadCount={unreadCount} />
      {error && (
        <Box>
          <Text color="red">{error}</Text>
        </Box>
      )}
      {screen === "mailboxes" && <MailboxList items={mailboxes} onSelect={(m) => openBox(m.path)} />}
      {screen === "messages" && (
        <MessageList
          mailbox={selectedMailbox || "INBOX"}
          items={messages}
          page={page}
          totalPages={totalPages()}
          onOpen={(uid) => openInReader(uid)}
          onBatchDelete={handleBatchDelete}
          onBatchMarkSeen={handleBatchMarkSeen}
          onBatchMarkFlagged={handleBatchMarkFlagged}
          onToggleFlagged={handleToggleFlagged}
          multiSelectMode={multiSelectMode}
          onToggleMultiSelect={() => setMultiSelectMode(!multiSelectMode)}
        />
      )}
      {screen === "reader" && selectedMessage && client && (
        <MessageView
          uid={selectedMessage}
          client={client}
          onBack={() => setScreen("messages")}
          fetcher={fetchMessage}
          onReply={(m) => openReply(m)}
          onForward={(m, opts) => openForward(m, opts)}
        />
      )}
      {screen === "compose" && (
        <Compose
          account={account}
          onClose={() => {
            setComposeInit(null);
            setScreen("messages");
          }}
          initialTo={composeInit?.to}
          initialSubject={composeInit?.subject}
          initialBody={composeInit?.body}
          initialAttachments={composeInit?.attachments}
          draftId={composeInit?.draftId}
          signatureConfig={signature}
          draftsStore={draftsStore}
          onSetSignatureEnabled={(enabled) => {
            const next: SignatureConfig = {
              enabled,
              content: signature?.content || "",
              format: signature?.format || "text",
            };
            store.set("signature", next);
            setSignature(next);
          }}
          onSetSignatureContent={(content, format) => {
            const next: SignatureConfig = { enabled: true, content, format };
            store.set("signature", next);
            setSignature(next);
          }}
        />
      )}
      {screen === "settings" && (
        <Settings
          signature={signature}
          onClose={() => setScreen(selectedMailbox ? "messages" : "mailboxes")}
          onToggleEnabled={(enabled) => {
            const next: SignatureConfig = {
              enabled,
              content: signature?.content || "",
              format: signature?.format || "text",
            };
            store.set("signature", next);
            setSignature(next);
          }}
          onToggleFormat={() => {
            const nextFmt: "text" | "html" = (signature?.format || "text") === "text" ? "html" : "text";
            const next: SignatureConfig = {
              enabled: signature?.enabled ?? true,
              content: signature?.content || "",
              format: nextFmt,
            };
            store.set("signature", next);
            setSignature(next);
          }}
          onSetContent={(content, format) => {
            const next: SignatureConfig = { enabled: true, content, format };
            store.set("signature", next);
            setSignature(next);
          }}
          onClear={() => {
            const next: SignatureConfig = { enabled: false, content: "", format: "text" };
            store.set("signature", next);
            setSignature(next);
          }}
        />
      )}
      {screen === "search" && <SearchPanel onSearch={applyFilters} onClose={() => setScreen("messages")} />}
      {screen === "drafts" && (
        <DraftsPanel
          drafts={drafts}
          onOpen={handleOpenDraft}
          onDelete={handleDeleteDraft}
          onClose={() => setScreen("messages")}
        />
      )}
      {screen === "mailboxManager" && (
        <MailboxManager
          mailboxes={mailboxes}
          onCreate={handleCreateMailbox}
          onDelete={handleDeleteMailbox}
          onRename={handleRenameMailbox}
          onClose={() => setScreen("mailboxes")}
        />
      )}
      {screen === "help" && <MailHelp onClose={() => setScreen(selectedMailbox ? "messages" : "mailboxes")} />}
    </Box>
  );
}

function Header({
  account,
  status,
  unreadCount,
}: {
  account: Account;
  status: "connected" | "disconnected" | "reconnecting";
  unreadCount: number;
}) {
  const statusColor = status === "connected" ? "green" : status === "reconnecting" ? "yellow" : "red";
  const statusText = status === "connected" ? "●" : status === "reconnecting" ? "○" : "✕";

  return (
    <Box marginBottom={1} justifyContent="space-between">
      <Text color="cyan">Kaizen Mail</Text>
      <Box>
        {unreadCount > 0 && (
          <Text color="yellow" marginRight={2}>
            {unreadCount} unread
          </Text>
        )}
        <Text color={statusColor} marginRight={2}>
          {statusText}
        </Text>
        <Text dimColor>{account.email}</Text>
      </Box>
    </Box>
  );
}
