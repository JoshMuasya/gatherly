import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  // Never log sensitive server vars or private keys
  beforeSend(event) {
    if (event.request?.cookies) delete event.request.cookies;
    if (event.extra) {
      delete event.extra.FIREBASE_PRIVATE_KEY;
    }
    return event;
  },
});
