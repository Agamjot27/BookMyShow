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

export const homeEvents: HomeEvent[] = [
  {
    id: "demo-midnight",
    title: "The Midnight Express",
    category: "Movies",
    description: "Thriller · Hindi",
    poster: null, // Add a local poster URL when artwork is available.
    color: "#283e45",
    featured: true,
  },
  {
    id: "demo-last-light",
    title: "The Last Light",
    category: "Movies",
    description: "Drama · English",
    poster: null, // Add a local poster URL when artwork is available.
    color: "#704136",
    featured: true,
  },
  {
    id: "demo-comedy",
    title: "An Evening of Almost",
    category: "Standup",
    description: "Comedy · Hindi, English",
    poster: null, // Add a local poster URL when artwork is available.
    color: "#77512c",
    featured: true,
  },
  {
    id: "demo-live",
    title: "After Hours Live",
    category: "Concerts",
    description: "Live music · English",
    poster: null, // Add a local poster URL when artwork is available.
    color: "#393b66",
    featured: true,
  },
  {
    id: "demo-home",
    title: "A Long Way Home",
    category: "Movies",
    description: "Adventure · Hindi",
    poster: null, // Add a local poster URL when artwork is available.
    color: "#46624b",
    featured: true,
  },
  {
    id: "demo-unfiltered",
    title: "Completely Unfiltered",
    category: "Standup",
    description: "Comedy · English",
    poster: null, // Add a local poster URL when artwork is available.
    color: "#703d51",
  },
  {
    id: "demo-acoustic",
    title: "The Acoustic Room",
    category: "Concerts",
    description: "Acoustic · Hindi",
    poster: null, // Add a local poster URL when artwork is available.
    color: "#5e4936",
    featured: true,
  },
  {
    id: "demo-orbit",
    title: "Beyond the Orbit",
    category: "Movies",
    description: "Science fiction · English",
    poster: null, // Add a local poster URL when artwork is available.
    color: "#304960",
  },
];