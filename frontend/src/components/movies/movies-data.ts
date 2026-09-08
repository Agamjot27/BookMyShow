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

export const heroBanners: HeroBanner[] = [
  {
    id: "rbl-bank",
    tagline: "bookmyshow PLAY | RBL BANK",
    title: "₹500 off* on LIVE gigs",
    subtitle: "Unlock exclusive concert discounts with Play Credit Card",
    actionText: "Apply Now",
    accentColor: "#f84464",
    bgGradient: "linear-gradient(135deg, #383a45 0%, #20222a 100%)",
  },
  {
    id: "f1",
    tagline: "FROM THE DIRECTOR OF TOP GUN: MAVERICK",
    title: "F1",
    subtitle: "STARRING BRAD PITT",
    actionText: "Watch Teaser",
    accentColor: "#e50914",
    bgGradient: "linear-gradient(135deg, #2b323c 0%, #171c23 100%)",
  },
  {
    id: "baaghi-4-banner",
    tagline: "SAJID NADIADWALA PRESENTS",
    title: "BAAGHI 4",
    subtitle: "DIRECTED BY A. HARSHA",
    actionText: "Book Tickets",
    accentColor: "#c2384a",
    bgGradient: "linear-gradient(135deg, #253338 0%, #121c1f 100%)",
  },
  {
    id: "demon-slayer-banner",
    tagline: "ANIME PHENOMENON RETURNS",
    title: "DEMON SLAYER",
    subtitle: "INFINITY CASTLE ARC",
    actionText: "Notify Me",
    accentColor: "#ff7336",
    bgGradient: "linear-gradient(135deg, #3d1c10 0%, #1a0b06 100%)",
  },
  {
    id: "fantastic-four-banner",
    tagline: "MARVEL STUDIOS",
    title: "THE FANTASTIC 4",
    subtitle: "FIRST STEPS",
    actionText: "Notify Me",
    accentColor: "#2c8cfb",
    bgGradient: "linear-gradient(135deg, #132a42 0%, #081421 100%)",
  },
  {
    id: "bengal-files-banner",
    tagline: "A CONTROVERSIAL SAGA",
    title: "THE BENGAL FILES",
    subtitle: "IN CINEMAS THIS MARCH",
    actionText: "Explore Shows",
    accentColor: "#e63946",
    bgGradient: "linear-gradient(135deg, #441712 0%, #1a0806 100%)",
  },
];

export const movieCategories = [
  "Trending",
  "Latest",
  "Re-Released",
  "Upcoming",
  "Box-Office Hits",
] as const;

export type MovieCategory = (typeof movieCategories)[number];

export const filterOptions = {
  languages: ["Hindi", "English", "Telugu", "Tamil", "Marathi", "Malayalam", "Kannada"],
  genres: ["Action", "Drama", "Thriller", "Adventure", "Sci-Fi", "Comedy", "Animation", "Horror"],
  formats: ["2D", "3D", "IMAX 2D", "IMAX 3D", "4DX", "ICE"],
};

export const defaultTheatres: Theatre[] = [
  {
    id: "theatre-1",
    name: "Times Square Bharath Cinemas: Udupi",
    location: "Udupi",
    cancellationAllowed: true,
    facilities: ["M-Ticket", "Food & Beverage"],
    showtimes: [
      { id: "s1", time: "11:30 AM", label: "English Subtitles", status: "available", format: "3D" },
      { id: "s2", time: "03:45 PM", label: "ENG", status: "fast-filling", format: "3D" },
      { id: "s3", time: "07:15 PM", label: "English Subtitles", status: "available", format: "3D" },
      { id: "s4", time: "10:30 PM", label: "ENG", status: "available", format: "3D" },
    ],
  },
  {
    id: "theatre-2",
    name: "Cinegalaxy, Central Cinemas: Manipal",
    location: "Manipal",
    cancellationAllowed: false,
    facilities: ["M-Ticket", "Food & Beverage"],
    showtimes: [
      { id: "s5", time: "02:15 PM", label: "ENG", status: "available", format: "3D" },
      { id: "s6", time: "06:00 PM", label: "English Subtitles", status: "fast-filling", format: "3D" },
      { id: "s7", time: "09:30 PM", label: "ENG", status: "available", format: "3D" },
    ],
  },
  {
    id: "theatre-3",
    name: "PVR: Forum Mall, Koramangala",
    location: "Bangalore",
    cancellationAllowed: true,
    facilities: ["M-Ticket", "Food Court", "Recliner"],
    showtimes: [
      { id: "s8", time: "10:00 AM", label: "IMAX 3D", status: "available", format: "IMAX 3D" },
      { id: "s9", time: "01:30 PM", label: "IMAX 3D", status: "fast-filling", format: "IMAX 3D" },
      { id: "s10", time: "05:00 PM", label: "IMAX 3D", status: "fast-filling", format: "IMAX 3D" },
      { id: "s11", time: "08:30 PM", label: "IMAX 3D", status: "available", format: "IMAX 3D" },
    ],
  },
];

