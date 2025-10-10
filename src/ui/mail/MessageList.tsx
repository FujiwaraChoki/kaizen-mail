import React, { useMemo, useState } from "react";
import { Box, Text, useInput, useStdin } from "ink";
import SelectInput, { ItemOf } from "ink-select-input";
import type { MessageListItem } from "../../mail/imap.js";
import { format } from "date-fns";

type Item = ItemOf<{ label: string; value: number }>;

export function MessageList({
  mailbox,
  items,
  onOpen,
  page,
  totalPages,
  onBatchDelete,
  onBatchMove,
  onBatchMarkSeen,
  onBatchMarkFlagged,
  onToggleFlagged,
  multiSelectMode = false,
  onToggleMultiSelect,
}: {
  mailbox: string;
  items: MessageListItem[];
  onOpen: (uid: number) => void;
  page?: number;
  totalPages?: number;
  onBatchDelete?: (uids: number[]) => void;
  onBatchMove?: (uids: number[], destination: string) => void;
  onBatchMarkSeen?: (uids: number[], seen: boolean) => void;
  onBatchMarkFlagged?: (uids: number[], flagged: boolean) => void;
  onToggleFlagged?: (uid: number, flagged: boolean) => void;
  multiSelectMode?: boolean;
  onToggleMultiSelect?: () => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const { isRawModeSupported } = useStdin();

  const list = useMemo(
    () =>
      items.map((m) => ({
        label: renderMessageRow(m, multiSelectMode, selected.has(m.uid)),
        value: m.uid,
      })),
    [items, multiSelectMode, selected],
  );

  useInput(
    (input, key) => {
      if (!multiSelectMode) return;

      if (input === " " && items[currentIndex]) {
        const uid = items[currentIndex]!.uid;
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(uid)) next.delete(uid);
          else next.add(uid);
          return next;
        });
      } else if (key.upArrow && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (key.downArrow && currentIndex < items.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (input.toLowerCase() === "d" && selected.size > 0) {
        onBatchDelete?.(Array.from(selected));
        setSelected(new Set());
      } else if (input.toLowerCase() === "m" && selected.size > 0 && onBatchMarkSeen) {
        onBatchMarkSeen(Array.from(selected), true);
        setSelected(new Set());
      } else if (input.toLowerCase() === "u" && selected.size > 0 && onBatchMarkSeen) {
        onBatchMarkSeen(Array.from(selected), false);
        setSelected(new Set());
      } else if (input.toLowerCase() === "f" && selected.size > 0 && onBatchMarkFlagged) {
        onBatchMarkFlagged(Array.from(selected), true);
        setSelected(new Set());
      } else if (input.toLowerCase() === "x" && selected.size > 0) {
        setSelected(new Set());
      }
    },
    { isActive: isRawModeSupported && multiSelectMode },
  );

  // Handle single-message flagging in normal mode
  useInput(
    (input, key) => {
      if (multiSelectMode) return;
      if (input.toLowerCase() === "s" && items[currentIndex] && onToggleFlagged) {
        const msg = items[currentIndex]!;
        onToggleFlagged(msg.uid, !msg.flagged);
      }
    },
    { isActive: isRawModeSupported && !multiSelectMode },
  );

  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between">
        <Text color="green">
          {mailbox} — {items.length} messages
          {typeof page === "number" && typeof totalPages === "number" ? ` (Page ${page + 1}/${totalPages})` : ""}
        </Text>
        {multiSelectMode && (
          <Text color="yellow">{selected.size > 0 ? `${selected.size} selected` : "Multi-select mode"}</Text>
        )}
      </Box>
      <Box marginTop={1}>
        <SelectInput
          items={list}
          itemComponent={MessageRow as any}
          onSelect={(i: Item) => {
            if (!multiSelectMode) {
              onOpen(i.value);
            }
          }}
          onHighlight={(i: Item) => {
            const idx = items.findIndex((m) => m.uid === i.value);
            if (idx >= 0) setCurrentIndex(idx);
          }}
        />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          {multiSelectMode ? (
            <>
              Space select · ↑↓ navigate · d delete · m mark read · u mark unread · f flag · x clear · v exit
              multi-select
            </>
          ) : (
            <>
              R refresh · n next page · p prev page · c compose · / search · s star · v multi-select · o settings · b
              back
            </>
          )}
        </Text>
      </Box>
    </Box>
  );
}

function renderMessageRow(m: MessageListItem, multiSelect: boolean, isSelected: boolean): string {
  const date = m.date ? format(m.date, "MMM d HH:mm") : "";
  const seen = m.seen ? " " : "●";
  const flag = m.flagged ? "★" : " ";
  const select = multiSelect ? (isSelected ? "[✓] " : "[ ] ") : "";
  const from = (m.from || "").padEnd(20).slice(0, 20);
  const subj = m.subject.replace(/\s+/g, " ").slice(0, 60);
  return `${select}${seen}${flag} ${date}  ${from}  ${subj}`;
}

const MessageRow: React.FC<any> = ({ label, isSelected }) => {
  const isUnread = typeof label === "string" && label.includes("●");
  const isFlagged = typeof label === "string" && label.includes("★");

  // Parse components
  let dotPart = "";
  let rest = label;

  if (typeof label === "string") {
    // Check for multi-select checkbox
    if (label.startsWith("[✓] ") || label.startsWith("[ ] ")) {
      const checkbox = label.slice(0, 4);
      rest = label.slice(4);
      return (
        <Box>
          <Text color="cyan">{checkbox}</Text>
          <Text color={isUnread ? "green" : undefined}>{rest.charAt(0)}</Text>
          <Text color={isFlagged ? "yellow" : undefined}>{rest.charAt(1)}</Text>
          <Text color={isSelected ? "blue" : undefined}>{rest.slice(2)}</Text>
        </Box>
      );
    }

    dotPart = label.charAt(0);
    const flagPart = label.charAt(1);
    rest = label.slice(2);

    return (
      <Box>
        <Text color={isUnread ? "green" : undefined}>{dotPart}</Text>
        <Text color={isFlagged ? "yellow" : undefined}>{flagPart}</Text>
        <Text color={isSelected ? "blue" : undefined}>{rest}</Text>
      </Box>
    );
  }

  return <Text color={isSelected ? "blue" : undefined}>{label}</Text>;
};
