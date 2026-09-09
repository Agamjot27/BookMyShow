export type Category = "All" | "Movies" | "Standup" | "Concerts";

export type HomeEvent = {
  id: string;
  title: string;
  category: Exclude<Category, "All">;
  description: string;
  poster: string | null;
  color: string;
  featured?: boolean;
};

export const categories: Category[] = [
  "All",
  "Movies",
  "Standup",
  "Concerts",
];
