import { Suspense } from 'react';
import { GeoGebraTutor } from '@/components/geogebra/GeoGebraTutor';

export default function GeoV1Page() {
  return (
    <div className="min-h-dvh">
      <Suspense>
        <GeoGebraTutor />
      </Suspense>
      <footer className="px-4 pb-8 pt-2 text-center text-xs text-[var(--color-ink)]/40">
        MxBot · Giải thích Toán bằng tiếng Việt
      </footer>
    </div>
  );
}
