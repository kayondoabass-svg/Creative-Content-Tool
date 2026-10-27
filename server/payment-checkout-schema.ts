import { pool } from "./db";

// Additive, repeatable migration shared by development and the prebuilt VPS.
// Never replaces the existing payments or subscription history.
export async function initializePaymentCheckoutSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_checkouts (
      order_id text PRIMARY KEY,
      payment_id integer NOT NULL UNIQUE REFERENCES payments(id),
      user_id varchar NOT NULL REFERENCES users(id),
      attempt_id uuid NOT NULL,
      checkout_url text,
      creation_state text NOT NULL DEFAULT 'initializing',
      last_checked_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(user_id,attempt_id)
    );
    CREATE INDEX IF NOT EXISTS payment_checkouts_user ON payment_checkouts(user_id,created_at);
    CREATE TABLE IF NOT EXISTS payment_activations (
      payment_id integer PRIMARY KEY REFERENCES payments(id),
      activated_at timestamptz NOT NULL DEFAULT now(),
      ends_at timestamptz NOT NULL
    );
  `);
}
