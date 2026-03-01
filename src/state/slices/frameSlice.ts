import type { FrameInput } from '../../types';

export interface FrameState {
  currentFrame: FrameInput | null;
}

export const initialFrameState: FrameState = {
  currentFrame: null,
};

export interface FrameActions {
  setCurrentFrame: (frame: FrameInput | null) => void;
}

export function createFrameSlice(set: (fn: (s: FrameState) => Partial<FrameState>) => void) {
  return {
    ...initialFrameState,
    setCurrentFrame: (frame: FrameInput | null) => set(() => ({ currentFrame: frame })),
  };
}
