// ============================================================
// +html.tsx — Web HTML Template for Expo Router
// Enables no-referrer to allow Google OAuth avatars (lh3.googleusercontent.com)
// to load seamlessly on Web without 403 Forbidden / CORS blocks
// ============================================================

import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="referrer" content="no-referrer" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
