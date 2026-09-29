import Image from 'next/image'

type BrandLockupProps = {
  onDark?: boolean
  className?: string
  priority?: boolean
}

export function BrandLockup({ onDark = false, className = '', priority = false }: BrandLockupProps) {
  return (
    <Image
      src={`/brand/jobs-by-portal-erp-clean-${onDark ? 'dark' : 'light'}.png`}
      alt="Jobs by Portal ERP"
      width={560}
      height={160}
      priority={priority}
      className={`h-auto w-[190px] sm:w-[220px] ${className}`}
    />
  )
}
