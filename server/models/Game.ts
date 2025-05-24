export type Game = {
  id: string;
  title: string;
  slug: string;
  coverArtUrl: string;
  releaseDate: string; // ISO date
  metaCriticScore: number | null;
};
