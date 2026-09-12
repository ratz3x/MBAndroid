/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(auth)` | `/(auth)/login` | `/(auth)/register` | `/(main)` | `/(main)/admin` | `/(main)/admin/koperasi` | `/(main)/admin/toko` | `/(main)/dashboard` | `/(main)/event` | `/(main)/event/create` | `/(main)/forum` | `/(main)/gallery` | `/(main)/keanggotaan` | `/(main)/keanggotaan/register` | `/(main)/koperasi` | `/(main)/organisasi` | `/(main)/profil` | `/(main)/sos` | `/(main)/sponsorship` | `/(main)/toko` | `/_sitemap` | `/admin` | `/admin/koperasi` | `/admin/toko` | `/dashboard` | `/event` | `/event/create` | `/forum` | `/gallery` | `/keanggotaan` | `/keanggotaan/register` | `/koperasi` | `/login` | `/organisasi` | `/profil` | `/register` | `/sos` | `/sponsorship` | `/toko`;
      DynamicRoutes: `/(main)/event/${Router.SingleRoutePart<T>}` | `/(main)/forum/${Router.SingleRoutePart<T>}` | `/(main)/toko/${Router.SingleRoutePart<T>}` | `/event/${Router.SingleRoutePart<T>}` | `/forum/${Router.SingleRoutePart<T>}` | `/toko/${Router.SingleRoutePart<T>}`;
      DynamicRouteTemplate: `/(main)/event/[id]` | `/(main)/forum/[id]` | `/(main)/toko/[id]` | `/event/[id]` | `/forum/[id]` | `/toko/[id]`;
    }
  }
}
