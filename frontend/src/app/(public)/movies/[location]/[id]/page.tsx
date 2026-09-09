import { MovieDetailPage } from "@/components/movies/movie-detail-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ location: string; id: string }>;
}) {
  const { id, location } = await params;
  return {
    title: `${id} in ${location} - Movie Tickets, Reviews & Showtimes | BookMyShow`,
    description: "Check showtimes, book tickets online, view cast and reviews.",
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ location: string; id: string }>;
}) {
  const { id, location } = await params;
  return <MovieDetailPage id={id} location={location} />;
}
