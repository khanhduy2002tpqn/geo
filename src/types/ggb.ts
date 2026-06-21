/**
 * Minimal typings for the GeoGebra JavaScript API surface we use.
 * Loaded at runtime from https://www.geogebra.org/apps/deployggb.js.
 * See: https://geogebra.github.io/docs/reference/en/GeoGebra_Apps_API/
 */

export interface GeoGebraApi {
  /** Fires with the label of the clicked object. */
  registerClickListener(handler: (objName: string) => void): void;
  unregisterClickListener(handler: (objName: string) => void): void;

  getObjectType(objName: string): string;
  getValueString(objName: string): string;
  getDefinitionString(objName: string): string;
  getCommandString(objName: string): string;
  getXML(objName?: string): string;
  isVisible(objName: string): boolean;
  isIndependent(objName: string): boolean;

  evalCommand(cmdString: string): boolean;
  getAllObjectNames(type?: string): string[];
  exists(objName: string): boolean;
  setColor(objName: string, red: number, green: number, blue: number): void;
  reset(): void;

  getXcoord(objName: string): number;
  getYcoord(objName: string): number;
  setCoordSystem(xmin: number, xmax: number, ymin: number, ymax: number): void;
}

export interface GGBAppletParameters {
  appName?: 'classic' | 'graphing' | 'geometry' | '3d' | 'suite';
  /** GeoGebra material ID — loads the construction from GeoGebra servers. */
  material_id?: string;
  /** Base64-encoded .ggb file — overrides material_id when both are set. */
  ggbBase64?: string;
  width?: number;
  height?: number;
  showToolBar?: boolean;
  showAlgebraInput?: boolean;
  showMenuBar?: boolean;
  showResetIcon?: boolean;
  enableRightClick?: boolean;
  enableShiftDragZoom?: boolean;
  enableLabelDrags?: boolean;
  language?: string;
  perspective?: string;
  appletOnLoad?: (api: GeoGebraApi) => void;
  // GeoGebra accepts many more optional params.
  [key: string]: unknown;
}

export interface GGBAppletInstance {
  inject(elementId: string): void;
}

export type GGBAppletConstructor = new (
  parameters: GGBAppletParameters,
  html5NoWebSimple?: boolean,
) => GGBAppletInstance;

declare global {
  interface Window {
    GGBApplet?: GGBAppletConstructor;
  }
}

export {};
