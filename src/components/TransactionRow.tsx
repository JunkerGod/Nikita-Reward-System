import { GiftIcon, SparkleIcon, TrashIcon } from "@phosphor-icons/react";
import type { Profile, Transaction } from "../lib/types";
import { fmtShortDate, fmtSigned, fmtTime } from "../lib/format";
import { IconButton } from "./ui";

export function TransactionRow({
  tx,
  profiles,
  onDelete,
  showDate = false,
}: {
  tx: Transaction;
  profiles: Profile[];
  onDelete?: (tx: Transaction) => void;
  showDate?: boolean;
}) {
  const who = profiles.find((p) => p.id === tx.added_by)?.name;
  const earn = tx.type === "earn";
  return (
    <li className={`flex items-start gap-3 rounded-2xl px-4 py-3 ${earn ? "bg-earn" : "bg-spend ring-1 ring-inset ring-soft"}`}>
      <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${earn ? "bg-surface text-btn" : "bg-soft text-btn"}`}>
        {earn ? <SparkleIcon size={20} aria-hidden="true" /> : <GiftIcon size={20} aria-hidden="true" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold text-ink break-words">{tx.label}</p>
        {tx.note ? <p className="text-sm font-semibold text-ink/90 break-words">{tx.note}</p> : null}
        <p className="text-xs font-semibold text-muted">
          {earn ? "Added" : "Spent"}
          {who ? ` by ${who}` : ""}, {showDate ? `${fmtShortDate(tx.created_at)} ` : ""}
          {fmtTime(tx.created_at)}
        </p>
      </div>
      <span className={`shrink-0 text-xl font-black tabular-nums ${earn ? "text-btn" : "text-muted"}`}>
        <span className="sr-only">{earn ? "earned " : "spent "}</span>
        {fmtSigned(tx.type, tx.points)}
      </span>
      {onDelete ? (
        <IconButton label={`Delete ${tx.label}`} onClick={() => onDelete(tx)} className="-my-1 -mr-2">
          <TrashIcon size={20} aria-hidden="true" />
        </IconButton>
      ) : null}
    </li>
  );
}
