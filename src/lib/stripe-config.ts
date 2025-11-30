// IMPORTANT: This key should be stored in an environment variable (.env.local)
// for security. It is placed here for demonstration purposes only.
// Example for .env.local:
// NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

export const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_live_51SYKIRFOrzQHr7JwMjTvIp9vaTVcgGhoHYc1rk4agEmeGHwHv3qoAjLs2qlTXiQcglolGlZwzWhGU13gqTyyXBGG00OXz3BJ9z';
