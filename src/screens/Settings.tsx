import { useRef, useState, type FormEvent } from "react";
import { DownloadSimpleIcon, PencilSimpleIcon, PlusCircleIcon, SignOutIcon, TrashIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useData } from "../lib/data";
import { FACES_BUCKET, supabase } from "../lib/supabase";
import { must, useSave } from "../lib/save";
import { useToast } from "../components/Toasts";
import { COPY } from "../lib/copy";
import { ACTIVITY_ICONS, ICON_LABELS, NamedIcon } from "../lib/icons";
import { BackLink, Button, Counter, IconButton, LoadingScreen, PageTitle, Skeleton } from "../components/ui";
import { ConfirmDialog, Sheet } from "../components/Sheet";
import { CropDialog } from "../components/CropDialog";
import { FaceSticker, PlaceholderSticker } from "../components/FaceSticker";
import { NotificationSettings } from "../components/Notifications";
import { AlbumSettings, SpecialDaysSettings } from "../components/SettingsExtra";
import type { Activity, Category, FacePhoto, PhotoKind } from "../lib/types";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "small", label: "Small wins" },
  { id: "medium", label: "Medium" },
  { id: "big", label: "BIG ones" },
];

const PHOTO_SECTIONS: { kind: PhotoKind; title: string; hint: string }[] = [
  { kind: "nikita_happy", title: "Nikita happy", hint: "Used for points, redeeming and moving Jagath up" },
  { kind: "nikita_sad", title: "Nikita sad", hint: "Used for moving Jagath down" },
  { kind: "jagath", title: "Jagath", hint: "The face on the chart. The newest photo is used" },
];

