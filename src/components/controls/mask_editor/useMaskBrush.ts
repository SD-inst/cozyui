import { useCallback, useRef } from 'react';

const MAX_UNDO_STEPS = 50;

/**
 * Hook for inpainting mask management.
 * Provides methods for brush drawing, resetting, and retrieving mask data.
 * width/height can be changed via setDimensions.
 */
export function useMaskBrush(
  width: number,
  height: number,
  brushSize: number,
  onStateChange?: ((canUndo: boolean, canRedo: boolean) => void) | null
) {
  // Refs for dimensions and mask data
  const widthRef = useRef(width);
  const heightRef = useRef(height);
  const brushSizeRef = useRef(brushSize);
  
  // Flat mask array (Uint8Array: 0 = not painted, 1 = painted)
  const maskDataRef = useRef<Uint8Array>(new Uint8Array(width * height));

  // Undo/Redo history: stores Uint8Array snapshots
  const undoStackRef = useRef<Uint8Array[]>([]);
  const redoStackRef = useRef<Uint8Array[]>([]);

  // Helper function to notify state changes
  const notifyStateChange = useCallback(() => {
    onStateChange?.(undoStackRef.current.length > 0, redoStackRef.current.length > 0);
  }, [onStateChange]);

  // Method to update dimensions
  const setDimensions = useCallback((w: number, h: number) => {
    if (w !== widthRef.current || h !== heightRef.current) {
      widthRef.current = w;
      heightRef.current = h;
      // Create a new array and copy data if possible
      const newData = new Uint8Array(w * h);
      const oldData = maskDataRef.current;
      const copyWidth = Math.min(w, widthRef.current);
      const copyHeight = Math.min(h, heightRef.current);
      for (let y = 0; y < copyHeight; y++) {
        for (let x = 0; x < copyWidth; x++) {
          newData[y * w + x] = oldData[y * widthRef.current + x];
        }
      }
      maskDataRef.current = newData;
    }
  }, []);

  // Method to update brush size
  const setBrushSize = useCallback((size: number) => {
    brushSizeRef.current = size;
  }, []);

  const reset = useCallback(() => {
    // Save current state before clearing so reset can be undone
    const currentState = new Uint8Array(maskDataRef.current);
    undoStackRef.current.push(currentState);
    if (undoStackRef.current.length > MAX_UNDO_STEPS) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    maskDataRef.current.fill(0);
    notifyStateChange();
  }, [notifyStateChange]);

  const clear = useCallback(() => {
    // Clear mask and undo/redo stacks (used when image changes)
    undoStackRef.current = [];
    redoStackRef.current = [];
    maskDataRef.current.fill(0);
    notifyStateChange();
  }, [notifyStateChange]);

  /**
   * Save current state to undo stack before starting to draw.
   * Clears redo stack (as in standard undo/redo systems).
   */
  const saveState = useCallback(() => {
    const current = maskDataRef.current;
    // Save a copy of the current state
    const snapshot = new Uint8Array(current);
    undoStackRef.current.push(snapshot);
    // Limit max steps
    if (undoStackRef.current.length > MAX_UNDO_STEPS) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    notifyStateChange();
  }, [notifyStateChange]);

  /**
   * Undo the last action.
   */
  const undo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return false;
    
    // Save current state to redo stack
    const currentState = new Uint8Array(maskDataRef.current);
    redoStackRef.current.push(currentState);
    
    // Restore previous state
    const previousState = stack.pop()!;
    maskDataRef.current = previousState;
    notifyStateChange();
    return true;
  }, [notifyStateChange]);

  /**
   * Redo an undone action.
   */
  const redo = useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return false;
    
    // Save current state to undo stack
    const currentState = new Uint8Array(maskDataRef.current);
    undoStackRef.current.push(currentState);
    
    // Restore next state
    const nextState = stack.pop()!;
    maskDataRef.current = nextState;
    notifyStateChange();
    return true;
  }, [notifyStateChange]);

  /**
   * Check if there is anything to undo.
   */
  const getCanUndo = useCallback(() => {
    return undoStackRef.current.length > 0;
  }, []);

  /**
   * Check if there is anything to redo.
   */
  const getCanRedo = useCallback(() => {
    return redoStackRef.current.length > 0;
  }, []);

  // Fill a circular brush area on the mask with a given value.
  function fillCircle(
      cx: number,
      cy: number,
      radius: number,
      value: number,
  ) {
      const data = maskDataRef.current;
      const w = widthRef.current;
      const h = heightRef.current;
      const xMin = Math.max(0, Math.floor(cx - radius));
      const xMax = Math.min(w - 1, Math.ceil(cx + radius));
      const yMin = Math.max(0, Math.floor(cy - radius));
      const yMax = Math.min(h - 1, Math.ceil(cy + radius));
      const radiusSq = radius * radius;
      for (let py = yMin; py <= yMax; py++) {
          for (let px = xMin; px <= xMax; px++) {
              const dx = px - cx;
              const dy = py - cy;
              if (dx * dx + dy * dy <= radiusSq) {
                  data[py * w + px] = value;
              }
          }
      }
  }

  // Stroke a point on the mask with the given value (0 = erase, 1 = paint).
  const strokeAt = useCallback((x: number, y: number, value: number) => {
      const radius = Math.floor(brushSizeRef.current / 2);
      if (radius <= 0) return;
      fillCircle(x, y, radius, value);
  }, []);

  /**
   * Get mask data as a flat Uint8Array.
   */
  const getMaskData = useCallback(() => {
    return maskDataRef.current;
  }, []);

  /**
   * Set mask data from a flat array.
   */
  const setMaskData = useCallback(
    (data: Uint8Array) => {
      const w = widthRef.current;
      const h = heightRef.current;
      if (data.length === w * h) {
        maskDataRef.current = new Uint8Array(data);
      }
    },
    []
  );

  // Stable object — never changes
  return {
    strokeAt,
    reset,
    clear,
    saveState,
    undo,
    redo,
    getCanUndo,
    getCanRedo,
    getMaskData,
    setMaskData,
    maskDataRef,
    setDimensions,
    setBrushSize,
  };
}
