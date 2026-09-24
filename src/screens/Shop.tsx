import { useMemo, useState } from "react";
import {
  EyeIcon,
  EyeSlashIcon,
  GiftIcon,
  PencilSimpleIcon,
  PlusCircleIcon,
  PushPinIcon,
  SparkleIcon,
  TrashIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useData } from "../lib/data";
import { supabase } from "../lib/supabase";
import { must, useSave } from "../lib/save";
import { useHref, useRouter } from "../lib/router";
import { useConfetti } from "../confetti/Confetti";
import { useToast } from "../components/Toasts";
import { COPY } from "../lib/copy";
import { fmtNumber, fmtPoints } from "../lib/format";
import { Button, Counter, EmptyState, IconButton, LoadingScreen, PageTitle, Skeleton } from "../components/ui";
import { ConfirmDialog, Sheet } from "../components/Sheet";
import { RewardCard } from "../components/RewardCard";
import { RewardForm, type RewardFormValues } from "../components/RewardForm";
import type { Reward, Wish } from "../lib/types";

type Sort = "price-asc" | "price-desc" | "newest";
const SORTS: { id: Sort; label: string }[] = [
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "newest", label: "Newest" },
];

const WISH_MAX = 100;

export function Shop() {
  const data = useData();
  const { status, rewards, isNikita, isJagath, stats, nikita, wishes, refresh, photosOf } = data;
  const { search, navigate } = useRouter();
  const href = useHref();
  const save = useSave();
  const toast = useToast();
  const play = useConfetti();

  const sort = (SORTS.find((s) => s.id === search.get("sort"))?.id ?? "price-asc") as Sort;
  const sheet = search.get("sheet");
  const editId = search.get("id");
  const wishId = search.get("wish");

  const [redeeming, setRedeeming] = useState<Reward | null>(null);
  const [deleting, setDeleting] = useState<Reward | null>(null);
  const [busy, setBusy] = useState(false);
  const [wishText, setWishText] = useState("");
  const [wishError, setWishError] = useState<string | null>(null);

  const balance = stats?.balance ?? 0;
  const goalId = nikita?.goal_reward_id ?? null;

  const sorted = useMemo(() => {
    const list = rewards.filter((r) => r.active || isJagath);
    const by = {
      "price-asc": (a: Reward, b: Reward) => a.price - b.price || b.created_at.localeCompare(a.created_at),
      "price-desc": (a: Reward, b: Reward) => b.price - a.price || b.created_at.localeCompare(a.created_at),
      newest: (a: Reward, b: Reward) => b.created_at.localeCompare(a.created_at),
    }[sort];
    return [...list].sort((a, b) => Number(b.active) - Number(a.active) || by(a, b));
  }, [rewards, isJagath, sort]);

  const newWishes = wishes.filter((w) => w.status === "new");
  const closeSheet = () => navigate(href({ sheet: null, id: null, wish: null }), { replace: true });

  const editing = sheet === "edit" ? rewards.find((r) => r.id === editId) ?? null : null;
  const fromWish = sheet === "new" && wishId ? wishes.find((w) => w.id === wishId) ?? null : null;
  const formInitial: RewardFormValues = editing
    ? {
        name: editing.name,
        price: String(editing.price),
        description: editing.description ?? "",
        icon: editing.icon,
        active: editing.active,
      }
    : { name: fromWish?.text.slice(0, 40) ?? "", price: "", description: "", icon: "gift", active: true };

  const redeem = async () => {
    if (!redeeming) return;
    const reward = redeeming;
    setBusy(true);
    await save(
      async () => must(await supabase.rpc("redeem_reward", { p_reward_id: reward.id })),
      () => {
        setRedeeming(null);
        play({
          images: photosOf("nikita_happy").map((p) => p.url!),
          shape: "heart",
          count: 40,
          secondWave: true,
          burst: true,
          message: COPY.redeemed,
        });
        void refresh("stats", "recent", "redemptions");
      },
    );
    setBusy(false);
  };

  const toggleGoal = (r: Reward) =>
    save(
      async () => must(await supabase.rpc("set_goal", { p_reward_id: goalId === r.id ? null : r.id })),
      () => void refresh("profiles"),
    );

  const toggleHidden = (r: Reward) =>
    save(
      async () => must(await supabase.from("rewards").update({ active: !r.active }).eq("id", r.id)),
      () => {
        toast.show(r.active ? "Oki hidden" : "Oki its back");
        void refresh("rewards");
      },
    );

  const remove = async () => {
    if (!deleting) return;
    const r = deleting;
    setBusy(true);
    await save(
      async () => must(await supabase.from("rewards").delete().eq("id", r.id)),
      () => {
        setDeleting(null);
        void refresh("rewards", "profiles");
      },
    );
    setBusy(false);
  };

  const sendWish = async () => {
    const text = wishText.trim();
    if (!text) return setWishError("Type ur wish first");
    if (text.length > WISH_MAX) return setWishError(`Max ${WISH_MAX} characters`);
    setWishError(null);
    setBusy(true);
    await save(
      async () => must(await supabase.from("wishes").insert({ text })),
      () => {
        setWishText("");
        closeSheet();
        toast.show(COPY.wishSent);
        void refresh("wishes");
      },
    );
    setBusy(false);
  };

  const dismissWish = (w: Wish) =>
    save(
      async () => must(await supabase.from("wishes").update({ status: "dismissed" }).eq("id", w.id)),
      () => void refresh("wishes"),
    );

  return (
    <>
      <PageTitle sub={isNikita ? `U have ${fmtPoints(balance)}` : `Nikita has ${fmtPoints(balance)}`}>Reward Shop</PageTitle>

      <div className="mb-5 flex flex-wrap items-end gap-3">
        {isJagath ? (
          <Button onClick={() => navigate(href({ sheet: "new", id: null, wish: null }))}>
            <PlusCircleIcon size={20} aria-hidden="true" />
            Add Reward
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => navigate(href({ sheet: "wish" }))}>
            <SparkleIcon size={20} aria-hidden="true" />
            Wish for Something
          </Button>
        )}
        <div className="ml-auto flex flex-col gap-1">
          <label htmlFor="sort" className="text-xs font-extrabold text-muted">
            Sort
          </label>
          <select
            id="sort"
            name="sort"
            value={sort}
            onChange={(e) => navigate(href({ sort: e.target.value === "price-asc" ? null : e.target.value }), { replace: true })}
            className="field min-h-11 w-auto bg-surface py-2 pr-8 text-sm text-ink"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isJagath && newWishes.length > 0 ? (
        <section aria-labelledby="wishes" className="mb-6 rounded-2xl bg-soft p-4">
          <h2 id="wishes" className="mb-3 flex items-center gap-2 text-lg font-black text-ink">
            <SparkleIcon size={20} aria-hidden="true" />
            Wishes
          </h2>
          <ul className="flex flex-col gap-2">
            {newWishes.map((w) => (
              <li key={w.id} className="flex items-center gap-2 rounded-2xl bg-surface p-3">
                <p className="min-w-0 flex-1 font-bold text-ink break-words">{w.text}</p>
                <Button size="sm" onClick={() => navigate(href({ sheet: "new", wish: w.id, id: null }))}>
                  Add to Shop
                </Button>
                <IconButton label={`Dismiss wish: ${w.text}`} onClick={() => void dismissWish(w)}>
                  <XCircleIcon size={20} aria-hidden="true" />
                </IconButton>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {status === "loading" ? (
        <LoadingScreen>
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-36" />
            ))}
          </div>
        </LoadingScreen>
      ) : sorted.length === 0 ? (
        <EmptyState icon={<GiftIcon size={28} aria-hidden="true" />} message={isNikita ? COPY.emptyShop : "No rewards yet"}>
          {isJagath ? <p className="text-sm font-semibold text-muted">Tap Add Reward to stock the shop</p> : null}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((r) => {
            const short = r.price - balance;
            const isGoal = goalId === r.id;
            return (
              <li key={r.id}>
                <RewardCard
                  headingLevel="h2"
                  reward={r}
                  status={
                    isGoal ? (
                      <p className="flex items-center gap-1.5 text-sm font-extrabold text-btn">
                        <PushPinIcon size={16} aria-hidden="true" />
                        {isNikita ? "Ur saving for this" : "She’s saving for this"}
                      </p>
                    ) : null
                  }
                  actions={
                    isNikita ? (
                      <>
                        <Button size="sm" disabled={short > 0} onClick={() => setRedeemingSafe(r)} aria-describedby={short > 0 ? `short-${r.id}` : undefined}>
                          <GiftIcon size={18} aria-hidden="true" />
                          Redeem
                        </Button>
                        <Button size="sm" variant="secondary" aria-pressed={isGoal} onClick={() => void toggleGoal(r)}>
                          <PushPinIcon size={18} aria-hidden="true" />
                          {isGoal ? "Saving for This" : "Save for This"}
                        </Button>
                        {short > 0 ? (
                          <p id={`short-${r.id}`} className="w-full text-sm font-extrabold text-muted">
                            {COPY.notEnough(short)}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => navigate(href({ sheet: "edit", id: r.id, wish: null }))}>
                          <PencilSimpleIcon size={18} aria-hidden="true" />
                          Edit
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => void toggleHidden(r)}>
                          {r.active ? <EyeSlashIcon size={18} aria-hidden="true" /> : <EyeIcon size={18} aria-hidden="true" />}
                          {r.active ? "Hide" : "Show"}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleting(r)}>
                          <TrashIcon size={18} aria-hidden="true" />
                          Delete
                        </Button>
                        {r.active && short > 0 ? (
                          <p className="w-full text-sm font-bold text-muted">She needs {fmtNumber(short)} more</p>
                        ) : null}
                      </>
                    )
                  }
                />
              </li>
            );
          })}
        </ul>
      )}

      {/* Add / edit reward (Jagath) */}
      <Sheet
        open={isJagath && (sheet === "new" || (sheet === "edit" && !!editing))}
        onClose={closeSheet}
        title={editing ? "Edit Reward" : "Add Reward"}
        description={fromWish ? <>Nikita wished for: &ldquo;{fromWish.text}&rdquo;</> : undefined}
      >
        <RewardForm
          key={`${sheet}-${editId ?? ""}-${wishId ?? ""}`}
          formId="reward-form"
          initial={formInitial}
          editing={editing}
          onSaved={async () => {
            if (fromWish) {
              await supabase.from("wishes").update({ status: "added" }).eq("id", fromWish.id);
            }
            closeSheet();
            toast.show(editing ? "Oki saved" : "Oki its in the shop");
            void refresh("rewards", "wishes");
          }}
        />
      </Sheet>

      {/* Wish (Nikita) */}
      <Sheet
        open={isNikita && sheet === "wish"}
        onClose={closeSheet}
        title="Wish for Something"
        description="He’ll see it and pick a price"
        footer={
          <Button onClick={() => void sendWish()} busy={busy} busyLabel="Sending…">
            Send Wish
          </Button>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendWish();
          }}
          className="flex flex-col gap-2"
        >
          <div className="flex items-baseline justify-between">
            <label htmlFor="wish" className="text-sm font-extrabold text-ink">
              Ur wish
            </label>
            <Counter value={wishText} max={WISH_MAX} />
          </div>
          <input
            id="wish"
            name="wish"
            type="text"
            autoComplete="off"
            maxLength={WISH_MAX}
            value={wishText}
            onChange={(e) => setWishText(e.target.value)}
            placeholder="a picnic at the beach…"
            aria-invalid={wishError ? true : undefined}
            aria-describedby={wishError ? "wish-error" : undefined}
            className="field"
          />
          {wishError ? (
            <p id="wish-error" className="text-sm font-bold text-btn">
              {wishError}
            </p>
          ) : null}
        </form>
      </Sheet>

      {/* Redeem confirmation */}
      <Sheet
        open={!!redeeming}
        onClose={() => setRedeeming(null)}
        variant="center"
        title={COPY.redeemConfirm}
        description={
          redeeming ? (
            <>
              <span className="block font-extrabold text-ink break-words">{redeeming.name}</span>
              <span className="block">
                {fmtPoints(redeeming.price)}, u&rsquo;ll have {fmtPoints(balance - redeeming.price)} left
              </span>
            </>
          ) : null
        }
        closeLabel="Cancel"
        footer={
          <>
            <Button onClick={() => void redeem()} busy={busy} busyLabel="Redeeming…">
              <GiftIcon size={20} aria-hidden="true" />
              Redeem
            </Button>
            <Button variant="ghost" onClick={() => setRedeeming(null)}>
              Cancel
            </Button>
          </>
        }
      />

      <ConfirmDialog
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void remove()}
        busy={busy}
        description={deleting ? <>&ldquo;{deleting.name}&rdquo; goes for good, past redemptions stay the same</> : null}
        confirmLabel="Delete Reward"
      />
    </>
  );

  function setRedeemingSafe(r: Reward) {
    if (r.price <= balance) setRedeeming(r);
  }
}
