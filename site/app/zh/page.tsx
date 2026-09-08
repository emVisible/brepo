import Link from 'next/link';
import { MicroMap } from '@/components/MicroMap';
import { Reveal } from '@/components/Reveal';
import { CopyCmd } from '@/components/CopyCmd';
import { dict } from '@/lib/i18n';

const GITHUB = 'https://github.com/emVisible/brepo';

function SecTag({ children }: { children: string }) {
  return (
    <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, letterSpacing: '.1em', color: 'var(--subtle)' }}>
      <span style={{ width: 24, height: 1, background: 'var(--primary)', display: 'inline-block' }} />
      {children}
    </div>
  );
}

export default function PageZh() {
  const t = dict.zh;
  return (
    <main>
      <header style={{ position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(10px)', background: 'rgba(10,10,11,.72)', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ maxWidth: 1020, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 18 }}>
          <span style={{ fontWeight: 800, letterSpacing: '-.02em' }}>BriefRepo</span>
          <span style={{ flex: 1 }} />
          <Link href="#views" className="nav-anchor" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>{t.navMap}/{t.navCity}</Link>
          <Link href="#facts" className="nav-anchor" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>{t.navFacts}</Link>
          <Link href="/" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 9999, padding: '4px 10px' }}>EN</Link>
          <a href={GITHUB} style={{ fontSize: 12, color: '#fff', background: 'var(--primary)', borderRadius: 9999, padding: '6px 14px', textDecoration: 'none', fontWeight: 600 }}>{t.navGithub}</a>
        </div>
      </header>

      <div style={{ maxWidth: 1020, margin: '0 auto', padding: '0 20px 56px' }}>
        <section className="bp-grid-fine hero-grid" style={{ marginTop: 8, padding: '56px 0 8px' }}>
          <div>
            <div className="mono" style={{ fontSize: 11, letterSpacing: '.12em', color: 'var(--primary)', fontWeight: 700 }}>{t.heroKicker}</div>
            <h1 className="hero-title" style={{ lineHeight: 1.12, letterSpacing: '-.02em', margin: '12px 0 0', whiteSpace: 'pre-line' }}>{t.heroTitle}</h1>
            <p style={{ color: 'var(--muted)', marginTop: 12, maxWidth: '44ch' }}>{t.heroSub}</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <a href={GITHUB} style={{ background: 'var(--primary)', color: '#fff', borderRadius: 9999, padding: '10px 18px', textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>{t.ctaGithub}</a>
            </div>
            <div style={{ marginTop: 12, maxWidth: 340 }}>
              <CopyCmd cmd={t.installCmd} copiedLabel={t.copied} />
            </div>
          </div>
          <MicroMap />
        </section>

        <section style={{ marginTop: 56 }}>
          <Reveal><SecTag>{t.stepsTag}</SecTag></Reveal>
          <div className="grid-steps" style={{ gap: 0, marginTop: 14, border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, overflow: 'hidden' }}>
            {t.steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div className="step-cell" style={{ padding: 16, background: 'rgba(255,255,255,.015)' }}>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>{s.n}</div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>{s.t}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>{s.d}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="views" style={{ marginTop: 56, scrollMarginTop: 70 }}>
          <Reveal><SecTag>{t.compareTag}</SecTag></Reveal>
          <Reveal><h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', margin: '10px 0 0' }}>{t.compareTitle}</h2></Reveal>
          <div className="grid-compare" style={{ marginTop: 16 }}>
            <Reveal>
              <figure style={{ margin: 0, border: '1px solid rgba(255,255,255,.09)', borderRadius: 12, overflow: 'hidden', background: '#0d0d10' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/react-treemap.jpg" alt={t.shotMapAlt} style={{ display: 'block', width: '100%', aspectRatio: '16/10', objectFit: 'cover', objectPosition: 'top left' }} loading="lazy" />
                <figcaption style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{t.compareMap} <span className="mono" style={{ color: 'var(--subtle)', fontWeight: 400, fontSize: 11 }}>· facebook/react</span></div>
                  <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>{t.compareMapDesc}</div>
                </figcaption>
              </figure>
            </Reveal>
            <Reveal delay={120}>
              <figure style={{ margin: 0, border: '1px solid rgba(255,255,255,.09)', borderRadius: 12, overflow: 'hidden', background: '#0d0d10' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/react-city.jpg" alt={t.shotCityAlt} style={{ display: 'block', width: '100%', aspectRatio: '16/10', objectFit: 'cover', objectPosition: 'top left' }} loading="lazy" />
                <figcaption style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{t.compareCity} <span className="mono" style={{ color: 'var(--subtle)', fontWeight: 400, fontSize: 11 }}>· facebook/react</span></div>
                  <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>{t.compareCityDesc}</div>
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </section>

        <section id="facts" style={{ marginTop: 56, scrollMarginTop: 70 }}>
          <Reveal><SecTag>{t.factsTag}</SecTag></Reveal>
          <Reveal><h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', margin: '10px 0 0' }}>{t.factsTitle}</h2></Reveal>
          <div className="grid-facts" style={{ marginTop: 16 }}>
            {t.facts.map((f, i) => (
              <Reveal key={f.k} delay={i * 70}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '16px 12px', textAlign: 'center', background: 'rgba(255,255,255,.015)' }}>
                  <div className="mono" style={{ fontWeight: 800, fontSize: 16 }}>{f.k}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>{f.v}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="source" style={{ marginTop: 56, border: '1px solid rgba(110,86,207,.3)', borderRadius: 14, padding: 24, background: 'linear-gradient(180deg, rgba(110,86,207,.07), transparent 70%)' }}>
          <Reveal>
            <div className="mono" style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--subtle)' }}>{t.ossTag}</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', margin: '8px 0 0' }}>{t.ossTitle}</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '8px 0 0' }}>{t.ossDesc}</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <a href={GITHUB} style={{ background: 'var(--primary)', color: '#fff', borderRadius: 9999, padding: '10px 18px', textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>{t.ctaGithub}</a>
              <div style={{ minWidth: 280, flex: 1, maxWidth: 420 }}><CopyCmd cmd={t.installCmd} copiedLabel={t.copied} /></div>
            </div>
          </Reveal>
        </section>

        <footer style={{ marginTop: 48, borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 14, color: 'var(--subtle)', fontSize: 11, display: 'flex', gap: 12 }}>
          <span>{t.footer}</span>
          <span style={{ flex: 1 }} />
          <a href={GITHUB} style={{ color: 'var(--muted)', textDecoration: 'none' }}>GitHub</a>
        </footer>
      </div>
    </main>
  );
}
