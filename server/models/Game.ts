export type Game = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  coverArtUrl: string;
  releaseDate: string; // ISO date
  metaCriticScore: number | null;
  contentCriticScore: number | null;
};
