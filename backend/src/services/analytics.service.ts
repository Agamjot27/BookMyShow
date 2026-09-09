import * as repository from "../../db/repositories/analytics.repository.js";

export async function getDashboard() {
  const [summary, occupancy, revenueByEvent, recentBookings] = await Promise.all([
    repository.getSummary(),
    repository.getShowOccupancy(20),
    repository.getRevenueByEvent(10),
    repository.getRecentBookings(10),
  ]);
  return { summary, occupancy, revenue_by_event: revenueByEvent, recent_bookings: recentBookings };
}
