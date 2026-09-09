"use client";

import { Armchair, FilmSlate } from "@phosphor-icons/react";
import { sampleOrders, type OrderItem } from "./profile-data";
import styles from "./profile.module.css";

export function OrderHistory({ orders = sampleOrders }: { orders?: OrderItem[] }) {
  return (
    <div className={styles.ordersWrapper}>
      <h1 className={styles.ordersMainHeading}>Your Orders</h1>

      {orders.map((order) => (
        <article key={order.id} className={styles.orderCard}>
          {/* Main Card Body */}
          <div className={styles.orderBody}>
            {/* Poster Thumbnail */}
            <div
              className={styles.orderPoster}
              style={{ "--poster-bg": order.posterColor } as React.CSSProperties}
            >
              <FilmSlate className={styles.orderPosterIcon} />
              <span className={styles.orderPosterTitle}>{order.movieTitle}</span>
            </div>

            {/* Center Info */}
            <div className={styles.orderCenter}>
              <h2 className={styles.orderMovieTitle}>{order.movieTitle}</h2>
              <p className={styles.orderFormat}>{order.format}</p>

              <p className={styles.orderVenueTime}>
                {order.dateTime} — {order.venue}
              </p>

              <p className={styles.orderQuantity}>Quantity: {order.quantity}</p>

              <div className={styles.orderSeatsRow}>
                <Armchair className={styles.couchIcon} weight="fill" />
                <span>{order.seats.join(",")}</span>
              </div>
            </div>

            {/* Right Pricing & Badge */}
            <div className={styles.orderRight}>
              <span className={styles.mTicketBadge}>{order.ticketType}</span>
              <span className={styles.priceBreakdown}>
                Ticket: ₹{order.ticketPrice} + Convenience Fees: ₹{order.convenienceFee}
              </span>
              <span className={styles.totalPrice}>₹{order.totalPrice}</span>
            </div>
          </div>

          {/* Bottom Gray Footer */}
          <div className={styles.orderFooter}>
            <div className={styles.footerCol}>
              <span className={styles.footerLabel}>Booking Date &amp; Time</span>
              <span className={styles.footerValue}>{order.bookingDateTime}</span>
            </div>

            <div className={styles.footerCol}>
              <span className={styles.footerLabel}>Payment Method</span>
              <span className={styles.footerValue}>{order.paymentMethod}</span>
            </div>

            <div className={styles.footerCol}>
              <span className={styles.footerLabel}>Booking ID</span>
              <span className={styles.footerValue}>{order.bookingId}</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
