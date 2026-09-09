export interface UserProfile {
  name: string;
  mobile: string;
  email: string;
  firstName?: string;
  lastName?: string;
  birthday?: string;
  identity?: "Woman" | "Man" | "";
}

export interface OrderItem {
  id: string;
  bookingId: string;
  movieTitle: string;
  format: string;
  posterColor: string;
  dateTime: string;
  venue: string;
  quantity: number;
  seats: string[];
  ticketType: string;
  ticketPrice: string;
  convenienceFee: string;
  totalPrice: string;
  bookingDateTime: string;
  paymentMethod: string;
}

export const initialUserProfile: UserProfile = {
  name: "Guest",
  mobile: "",
  email: "guest@example.com",
  firstName: "",
  lastName: "",
  birthday: "",
  identity: "",
};

export const sampleOrders: OrderItem[] = [
  {
    id: "order-1",
    bookingId: "TCAKJAB",
    movieTitle: "Sinners",
    format: "2D",
    posterColor: "linear-gradient(180deg, #7c2d12 0%, #351508 70%, #150602 100%)",
    dateTime: "Tue, 29 Apr 2025 | 9:45 PM",
    venue: "PVR: Mani Square Mall, Kolkata",
    quantity: 5,
    seats: ["PE-P9", "P10", "P11", "P12", "P13"],
    ticketType: "M-Ticket",
    ticketPrice: "495.00",
    convenienceFee: "112.10",
    totalPrice: "607.10",
    bookingDateTime: "Apr 29 2025 07:46PM",
    paymentMethod: "Credit/Debit Card",
  },
  {
    id: "order-2",
    bookingId: "XYCKAJS",
    movieTitle: "Kesari Chapter 2: The Untold Story of Jallianwala Bagh",
    format: "2D",
    posterColor: "linear-gradient(180deg, #27272a 0%, #18181b 70%, #09090b 100%)",
    dateTime: "Sat, 26 Apr 2025 | 2:45 PM",
    venue: "Miraj Cinemas: Newtown, Kolkata",
    quantity: 3,
    seats: ["PE-P9", "P10", "P11", "P12", "P13"],
    ticketType: "M-Ticket",
    ticketPrice: "495.00",
    convenienceFee: "112.10",
    totalPrice: "607.10",
    bookingDateTime: "Apr 25 2025 04:00PM",
    paymentMethod: "Credit/Debit Card",
  },
];
