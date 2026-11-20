import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowUpRight, AudioLines, Globe2 } from 'lucide-react'
import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { LOCALE_COOKIE, resolveLocale } from '@/lib/i18n/locale'
import { hub } from '@/lib/i18n/hub'
import { getWorkspaceAccess } from '@/lib/products/server'
import AuthHeader, { type HeaderLink } from './auth-header'
import styles from './product-hub.module.css'

async function currentLocale() {
  const [store, requestHeaders] = await Promise.all([cookies(), headers()])
  return resolveLocale(store.get(LOCALE_COOKIE)?.value, requestHeaders.get('accept-language'))
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale()
  return { title: hub(locale, 'title'), description: hub(locale, 'description') }
}

const products = [
  {
    id: 'set2go',
    prefix: 'set2go',
    href: '/set2go',
    Icon: AudioLines,
    featured: true,
    hasStatus: true,
  },
  {
    id: 'website',
    prefix: 'website',
    href: '/hq/website',
    Icon: Globe2,
    featured: false,
    hasStatus: false,
  },
] as const
const field = (prefix: string, name: string) => (prefix + name) as Parameters<typeof hub>[1]

export default async function ProductHubPage() {
  const workspace = await getWorkspaceAccess()
  if (!workspace) redirect('/sign-in')
  const locale = await currentLocale()
  const t = (key: Parameters<typeof hub>[1]) => hub(locale, key)
  const visibleProducts = products.filter(product => workspace.access[product.id])
  const firstName = workspace.user.user_metadata?.full_name?.split(' ')[0]

  const links: HeaderLink[] = visibleProducts.map(p => ({ id: p.id, href: p.href, label: t(field(p.prefix, 'Name')) }))

  return <main className={styles.page} lang={locale}>
    <div className={styles.ambient} aria-hidden="true" />
    <AuthHeader locale={locale} links={links} current="hub" email={workspace.user.email ?? ''} labels={{ products: t('products'), signOut: t('signOut') }} />
    <div className={styles.shell}>
      <section className={styles.intro} aria-labelledby="workspace-heading">
        <h1 id="workspace-heading">{firstName ? <>{t('welcome')} <em>{firstName}</em></> : t('workspace')}</h1>
        <p>{t('subtitle')}</p>
      </section>

      <section className={styles.products} aria-labelledby="products-heading">
        <div className={styles.sectionHeader}><h2 id="products-heading">{t('products')}</h2><span>{visibleProducts.length}</span></div>
        {visibleProducts.length ? <ul className={styles.grid}>
          {visibleProducts.map(product => <li key={product.id}><Link href={product.href} className={styles.card} data-product={product.id} data-featured={product.featured || undefined}>
            <span className={styles.iconWrap}><product.Icon aria-hidden="true" size={22} strokeWidth={1.5} /></span>
            <span className={styles.cardBody}>
              <span className={styles.meta}><span className={styles.tag}>{t(field(product.prefix, 'Tag'))}</span>{product.hasStatus && <span className={styles.status}><span className={styles.statusDot} />{t(field(product.prefix, 'Status'))}</span>}</span>
              <span className={styles.name}>{t(field(product.prefix, 'Name'))}</span>
              <span className={styles.desc}>{t(field(product.prefix, 'Desc'))}</span>
            </span>
            <span className={styles.action}><span>{t(field(product.prefix, 'Action'))}</span><ArrowUpRight aria-hidden="true" size={16} /></span>
          </Link></li>)}
        </ul> : <p className={styles.empty} role="status">{t('empty')}</p>}
      </section>
      <footer className={styles.footer}><span>DJHQ</span></footer>
    </div>
  </main>
}
