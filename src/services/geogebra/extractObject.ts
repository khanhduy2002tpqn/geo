import type { GeoGebraApi } from '@/types/ggb';
import type { ObjectInfo } from '@/types/geogebra';

/** Call a GeoGebra string getter defensively (some throw for certain objects). */
function safeString(getter: () => string): string {
  try {
    return getter() ?? '';
  } catch {
    return '';
  }
}

/**
 * Build an {@link ObjectInfo} from a clicked object's label using the GeoGebra
 * API. XML is intentionally not collected here — it is large and never sent to
 * the AI. (It can be added later for highlighting/debug without changing this
 * contract.)
 */
export function extractObject(api: GeoGebraApi, name: string): ObjectInfo {
  const type = safeString(() => api.getObjectType(name));
  const value = safeString(() => api.getValueString(name));
  const definition = safeString(() => api.getDefinitionString(name));
  const command = safeString(() => api.getCommandString(name));

  return {
    name,
    type,
    value,
    definition,
    command: command.length > 0 ? command : undefined,
  };
}
