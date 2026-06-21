/**
 * Vietnamese GeoGebra type-prefix patterns.
 * Teachers embed the object type in the name: "MatBCE" = mặt phẳng BCE,
 * "CanhBE" = cạnh BE, "DuongThangAB" = đường thẳng AB, etc.
 */
export const VIET_PREFIX_RE =
  /^(DuongThang|DuongTron|CungTron|Hinh(Vuong|ChuNhat|Thoi|BinhHanh|Thang\w*|Chop|Tru|Cau|Hop|Non|Lang\w*|Quat)|TamGiac(Deu)?|TuGiac|NguGiac|LucGiac|DaGiac|Vecto|Canh|Tia|Goc|Mat|DuongCao|TrungTuyen|TrungTruc|PhanGiac|DuongPhanGiac|TrongTam|TrucTam|TamNgoai|TamNoi)/i;

export function stripVietPrefix(name: string): string {
  return name.replace(VIET_PREFIX_RE, '');
}

export function isAutoPrefixed(name: string): boolean {
  return VIET_PREFIX_RE.test(name);
}

/**
 * Display label for an object name: shows cleaned-up version when the name
 * has a Vietnamese type prefix, otherwise shows the original name.
 * e.g. "CanhBE" → "BE",  "MatABE" → "ABE",  "d" → "d"
 */
export function displayName(name: string): string {
  const stripped = stripVietPrefix(name);
  return stripped || name;
}
