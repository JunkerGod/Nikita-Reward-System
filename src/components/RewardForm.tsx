import { useRef, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { must, useSave, useUnsavedWarning } from "../lib/save";
import { ICON_LABELS, NamedIcon, REWARD_ICONS } from "../lib/icons";
import { Button, Counter } from "./ui";
import { RewardCard } from "./RewardCard";
import type { Reward } from "../lib/types";

const NAME_MAX = 40;
const DESC_MAX = 100;

export interface RewardFormValues {
  name: string;
  price: string;
  description: string;
  icon: string;
  active: boolean;
}

/** Jagath's add/edit reward form, with a live preview of the card. */
export function RewardForm({
  initial,
  editing,
  onSaved,
  formId,
}: {
  initial: RewardFormValues;
  editing: Reward | null;
  onSaved: (reward: Reward) => void;
  formId: string;
}) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<{ name?: string; price?: string; description?: string }>({});
  const [busy, setBusy] = useState(false);
  const save = useSave();
  const nameRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  useUnsavedWarning(!busy && JSON.stringify(v) !== JSON.stringify(initial));
  const set = <K extends keyof RewardFormValues>(k: K, val: RewardFormValues[K]) => setV((s) => ({ ...s, [k]: val }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = v.name.trim();
    const price = Number(v.price);
    const next: typeof errors = {};
    if (!name) next.name = "Give it a name";
    else if (name.length > NAME_MAX) next.name = `Max ${NAME_MAX} characters`;
    if (!/^\d+$/.test(v.price.trim()) || price < 1 || price > 10000) next.price = "Whole number from 1 to 10,000";
    if (v.description.trim().length > DESC_MAX) next.description = `Max ${DESC_MAX} characters`;
    setErrors(next);
    if (next.name) return nameRef.current?.focus();
    if (next.price) return priceRef.current?.focus();
    if (next.description) return descRef.current?.focus();

    const row = { name, price, description: v.description.trim() || null, icon: v.icon, active: v.active };
    setBusy(true);
    await save(async () => {
      const res = editing
        ? await supabase.from("rewards").update(row).eq("id", editing.id).select().single()
        : await supabase.from("rewards").insert(row).select().single();
      return must(res) as Reward;
    }, onSaved);
    setBusy(false);
  };

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div aria-live="polite">
        <p className="mb-2 text-sm font-extrabold text-muted">Preview</p>
        <RewardCard
          preview
          headingLevel="h3"
          reward={{
            name: v.name.trim(),
            icon: v.icon,
            price: Number(v.price) || 0,
            description: v.description.trim() || null,
            created_at: editing?.created_at ?? new Date().toISOString(),
            active: v.active,
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor={`${formId}-name`} className="text-sm font-extrabold text-ink">
            Name
          </label>
          <Counter value={v.name} max={NAME_MAX} />
        </div>
        <input
          ref={nameRef}
          id={`${formId}-name`}
          name="name"
          type="text"
          autoComplete="off"
          maxLength={NAME_MAX}
          required
          value={v.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Movie night…"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${formId}-name-error` : undefined}
          className="field"
        />
        {errors.name ? (
          <p id={`${formId}-name-error`} className="text-sm font-bold text-btn">
            {errors.name}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${formId}-price`} className="text-sm font-extrabold text-ink">
          Price in points
        </label>
        <input
          ref={priceRef}
          id={`${formId}-price`}
          name="price"
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          min={1}
          max={10000}
          step={1}
          required
          autoComplete="off"
          value={v.price}
          onChange={(e) => set("price", e.target.value.replace(/[^\d]/g, ""))}
          placeholder="100…"
          aria-invalid={errors.price ? true : undefined}
          aria-describedby={`${formId}-price-help`}
          className="field tabular-nums"
        />
        <p id={`${formId}-price-help`} className={`text-xs font-bold ${errors.price ? "text-btn" : "text-muted"}`}>
          {errors.price ?? "Whole number, 1 to 10,000"}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor={`${formId}-desc`} className="text-sm font-extrabold text-ink">
            Short description (optional)
          </label>
          <Counter value={v.description} max={DESC_MAX} />
        </div>
        <textarea
          ref={descRef}
          id={`${formId}-desc`}
          name="description"
          autoComplete="off"
          rows={2}
          maxLength={DESC_MAX}
          value={v.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="U pick the film…"
          aria-invalid={errors.description ? true : undefined}
          className="field"
        />
        {errors.description ? <p className="text-sm font-bold text-btn">{errors.description}</p> : null}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-extrabold text-ink">Icon</legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {REWARD_ICONS.map((name) => {
            const checked = v.icon === name;
            return (
              <label
                key={name}
                className={`press flex aspect-square cursor-pointer items-center justify-center rounded-2xl transition-colors duration-150 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-btn ${
                  checked ? "bg-soft text-btn ring-3 ring-btn" : "bg-surface text-muted ring-2 ring-soft hover:text-btn"
                }`}
              >
                <input type="radio" name="icon" value={name} checked={checked} onChange={() => set("icon", name)} className="sr-only" />
                <NamedIcon name={name} size={26} />
                <span className="sr-only">{ICON_LABELS[name]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 ring-2 ring-soft">
        <span className="text-base font-extrabold text-ink">Show in shop</span>
        <input
          type="checkbox"
          role="switch"
          name="active"
          checked={v.active}
          onChange={(e) => set("active", e.target.checked)}
          className="switch"
        />
      </label>

      <Button type="submit" size="lg" busy={busy} className="w-full">
        {editing ? "Save Reward" : "Add Reward"}
      </Button>
    </form>
  );
}
