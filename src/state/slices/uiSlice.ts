export interface UIState {
  expanded_zone_id: string | null;
  show_detail_card: boolean;
  hud_visible: boolean;
}

export const initialUIState: UIState = {
  expanded_zone_id: null,
  show_detail_card: false,
  hud_visible: true,
};

export interface UIActions {
  expandZone: (zone_id: string) => void;
  collapseZone: () => void;
  setHudVisible: (visible: boolean) => void;
}

export function createUISlice(set: (fn: (s: UIState) => Partial<UIState>) => void) {
  return {
    ...initialUIState,
    expandZone: (zone_id: string) =>
      set(() => ({
        expanded_zone_id: zone_id,
        show_detail_card: true,
      })),
    collapseZone: () =>
      set(() => ({
        expanded_zone_id: null,
        show_detail_card: false,
      })),
    setHudVisible: (visible: boolean) => set(() => ({ hud_visible: visible })),
  };
}
