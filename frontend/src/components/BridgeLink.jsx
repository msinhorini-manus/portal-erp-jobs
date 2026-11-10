import { Link } from 'react-router-dom'
import { getRegionalRuntime, regionalHref } from '@/lib/regional-runtime.js'

/** React Router owns the SPA; Next owns the other regional journeys after cutover. */
export default function BridgeLink({ to, children, ...props }) {
  const context = getRegionalRuntime()
  const path = typeof to === 'string' ? to : ''
  const rootAdmin = /^\/admin(?:\/|\?|$)/.test(path)
  const regionalJourney = context.basename && path.startsWith('/') && !path.startsWith('//')
  if (rootAdmin && context.basename || regionalJourney) {
    return <a href={rootAdmin ? path : regionalHref(path)} {...props}>{children}</a>
  }
  return <Link to={to} {...props}>{children}</Link>
}
