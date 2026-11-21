import { redirect } from 'next/navigation'
import { resolveLoginRedirect } from '@/lib/auth/login-redirect'

type LoginPageProps = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LoginPage(props: LoginPageProps) {
  const searchParams = props.searchParams ? await props.searchParams : undefined
  redirect(resolveLoginRedirect(searchParams?.next))
}
