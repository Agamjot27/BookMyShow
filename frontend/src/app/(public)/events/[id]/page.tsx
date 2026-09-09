import { MovieDetailPage } from "@/components/movies/movie-detail-page";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MovieDetailPage id={id} location="" />;
}
