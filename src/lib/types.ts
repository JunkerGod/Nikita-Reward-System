export type Role = "jagath" | "nikita";
export type LevelId = "good_boy" | "ok_boy" | "thin_ice" | "bad_boy";
export type PhotoKind = "nikita_happy" | "nikita_sad" | "jagath";
export type Category = "small" | "medium" | "big";

export interface Profile {
  id: string;
  name: string;
  role: Role;
  goal_reward_id: string | null;
}

export interface Activity {
  id: string;
  name: string;
  icon: string;
  points: number;
  category: Category;
  created_at: string;
}

export interface Reward {
  id: string;
  name: string;
  icon: string;
  price: number;
  description: string | null;
  active: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  type: "earn" | "spend";
  points: number;
  label: string;
  note: string | null;
  added_by: string;
  created_at: string;
  reward_id: string | null;
}

export interface Redemption {
  id: string;
  reward_id: string | null;
  transaction_id: string;
  redeemed_at: string;
  status: "claimed" | "delivered";
  delivered_at: string | null;
  transaction: Pick<Transaction, "label" | "points"> | null;
}

export interface Wish {
  id: string;
  text: string;
  created_by: string;
  created_at: string;
  status: "new" | "added" | "dismissed";
}

export interface BehaviourLevel {
  id: string;
  level: LevelId;
  note: string | null;
  set_by: string;
  created_at: string;
}

export interface FacePhoto {
  id: string;
  storage_path: string;
  kind: PhotoKind;
  uploaded_by: string;
  created_at: string;
  url: string | null;
}

export interface Stats {
  balance: number;
  total_earned: number;
  total_spent: number;
  week_earned: number;
}

export interface Seen {
  user_id: string;
  last_seen_transaction_at: string | null;
  last_seen_behaviour_at: string | null;
}
