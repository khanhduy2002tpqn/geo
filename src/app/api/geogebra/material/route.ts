import JSZip from 'jszip';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const ggbUrl = `https://www.geogebra.org/material/download/format/file/id/${id}`;

  let buffer: ArrayBuffer;
  try {
    const resp = await fetch(ggbUrl);
    if (!resp.ok) return NextResponse.json({ error: 'GeoGebra fetch failed' }, { status: 502 });
    buffer = await resp.arrayBuffer();
  } catch {
    return NextResponse.json({ error: 'Network error fetching material' }, { status: 502 });
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return NextResponse.json({ error: 'Invalid GGB file' }, { status: 502 });
  }

  const xmlFile = zip.file('geogebra.xml');
  if (!xmlFile) return NextResponse.json({ error: 'No geogebra.xml in archive' }, { status: 502 });

  const xml = await xmlFile.async('string');

  // Hide the Algebra View (id="2") in the perspective by setting visible="false".
  // Targets all <view id="2" ...> tags regardless of attribute order.
  const modified = xml.replace(
    /<view\b[^>]*\bid="2"[^>]*/g,
    (tag) => tag.replace(/\bvisible="true"/, 'visible="false"'),
  );

  zip.file('geogebra.xml', modified);
  const base64 = await zip.generateAsync({ type: 'base64' });

  return NextResponse.json({ ggbBase64: base64 });
}
