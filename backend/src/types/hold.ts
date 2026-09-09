export type HoldRecord = {
  hold_token: string; user_id: string; show_id: string; seat_ids: string[]; expires_at: number;
};
export type Hold = {
  hold_token: string; show_id: string; seat_ids: string[]; expires_at: string; server_time: string;
};
