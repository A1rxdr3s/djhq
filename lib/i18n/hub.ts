import type { Locale } from './messages'

const en = {
  title: 'Your Workspace | DJHQ', description: 'Choose your DJHQ product workspace.',
  welcome: 'Welcome back,', workspace: 'Your workspace', subtitle: 'Choose a product to continue.', products: 'Products',
  empty: 'No products are assigned to this account yet. Contact DJHQ if you expected access.',
  home: 'DJHQ product hub', language: 'Language', account: 'Account', signOut: 'Sign out',
  websiteName: 'Artist Website', websiteDesc: 'Profile, releases, shows, press kit and bookings, published as your artist site.', websiteAction: 'Open Website Manager', websiteTag: 'Presence',
  set2goName: 'Set2Go', set2goDesc: 'Prepare tracks and build Rekordbox-ready sets for the booth.', set2goAction: 'Open Set2Go', set2goTag: 'Performance', set2goStatus: 'In development',
} as const
export type HubKey = keyof typeof en
const es: Record<HubKey, string> = {
  title: 'Tu espacio de trabajo | DJHQ', description: 'Elige tu espacio de trabajo de DJHQ.',
  welcome: 'Hola de nuevo,', workspace: 'Tu espacio de trabajo', subtitle: 'Elige un producto para continuar.', products: 'Productos',
  empty: 'Todavía no hay productos asignados a esta cuenta. Contacta a DJHQ si esperabas tener acceso.',
  home: 'Centro de productos de DJHQ', language: 'Idioma', account: 'Cuenta', signOut: 'Cerrar sesión',
  websiteName: 'Sitio web de artista', websiteDesc: 'Perfil, lanzamientos, shows, kit de prensa y contrataciones, publicados como tu sitio de artista.', websiteAction: 'Abrir gestor del sitio', websiteTag: 'Presencia',
  set2goName: 'Set2Go', set2goDesc: 'Prepara pistas y arma sets listos para Rekordbox y la cabina.', set2goAction: 'Abrir Set2Go', set2goTag: 'Performance', set2goStatus: 'En desarrollo',
}
export function hub(locale: Locale, key: HubKey): string { return (locale === 'es' ? es[key] : en[key]) }
