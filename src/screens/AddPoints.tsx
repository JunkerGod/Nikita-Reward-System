import { useRef, useState, type FormEvent } from "react";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { useData } from "../lib/data";
import { supabase } from "../lib/supabase";
import { must, useSave, useUnsavedWarning } from "../lib/save";
import { useConfetti } from "../confetti/Confetti";
import { useToast } from "../components/Toasts";
import { useRouter } from "../lib/router";
import { earnMessage } from "../lib/copy";
import { NamedIcon } from "../lib/icons";
import { Button, Counter, EmptyState, LoadingScreen, PageTitle, Skeleton, ButtonLink } from "../components/ui";
import type { Activity, Category } from "../lib/types";

const GROUPS: { id: Category; title: string }[] = [
  { id: "small", title: "Small wins" },
  { id: "medium", title: "Medium" },
  { id: "big", title: "BIG ones" },
];

interface AddResult {
  id: string;
  bonus_id: string | null;
  bonus_points: number;
  streak: number;
}

const NOTE_MAX = 200;
const LABEL_MAX = 60;

export function AddPoints() {
  const { status, activities, refresh } = useData();
  const [selected, setSelected] = useState<string | "custom" | null>(null);
  const [label, setLabel] = useState("");
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ pick?: string; label?: string; points?: string }>({});
  const [busy, setBusy] = useState(false);
  const save = useSave();
  const play = useConfetti();
  const toast = useToast();
  const { navigate } = useRouter();
  const { photosOf } = useData();
  const labelRef = useRef<HTMLInputElement>(null);
  const pointsRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<HTMLDivElement>(null);

  useUnsavedWarning(!busy && (note.trim() !== "" || label.trim() !== "" || points !== ""));

  const activity = activities.find((a) => a.id === selected) ?? null;
  const customPoints = Number(points);
  const amount = selected === "custom" ? (Number.isInteger(customPoints) ? customPoints : 0) : activity?.points ?? 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!selected) next.pick = "Pick one first";
    if (selected === "custom") {
      if (!label.trim()) next.label = "Type what it was for";
      else if (label.trim().length > LABEL_MAX) next.label = `Max ${LABEL_MAX} characters`;
      if (!/^\d+$/.test(points.trim()) || customPoints < 1 || customPoints > 500) next.points = "Whole number from 1 to 500";
    }
    setErrors(next);
    if (next.pick) return pickRef.current?.focus();
    if (next.label) return labelRef.current?.focus();
    if (next.points) return pointsRef.current?.focus();
    if (note.length > NOTE_MAX) return;

    const entry = {
      points: amount,
      label: selected === "custom" ? label.trim() : activity!.name,
      note: note.trim() || null,
    };
    setBusy(true);
    await save(
      async () =>
        must(await supabase.rpc("add_points", { p_label: entry.label, p_points: entry.points, p_note: entry.note })) as AddResult,
      (res) => {
        play({
          images: photosOf("nikita_happy").map((p) => p.url!),
          shape: "heart",
          count: entry.points >= 50 ? 60 : 30 + Math.floor(Math.random() * 11),
          secondWave: entry.points >= 50 || res.bonus_points > 0,
          message: earnMessage(entry.points),
        });
        const ids = [res.id, res.bonus_id].filter((x): x is string => !!x);
        toast.show(res.bonus_points > 0 ? `Added +${entry.points}, ${res.streak} day streak +${res.bonus_points}` : `Added +${entry.points}`, {
          actionLabel: "Undo",
          duration: 6000,
          action: () =>
            void save(
              async () => must(await supabase.from("transactions").delete().in("id", ids)),
              () => {
                toast.show("Oki undone");
                void refresh("stats", "recent", "streak");
              },
            ),
        });
        void refresh("stats", "recent", "streak");
        navigate("/");
      },
    );
    setBusy(false);
  };

  if (status === "loading") {
    return (
      <>
        <PageTitle>Add Points</PageTitle>
        <LoadingScreen>
          <Skeleton className="h-5 w-24" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="mt-6 h-24" />
        </LoadingScreen>
      </>
    );
  }

  const tile = (a: Activity | "custom") => {
    const id = a === "custom" ? "custom" : a.id;
    const isOn = selected === id;
    return (
      <li key={id}>
        <button
          type="button"
          aria-pressed={isOn}
          onClick={() => {
            setSelected(id);
            setErrors({});
            if (id === "custom") window.setTimeout(() => labelRef.current?.focus(), 50);
          }}
          className={`press flex h-full min-h-24 w-full flex-col items-start gap-1 rounded-2xl p-3 text-left transition-colors duration-150 ${
            isOn ? "bg-soft ring-3 ring-btn" : "bg-surface shadow-card hover:bg-[#fffafc]"
          }`}
        >
          <span className="flex w-full items-center justify-between gap-2">
            <span className={`flex size-9 items-center justify-center rounded-full ${isOn ? "bg-surface" : "bg-soft"} text-btn`}>
              {a === "custom" ? <PencilSimpleIcon size={20} aria-hidden="true" /> : <NamedIcon name={a.icon} size={20} />}
            </span>
            {a !== "custom" ? <span className="text-lg font-black text-btn tabular-nums">+{a.points}</span> : null}
          </span>
          <span className="text-[15px] font-extrabold leading-snug text-ink break-words">{a === "custom" ? "Custom" : a.name}</span>
        </button>
      </li>
    );
  };

  return (
    <>
      <PageTitle sub="Tap what she did">Add Points</PageTitle>
      <form onSubmit={submit} noValidate>
        <div ref={pickRef} tabIndex={-1} className="rounded-2xl" aria-describedby={errors.pick ? "pick-error" : undefined}>
          {activities.length === 0 ? (
            <EmptyState icon={<PencilSimpleIcon size={28} aria-hidden="true" />} message="No activities yet">
              <ButtonLink href="/settings" variant="secondary" size="sm">
                Add Activities
              </ButtonLink>
            </EmptyState>
          ) : null}
          {GROUPS.map((g) => {
            const items = activities.filter((a) => a.category === g.id);
            if (!items.length) return null;
            return (
              <section key={g.id} aria-labelledby={`group-${g.id}`} className="mb-6">
                <h2 id={`group-${g.id}`} className="mb-2 text-base font-black text-ink">
                  {g.title}
                </h2>
                <ul className="grid grid-cols-2 gap-3">{items.map(tile)}</ul>
              </section>
            );
          })}
          <section aria-labelledby="group-custom" className="mb-6">
            <h2 id="group-custom" className="mb-2 text-base font-black text-ink">
              Something else
            </h2>
            <ul className="grid grid-cols-2 gap-3">{tile("custom")}</ul>
          </section>
          {errors.pick ? (
            <p id="pick-error" role="alert" className="-mt-3 mb-4 text-sm font-bold text-btn">
              {errors.pick}
            </p>
          ) : null}
        </div>

        {selected === "custom" ? (
          <div className="mb-5 grid grid-cols-[1fr_7rem] gap-3 rounded-2xl bg-surface p-4 shadow-card">
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <label htmlFor="custom-label" className="text-sm font-extrabold text-ink">
                  What for
                </label>
                <Counter value={label} max={LABEL_MAX} />
              </div>
              <input
                ref={labelRef}
                id="custom-label"
                name="label"
                type="text"
                autoComplete="off"
                maxLength={LABEL_MAX}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="cleaned her room…"
                aria-invalid={errors.label ? true : undefined}
                aria-describedby={errors.label ? "label-error" : undefined}
                className="field"
              />
              {errors.label ? (
                <p id="label-error" className="text-sm font-bold text-btn">
                  {errors.label}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="custom-points" className="text-sm font-extrabold text-ink">
                Points
              </label>
              <input
                ref={pointsRef}
                id="custom-points"
                name="points"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min={1}
                max={500}
                step={1}
                autoComplete="off"
                value={points}
                onChange={(e) => setPoints(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="15…"
                aria-invalid={errors.points ? true : undefined}
                aria-describedby={errors.points ? "points-error" : "points-help"}
                className="field tabular-nums"
              />
              <p id={errors.points ? "points-error" : "points-help"} className={`text-xs font-bold ${errors.points ? "text-btn" : "text-muted"}`}>
                {errors.points ?? "1 to 500"}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mb-5 flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <label htmlFor="note" className="text-sm font-extrabold text-ink">
              Note (optional)
            </label>
            <Counter value={note} max={NOTE_MAX} />
          </div>
          <textarea
            id="note"
            name="note"
            autoComplete="off"
            rows={2}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="got 92% on the maths test…"
            className="field"
          />
        </div>

        <div className="sticky z-10 -mx-1 rounded-full bg-page/80 p-1 backdrop-blur-sm" style={{ bottom: "calc(env(safe-area-inset-bottom) + 84px)" }}>
          <Button type="submit" size="lg" busy={busy} className="w-full">
            {amount > 0 ? `Add ${amount} Points` : "Add Points"}
          </Button>
        </div>
      </form>
    </>
  );
}
