import '../globals.css'
import { Inter, Manrope } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' })
export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body className={`${inter.variable} ${manrope.variable}`}>{children}</body></html>
}
