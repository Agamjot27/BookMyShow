export interface HeroBanner {
  id: string;
  tagline?: string;
  title: string;
  subtitle?: string;
  actionText?: string;
  accentColor: string;
  bgGradient: string;
}

export interface Showtime {
  id: string;
  time: string;
  label?: string;
  status: "available" | "fast-filling";
  format?: string;
}

export interface Theatre {
  id: string;
  name: string;
  location: string;
  cancellationAllowed: boolean;
  facilities: string[];
  showtimes: Showtime[];
}

export interface Movie {
  id: string;
  title: string;
  studio?: string;
  badge?: {
    type: "promoted" | "bell";
    text?: string;
  };
  rating?: {
    score: string;
    votes: string;
  };
  interest?: string;
  certification: string;
  duration?: string;
  releaseDate?: string;
  languages?: string[];
  genres?: string[];
  formats?: string[];
  trailerCount?: number;
  synopsis?: string;
  category: "Trending" | "Latest" | "Re-Released" | "Upcoming" | "Box-Office Hits";
  posterColor: string;
  backdropColor?: string;
  theatres?: Theatre[];
}
