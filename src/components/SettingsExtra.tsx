import { useState, type FormEvent } from "react";
import { CalendarHeartIcon, PencilSimpleIcon, PlusCircleIcon, TrashIcon } from "@phosphor-icons/react";
import { useData } from "../lib/data";
import { supabase } from "../lib/supabase";
import { must, useSave } from "../lib/save";
import { useToast } from "./Toasts";
import { Button, Counter, IconButton } from "./ui";
import { ConfirmDialog, Sheet } from "./Sheet";
import { daysUntil, prettyName, upcoming } from "../lib/specialDays";
import { parseAlbumToken } from "../lib/album";
import type { SpecialDay } from "../lib/types";

const dateFmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric" });
const dayMonthFmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long" });

function fmtSpecial(d: SpecialDay) {
  return d.year ? dateFmt.format(new Date(d.year, d.month - 1, d.day)) : dayMonthFmt.format(new Date(2000, d.month - 1, d.day));
}

const pad = (n: number) => String(n).padStart(2, "0");

// ---------------------------------------------------------------------------
// Special days
// ---------------------------------------------------------------------------

export function SpecialDaysSettings() {
  const { specialDays, refresh } = useData();
  const save = useSave();
  const [editing, setEditing] = useState<SpecialDay | "new" | null>(null);
  const [deleting, setDeleting] = useState<SpecialDay | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!deleting) return;
    const d = deleting;
    setBusy(true);
    await save(
      async () => must(await supabase.from("special_days").delete().eq("id", d.id)),
      () => {
        setDeleting(null);
        void refresh("specialDays");
      },
    );
    setBusy(false);
  };

  return (
    <section aria-labelledby="special-days" className="mt-10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="special-days" className="text-xl font-black text-ink">
          Special days
        </h2>
        <Button size="sm" onClick={() => setEditing("new")}>
          <PlusCircleIcon size={18} aria-hidden="true" />
          Add Day
        </Button>
      </div>
      <ul className="flex flex-col gap-2">
        {upcoming(specialDays).map((d) => (
          <li key={d.id} className="flex items-center gap-3 rounded-2xl bg-surface py-2 pl-3 pr-1 shadow-card">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-soft text-btn">
              <CalendarHeartIcon size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-ink break-words">{prettyName(d.name)}</p>
              <p className="text-xs font-bold text-muted">
                {fmtSpecial(d)}, {daysUntil(d) === 0 ? "today" : `in ${daysUntil(d)} days`}
              </p>
            </div>
            <IconButton label={`Edit ${d.name}`} onClick={() => setEditing(d)}>
              <PencilSimpleIcon size={20} aria-hidden="true" />
            </IconButton>
            <IconButton label={`Delete ${d.name}`} onClick={() => setDeleting(d)}>
              <TrashIcon size={20} aria-hidden="true" />
            </IconButton>
          </li>
        ))}
      </ul>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add Special Day" : "Edit Special Day"}>
        {editing !== null ? (
          <SpecialDayForm
            key={editing === "new" ? "new" : editing.id}
            day={editing === "new" ? null : editing}
            onSaved={() => {
              setEditing(null);
              void refresh("specialDays");
            }}
          />
        ) : null}
      </Sheet>
      <ConfirmDialog
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void remove()}
        busy={busy}
        confirmLabel="Delete Day"
        description={deleting ? <>&ldquo;{prettyName(deleting.name)}&rdquo; goes for good</> : null}
      />
    </section>
  );
}

function SpecialDayForm({ day, onSaved }: { day: SpecialDay | null; onSaved: () => void }) {
  const [name, setName] = useState(day ? prettyName(day.name) : "");
  const [date, setDate] = useState(day ? `${day.year ?? 2026}-${pad(day.month)}-${pad(day.day)}` : "");
  const [errors, setErrors] = useState<{ name?: string; date?: string }>({});
  const [busy, setBusy] = useState(false);
  const save = useSave();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Give it a name";
    if (!m) next.date = "Pick a date";
    setErrors(next);
    if (next.name || next.date || !m) return;
    const row = { name: name.trim().replace(/’/g, "'"), year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
    setBusy(true);
    await save(async () => {
      if (day) must(await supabase.from("special_days").update(row).eq("id", day.id));
      else must(await supabase.from("special_days").insert({ ...row, kind: "other" }));
    }, onSaved);
    setBusy(false);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 pb-2">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="sd-name" className="text-sm font-extrabold text-ink">
            Name
          </label>
          <Counter value={name} max={40} />
        </div>
        <input
          id="sd-name"
          name="name"
          type="text"
          autoComplete="off"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Our first trip…"
          aria-invalid={errors.name ? true : undefined}
          className="field"
        />
        {errors.name ? <p className="text-sm font-bold text-btn">{errors.name}</p> : null}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="sd-date" className="text-sm font-extrabold text-ink">
          Date (the year counts the years)
        </label>
        <input
          id="sd-date"
          name="date"
          type="date"
          autoComplete="off"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-invalid={errors.date ? true : undefined}
          className="field bg-surface text-ink"
        />
        {errors.date ? <p className="text-sm font-bold text-btn">{errors.date}</p> : null}
      </div>
      <Button type="submit" size="lg" busy={busy} className="w-full">
        {day ? "Save Day" : "Add Day"}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// iCloud shared album
// ---------------------------------------------------------------------------

export function AlbumSettings() {
  const { settings, refresh } = useData();
  const current = settings.icloud_album ?? "";
  const [value, setValue] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = useSave();
  const toast = useToast();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const link = value.trim();
    if (link && !parseAlbumToken(link)) {
      setError("That doesnt look like an iCloud shared album link");
      return;
    }
    setError(null);
    setBusy(true);
    await save(
      async () =>
        must(await supabase.from("app_settings").upsert({ key: "icloud_album", value: link || null, updated_at: new Date().toISOString() })),
      () => {
        toast.show(link ? "Oki album linked ☺️" : "Oki unlinked");
        void refresh("settings");
      },
    );
    setBusy(false);
  };

  return (
    <section aria-labelledby="album" className="mt-10">
      <h2 id="album" className="mb-1 text-xl font-black text-ink">
        Photo memories
      </h2>
      <p className="mb-3 text-sm font-semibold text-muted">
        In Photos, open ur shared album, tap the people icon, turn on Public Website and copy the link
      </p>
      <form onSubmit={submit} noValidate className="flex flex-col gap-2">
        <label htmlFor="album-link" className="text-sm font-extrabold text-ink">
          iCloud shared album link
        </label>
        <input
          id="album-link"
          name="album"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://www.icloud.com/sharedalbum/#B0a…"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "album-error" : undefined}
          className="field"
        />
        {error ? (
          <p id="album-error" className="text-sm font-bold text-btn">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="secondary" busy={busy} className="self-start">
          Save Link
        </Button>
      </form>
    </section>
  );
}
