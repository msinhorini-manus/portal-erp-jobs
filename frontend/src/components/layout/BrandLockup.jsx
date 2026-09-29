export default function BrandLockup({ onDark = false, className = '' }) {
  return (
    <img
      src={`/brand/jobs-by-portal-erp-clean-${onDark ? 'dark' : 'light'}.png`}
      alt="Jobs by Portal ERP"
      className={`h-auto w-[190px] sm:w-[220px] ${className}`}
    />
  )
}
