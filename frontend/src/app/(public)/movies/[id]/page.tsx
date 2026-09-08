import { MovieDetailPage } from "@/components/movies/movie-detail-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title: `${id} - Movie Tickets, Reviews & Showtimes | BookMyShow`,
    description: "Check showtimes, book tickets online, view cast and reviews.",
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MovieDetailPage id={id} />;
}