export const sampleMovies: Movie[] = [
  {
    id: "spider-man-brand-new-day",
    title: "Spider-Man: Brand New Day",
    studio: "MARVEL STUDIOS",
    badge: {
      type: "promoted",
      text: "PROMOTED",
    },
    rating: {
      score: "8.9/10",
      votes: "354K+ Votes",
    },
    certification: "UA13+",
    duration: "2h 25m",
    releaseDate: "30 Jul, 2026",
    languages: ["English", "Telugu", "Hindi", "Tamil"],
    genres: ["Action", "Adventure", "Sci-Fi"],
    formats: ["2D", "3D", "3D SCREEN X", "4DX", "EPIQ 3D"],
    trailerCount: 8,
    synopsis:
      "Peter Parker faces an unprecedented multiversal chapter as fresh threats emerge in New York City. Striving to reclaim normalcy while upholding his heroic duty, Spider-Man confronts adversaries that test his convictions and resilience to their utmost boundaries.",
    category: "Trending",
    posterColor: "linear-gradient(180deg, #9b1c24 0%, #1e1b2e 70%, #0d0c15 100%)",
    backdropColor: "radial-gradient(ellipse at center, #1b2030 0%, #0c0e14 80%)",
    theatres: defaultTheatres,
  },
  {
    id: "baaghi-4",
    title: "Baaghi 4",
    studio: "NADIADWALA GRANDSON",
    badge: {
      type: "promoted",
      text: "PROMOTED",
    },
    rating: {
      score: "9.2/10",
      votes: "13k Votes",
    },
    certification: "U/A 16+",
    duration: "2h 35m",
    releaseDate: "05 Sep, 2026",
    languages: ["Hindi", "Telugu", "Tamil"],
    genres: ["Action", "Thriller"],
    formats: ["2D", "IMAX 2D"],
    trailerCount: 3,
    synopsis:
      "Ronnie embarks on his most intense mission yet, pushing through lethal criminal cartels with relentless martial arts mastery and breathtaking stunts in a battle where no one is spared.",
    category: "Trending",
    posterColor: "linear-gradient(180deg, #243b4f 0%, #101c27 70%, #090e14 100%)",
    backdropColor: "radial-gradient(ellipse at center, #1e2832 0%, #0d1217 80%)",
    theatres: defaultTheatres,
  },
  {
    id: "demon-slayer",
    title: "Demon Slayer: Kimetsu no Yaiba - Infinity Castle",
    studio: "UFOTABLE",
    badge: {
      type: "bell",
      text: "Interested",
    },
    interest: "121k Interested",
    certification: "U/A 13+",
    duration: "2h 15m",
    releaseDate: "18 Sep, 2026",
    languages: ["Japanese", "Hindi", "English"],
    genres: ["Animation", "Action", "Fantasy"],
    formats: ["2D", "IMAX 2D", "4DX"],
    trailerCount: 4,
    synopsis:
      "Tanjiro and the Demon Slayer Corps infiltrate the shifting, perilous rooms of the Infinity Castle for the final showdown against Muzan Kibutsuji and the remaining Upper Rank demons.",
    category: "Upcoming",
    posterColor: "linear-gradient(180deg, #4d2315 0%, #291209 70%, #150804 100%)",
    backdropColor: "radial-gradient(ellipse at center, #2e1a14 0%, #120906 80%)",
    theatres: defaultTheatres,
  },
  {
    id: "the-bengal-files",
    title: "The Bengal Files",
    studio: "ZEE STUDIOS",
    badge: {
      type: "promoted",
      text: "PROMOTED",
    },
    rating: {
      score: "9.2/10",
      votes: "13k Votes",
    },
    certification: "U/A 16+",
    duration: "2h 40m",
    releaseDate: "12 Sep, 2026",
    languages: ["Hindi", "Bengali"],
    genres: ["Drama", "History", "Thriller"],
    formats: ["2D"],
    trailerCount: 2,
    synopsis:
      "A gripping historical investigative drama unearthing deeply buried truths and socio-political controversies from critical chapters in Bengal's turbulent past.",
    category: "Trending",
    posterColor: "linear-gradient(180deg, #531f18 0%, #2b0f0b 70%, #130604 100%)",
    backdropColor: "radial-gradient(ellipse at center, #2e1512 0%, #110706 80%)",
    theatres: defaultTheatres,
  },
  {
    id: "fantastic-four",
    title: "The Fantastic 4: First Steps",
    studio: "MARVEL STUDIOS",
    badge: {
      type: "bell",
      text: "Interested",
    },
    interest: "121k Interested",
    certification: "U/A 13+",
    duration: "2h 20m",
    releaseDate: "25 Jul, 2026",
    languages: ["English", "Hindi", "Tamil", "Telugu"],
    genres: ["Action", "Adventure", "Sci-Fi"],
    formats: ["2D", "3D", "IMAX 3D"],
    trailerCount: 5,
    synopsis:
      "Set against a vibrant retro-future 1960s backdrop, Marvel's first family must balance family dynamics with defending Earth from an existential cosmic peril.",
    category: "Upcoming",
    posterColor: "linear-gradient(180deg, #18385a 0%, #0c1d30 70%, #050d17 100%)",
    backdropColor: "radial-gradient(ellipse at center, #132438 0%, #070e17 80%)",
    theatres: defaultTheatres,
  },
  {
    id: "vash-level-2",
    title: "Vash Level 2",
    studio: "PANORAMA STUDIOS",
    rating: {
      score: "9.2/10",
      votes: "13k Votes",
    },
    certification: "U/A 16+",
    duration: "2h 10m",
    releaseDate: "14 Aug, 2026",
    languages: ["Gujarati", "Hindi"],
    genres: ["Horror", "Mystery", "Thriller"],
    formats: ["2D"],
    trailerCount: 2,
    synopsis:
      "Dark hypnotic occult forces return to torment an innocent family when unexplainable supernatural possessions unleash escalating psychological dread.",
    category: "Trending",
    posterColor: "linear-gradient(180deg, #2d2b38 0%, #181720 70%, #0c0b11 100%)",
    backdropColor: "radial-gradient(ellipse at center, #1e1d27 0%, #0c0b11 80%)",
    theatres: defaultTheatres,
  },
];
