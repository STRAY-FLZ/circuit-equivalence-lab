import { ThemeToggle } from './ThemeToggle'

const homepage = 'https://stray-flz.github.io/stray-articles/'

export function SiteHeader() {
  return <header className="site-header">
    <div className="shell header-inner">
      <a className="brand" href={homepage} aria-label="Stray，返回首页">Stray</a>
      <nav className="header-actions" aria-label="站点导航">
        <ThemeToggle />
        <span className="header-separator" aria-hidden="true" />
        <a className="return-home" href={homepage}>返回首页</a>
      </nav>
    </div>
  </header>
}