export function Settings() {
  const { status } = useData();
  const toast = useToast();
  return (
    <>
      <BackLink />
      <PageTitle>Settings</PageTitle>
      {status === "loading" ? (
        <LoadingScreen>
          <Skeleton className="h-6 w-28" />
          <Skeleton className="mt-3 h-64" />
          <Skeleton className="mt-8 h-6 w-28" />
          <Skeleton className="mt-3 h-40" />
        </LoadingScreen>
      ) : (
        <>
          <NotificationSettings />
          <div className="mt-10">
            <Activities />
          </div>
          <SpecialDaysSettings />
          <Photos />
          <AlbumSettings />
          <section aria-labelledby="backup" className="mt-10">
            <h2 id="backup" className="mb-1 text-xl font-black text-ink">
              Backup
            </h2>
            <p className="mb-3 text-sm font-semibold text-muted">Downloads everything as a JSON file</p>
            <ExportButton />
          </section>
          <section aria-labelledby="account" className="mt-10">
            <h2 id="account" className="mb-3 text-xl font-black text-ink">
              Account
            </h2>
            <Button
              variant="secondary"
              onClick={async () => {
                await supabase.auth.signOut();
                toast.show(COPY.loggedOut);
              }}
            >
              <SignOutIcon size={20} aria-hidden="true" />
              Log Out
            </Button>
          </section>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

function Activities() {
  const { activities, refresh } = useData();
  const save = useSave();
  const [editing, setEditing] = useState<Activity | "new" | null>(null);
  const [deleting, setDeleting] = useState<Activity | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!deleting) return;
    const a = deleting;
    setBusy(true);
    await save(
      async () => must(await supabase.from("activities").delete().eq("id", a.id)),
      () => {
        setDeleting(null);
        void refresh("activities");
      },
    );
    setBusy(false);
  };

  return (
    <section aria-labelledby="activities">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="activities" className="text-xl font-black text-ink">
          Activities
        </h2>
        <Button size="sm" onClick={() => setEditing("new")}>
          <PlusCircleIcon size={18} aria-hidden="true" />
          Add Activity
        </Button>
      </div>
      {activities.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-soft p-6 text-center font-bold text-ink">No activities yet :(</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {CATEGORIES.flatMap((c) => activities.filter((a) => a.category === c.id)).map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-2xl bg-surface py-2 pl-3 pr-1 shadow-card">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-soft text-btn">
                <NamedIcon name={a.icon} size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-ink break-words">{a.name}</p>
                <p className="text-xs font-bold text-muted">{CATEGORIES.find((c) => c.id === a.category)?.label}</p>
              </div>
              <span className="shrink-0 text-lg font-black text-btn tabular-nums">+{a.points}</span>
              <IconButton label={`Edit ${a.name}`} onClick={() => setEditing(a)}>
                <PencilSimpleIcon size={20} aria-hidden="true" />
              </IconButton>
              <IconButton label={`Delete ${a.name}`} onClick={() => setDeleting(a)}>
                <TrashIcon size={20} aria-hidden="true" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add Activity" : "Edit Activity"}>
        {editing !== null ? (
          <ActivityForm
            key={editing === "new" ? "new" : editing.id}
            activity={editing === "new" ? null : editing}
            onSaved={() => {
              setEditing(null);
              void refresh("activities");
            }}
          />
        ) : null}
      </Sheet>

      <ConfirmDialog
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void remove()}
        busy={busy}
        confirmLabel="Delete Activity"
        description={deleting ? <>&ldquo;{deleting.name}&rdquo; goes for good, points already added stay</> : null}
      />
    </section>
  );
}

function ActivityForm({ activity, onSaved }: { activity: Activity | null; onSaved: () => void }) {
  const [name, setName] = useState(activity?.name ?? "");
  const [points, setPoints] = useState(activity ? String(activity.points) : "");
  const [category, setCategory] = useState<Category>(activity?.category ?? "small");
  const [icon, setIcon] = useState(activity?.icon ?? "star");
  const [errors, setErrors] = useState<{ name?: string; points?: string }>({});
  const [busy, setBusy] = useState(false);
  const save = useSave();
  const nameRef = useRef<HTMLInputElement>(null);
  const pointsRef = useRef<HTMLInputElement>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n = Number(points);
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Give it a name";
    if (!/^\d+$/.test(points.trim()) || n < 1 || n > 500) next.points = "Whole number from 1 to 500";
    setErrors(next);
    if (next.name) return nameRef.current?.focus();
    if (next.points) return pointsRef.current?.focus();
    const row = { name: name.trim(), points: n, category, icon };
    setBusy(true);
    await save(async () => {
      if (activity) must(await supabase.from("activities").update(row).eq("id", activity.id));
      else must(await supabase.from("activities").insert(row));
    }, onSaved);
    setBusy(false);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 pb-2">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="activity-name" className="text-sm font-extrabold text-ink">
            Name
          </label>
          <Counter value={name} max={40} />
        </div>
        <input
          ref={nameRef}
          id="activity-name"
          name="name"
          type="text"
          autoComplete="off"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Went to the gym…"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "activity-name-error" : undefined}
          className="field"
        />
        {errors.name ? (
          <p id="activity-name-error" className="text-sm font-bold text-btn">
            {errors.name}
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="activity-points" className="text-sm font-extrabold text-ink">
            Points
          </label>
          <input
            ref={pointsRef}
            id="activity-points"
            name="points"
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min={1}
            max={500}
            autoComplete="off"
            value={points}
            onChange={(e) => setPoints(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="10…"
            aria-invalid={errors.points ? true : undefined}
            aria-describedby="activity-points-help"
            className="field tabular-nums"
          />
          <p id="activity-points-help" className={`text-xs font-bold ${errors.points ? "text-btn" : "text-muted"}`}>
            {errors.points ?? "1 to 500"}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="activity-category" className="text-sm font-extrabold text-ink">
            Group
          </label>
          <select
            id="activity-category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="field bg-surface text-ink"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-extrabold text-ink">Icon</legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {ACTIVITY_ICONS.map((n) => {
            const checked = icon === n;
            return (
              <label
                key={n}
                className={`press flex aspect-square cursor-pointer items-center justify-center rounded-2xl transition-colors duration-150 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-btn ${
                  checked ? "bg-soft text-btn ring-3 ring-btn" : "bg-surface text-muted ring-2 ring-soft hover:text-btn"
                }`}
              >
                <input type="radio" name="icon" value={n} checked={checked} onChange={() => setIcon(n)} className="sr-only" />
                <NamedIcon name={n} size={26} />
                <span className="sr-only">{ICON_LABELS[n]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <Button type="submit" size="lg" busy={busy} className="w-full">
        {activity ? "Save Activity" : "Add Activity"}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Face photos
// ---------------------------------------------------------------------------

function Photos() {
  const { photosOf, refresh } = useData();
  const save = useSave();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<PhotoKind | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [deleting, setDeleting] = useState<FacePhoto | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = (k: PhotoKind) => {
    setKind(k);
    input.current?.click();
  };

  const upload = (png: Blob) =>
    save(async () => {
      const path = `${kind}/${crypto.randomUUID()}.png`;
      must(await supabase.storage.from(FACES_BUCKET).upload(path, png, { contentType: "image/png", upsert: false }));
      must(await supabase.from("face_photos").insert({ storage_path: path, kind }));
    }).then((ok) => {
      if (ok) {
        setFile(null);
        toast.show("Oki added ☺️");
        void refresh("photos");
      }
      return ok;
    });

  const remove = async () => {
    if (!deleting) return;
    const p = deleting;
    setBusy(true);
    await save(
      async () => {
        must(await supabase.from("face_photos").delete().eq("id", p.id));
        await supabase.storage.from(FACES_BUCKET).remove([p.storage_path]);
      },
      () => {
        setDeleting(null);
        void refresh("photos");
      },
    );
    setBusy(false);
  };

  return (
    <section aria-labelledby="photos" className="mt-10">
      <h2 id="photos" className="mb-1 text-xl font-black text-ink">
        Face photos
      </h2>
      <p className="mb-4 text-sm font-semibold text-muted">Only the two of u can see these</p>

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          e.target.value = "";
          if (f) setFile(f);
        }}
      />

      <div className="flex flex-col gap-4">
        {PHOTO_SECTIONS.map((s) => {
          const photos = photosOf(s.kind);
          return (
            <div key={s.kind} className="rounded-2xl bg-surface p-4 shadow-card">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-ink">{s.title}</h3>
                  <p className="text-sm font-semibold text-muted">{s.hint}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => pick(s.kind)}>
                  <UploadSimpleIcon size={18} aria-hidden="true" />
                  Upload Photo
                </Button>
              </div>
              {photos.length === 0 ? (
                <div className="flex items-center gap-4 rounded-2xl bg-page p-3">
                  <PlaceholderSticker kind={s.kind} width={56} />
                  <p className="text-sm font-bold text-ink">
                    {s.kind === "nikita_sad"
                      ? "No photo yet, sad confetti uses blue broken hearts"
                      : s.kind === "jagath"
                        ? "No photo yet, the chart uses this sticker"
                        : "No photo yet, confetti uses pink hearts"}
                  </p>
                </div>
              ) : (
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {photos.map((p, i) => (
                    <li key={p.id} className="relative flex flex-col items-center gap-1 rounded-2xl bg-page p-2">
                      <FaceSticker src={p.url} kind={s.kind} width={64} alt={`${s.title} photo ${i + 1}`} />
                      {s.kind === "jagath" && i === 0 ? <span className="text-xs font-extrabold text-btn">In use</span> : null}
                      <IconButton label={`Delete ${s.title} photo ${i + 1}`} onClick={() => setDeleting(p)} className="absolute -right-1 -top-1 size-9 bg-surface shadow-card">
                        <TrashIcon size={18} aria-hidden="true" />
                      </IconButton>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <CropDialog
        file={file}
        title={`Add ${PHOTO_SECTIONS.find((s) => s.kind === kind)?.title ?? ""} photo`}
        onCancel={() => setFile(null)}
        onSave={upload}
      />

      <ConfirmDialog
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void remove()}
        busy={busy}
        confirmLabel="Delete Photo"
        description="This photo goes away on both phones"
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

function ExportButton() {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const run = async () => {
    setBusy(true);
    try {
      const tables = [
        "profiles",
        "activities",
        "rewards",
        "transactions",
        "redemptions",
        "wishes",
        "behaviour_levels",
        "face_photos",
        "appeals",
        "special_days",
        "app_settings",
      ] as const;
      const out: Record<string, unknown> = { exported_at: new Date().toISOString(), app: "Nikita's Rewards" };
      for (const t of tables) {
        out[t] = must(await supabase.from(t).select("*"));
      }
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nikitas-rewards-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error(e);
      toast.show(COPY.loadFailed, { action: () => void run() });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button variant="secondary" onClick={() => void run()} busy={busy} busyLabel="Getting it ready…">
      <DownloadSimpleIcon size={20} aria-hidden="true" />
      Export My Data
    </Button>
  );
}
