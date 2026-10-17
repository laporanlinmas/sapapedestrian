import { ArrowUpRight } from 'lucide-react';
import SectionLabel from './SectionLabel';

type Theme = 'blue' | 'amber';

interface MonitorCardConfig {
  anchorId: string;
  iconImage: string;
  title: string;
  description: string;
  shortDescription: string;
  theme: Theme;
  onOpen: () => void;
}

const THEME: Record<Theme, { panel: string; hoverBorder: string; button: string; ring: string }> = {
  blue: {
    panel: 'from-blue-50 to-slate-100 dark:from-blue-950/50 dark:to-slate-900',
    hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-800',
    button: 'bg-blue-600 text-white group-hover:bg-blue-700',
    ring: 'focus-visible:ring-blue-500',
  },
  amber: {
    panel: 'from-amber-50 to-slate-100 dark:from-amber-950/40 dark:to-slate-900',
    hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-800',
    button: 'bg-amber-500 text-white group-hover:bg-amber-600',
    ring: 'focus-visible:ring-amber-500',
  },
};

function MonitorCard({
  anchorId,
  iconImage,
  title,
  description,
  shortDescription,
  theme,
  onOpen,
}: MonitorCardConfig) {
  const styles = THEME[theme];

  return (
    <div id={anchorId} className="scroll-mt-32 h-full">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Buka ${title}`}
        className={`group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white text-left
                    transition-[border-color,box-shadow] duration-200 dark:border-slate-800 dark:bg-slate-900 ${styles.hoverBorder}
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${styles.ring}
                    dark:focus-visible:ring-offset-slate-950`}
      >
        <div className={`relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br ${styles.panel}`}>
          <div
            aria-hidden="true"
            className="absolute inset-0 dark:opacity-60"
            style={{
              backgroundImage: 'radial-gradient(circle at center, rgb(100 116 139 / .28) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
              maskImage: 'radial-gradient(70% 70% at 50% 45%, #000 40%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(70% 70% at 50% 45%, #000 40%, transparent 100%)',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src={iconImage}
              alt=""
              width={112}
              height={112}
              loading="lazy"
              decoding="async"
              className="h-16 w-auto object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-105 sm:h-20 lg:h-24"
            />
          </div>
        </div>

        <div className="flex flex-1 items-center gap-3 border-t border-slate-300 p-3.5 dark:border-slate-800 sm:p-4">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-extrabold text-slate-900 dark:text-white">{title}</h3>
            <p className="mt-0.5 hidden text-xs leading-relaxed text-slate-500 dark:text-slate-400 sm:block">
              {description}
            </p>
            <p className="mt-0.5 text-xs leading-snug text-slate-500 dark:text-slate-400 sm:hidden">
              {shortDescription}
            </p>
          </div>
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${styles.button}`}
            aria-hidden="true"
          >
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </button>
    </div>
  );
}

export default function MonitoringSection({
  onOpenCctv,
  onOpenMap,
}: {
  onOpenCctv: () => void;
  onOpenMap: () => void;
}) {
  const cards: MonitorCardConfig[] = [
    {
      anchorId: 'cctv',
      iconImage: '/assets/cctv.webp',
      title: 'SIPEDAS VIEW',
      description: 'Pantau titik CCTV dan ketersediaan WiFi gratis di sepanjang kawasan pedestrian secara langsung dari jaringan.',
      shortDescription: 'CCTV & WiFi gratis sepanjang kawasan',
      theme: 'blue',
      onOpen: onOpenCctv,
    },
    {
      anchorId: 'peta',
      iconImage: '/assets/mymaps.webp',
      title: 'Peta Kerawanan',
      description: 'Kenali titik rawan, area tegokan liar, dan catatan kejadian di kawasan pedestrian Ponorogo.',
      shortDescription: 'Titik rawan & catatan kejadian',
      theme: 'amber',
      onOpen: onOpenMap,
    },
  ];

  return (
    <section id="pemantauan" className="scroll-mt-32 reveal">
      <SectionLabel className="mb-6 sm:mb-7">Layanan Pemantauan</SectionLabel>
      <div className="mx-auto mb-7 max-w-2xl px-2 text-center sm:mb-8">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
          Pantau kawasan pedestrian
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
          Akses CCTV secara langsung dan kenali titik kerawanan untuk membantu menjaga kawasan tetap aman dan nyaman.
        </p>
      </div>
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2">
        {cards.map((card) => <MonitorCard key={card.anchorId} {...card} />)}
      </div>
    </section>
  );
}