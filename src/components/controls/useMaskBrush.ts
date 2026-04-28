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

  /**
   * Paint a point on the mask.
   * Uses a circular brush with the given radius.
   */
  const paintAt = useCallback(
    (x: number, y: number) => {
      const data = maskDataRef.current;
      const w = widthRef.current;
      const h = heightRef.current;
      const radius = Math.floor(brushSizeRef.current / 2);

      if (radius <= 0) return;

      const xMin = Math.max(0, Math.floor(x - radius));
      const xMax = Math.min(w - 1, Math.ceil(x + radius));
      const yMin = Math.max(0, Math.floor(y - radius));
      const yMax = Math.min(h - 1, Math.ceil(y + radius));

      const radiusSq = radius * radius;

      for (let py = yMin; py <= yMax; py++) {
        for (let px = xMin; px <= xMax; px++) {
          const dx = px - x;
          const dy = py - y;
          if (dx * dx + dy * dy <= radiusSq) {
            data[py * w + px] = 1;
          }
        }
      }
    },
    []
  );

  /**
   * Erase mask at a point (analogous to paintAt, but sets 0 instead of 1).
   */
  const eraseAt = useCallback(
    (x: number, y: number) => {
      const data = maskDataRef.current;
      const w = widthRef.current;
      const h = heightRef.current;
      const radius = Math.floor(brushSizeRef.current / 2);

      if (radius <= 0) return;

      const xMin = Math.max(0, Math.floor(x - radius));
      const xMax = Math.min(w - 1, Math.ceil(x + radius));
      const yMin = Math.max(0, Math.floor(y - radius));
      const yMax = Math.min(h - 1, Math.ceil(y + radius));

      const radiusSq = radius * radius;

      for (let py = yMin; py <= yMax; py++) {
        for (let px = xMin; px <= xMax; px++) {
          const dx = px - x;
          const dy = py - y;
          if (dx * dx + dy * dy <= radiusSq) {
            data[py * w + px] = 0;
          }
        }
      }
    },
    []
  );

  /**
   * Draw a line from one point to another.
   * Uses Bresenham's algorithm for smooth lines.
   */
  const paintLine = useCallback(
    (fromX: number, fromY: number, toX: number, toY: number) => {
      const data = maskDataRef.current;
      const w = widthRef.current;
      const h = heightRef.current;
      const radius = Math.floor(brushSizeRef.current / 2);

      if (radius <= 0) return;

      // Limit max distance between points
      // to avoid drawing lines across the entire image
      const maxDist = radius * 4;
      const dx = toX - fromX;
      const dy = toY - fromY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < maxDist) {
        // Draw directly if distance is small
        _paintLineBresenham(fromX, fromY, toX, toY, data, w, h, radius);
      } else {
        // Draw in segments of maxDist
        const steps = Math.ceil(dist / maxDist);
        for (let i = 0; i < steps; i++) {
          const t1 = i / steps;
          const t2 = (i + 1) / steps;
          const x1 = fromX + dx * t1;
          const y1 = fromY + dy * t1;
          const x2 = fromX + dx * t2;
          const y2 = fromY + dy * t2;
          _paintLineBresenham(x1, y1, x2, y2, data, w, h, radius);
        }
      }
    },
    []
  );

  // Internal Bresenham function — not exported
  function _paintLineBresenham(
    fromX: number, fromY: number, toX: number, toY: number,
    data: Uint8Array, w: number, h: number, radius: number
  ) {
    const radiusSq = radius * radius;
    const dx = Math.abs(toX - fromX);
    const dy = Math.abs(toY - fromY);
    const sx = fromX < toX ? 1 : -1;
    const sy = fromY < toY ? 1 : -1;

    let err = dx - dy;
    let x = fromX;
    let y = fromY;

    while (true) {
      const xMin = Math.max(0, Math.floor(x - radius));
      const xMax = Math.min(w - 1, Math.ceil(x + radius));
      const yMin = Math.max(0, Math.floor(y - radius));
      const yMax = Math.min(h - 1, Math.ceil(y + radius));

      for (let py = yMin; py <= yMax; py++) {
        for (let px = xMin; px <= xMax; px++) {
          const ddx = px - x;
          const ddy = py - y;
          if (ddx * ddx + ddy * ddy <= radiusSq) {
            data[py * w + px] = 1;
          }
        }
      }

      if (x === toX && y === toY) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /**
   * Get mask data as a flat Uint8Array.
   */
  const getMaskData = useCallback(() => {
    return maskDataRef.current;
  }, []);

  /**
   * Get mask data as a 2D array.
   */
  const getMaskData2D = useCallback(() => {
    const data = maskDataRef.current;
    const w = widthRef.current;
    const h = heightRef.current;
    const result: number[][] = [];

    for (let y = 0; y < h; y++) {
      const row: number[] = [];
      for (let x = 0; x < w; x++) {
        row.push(data[y * w + x]);
      }
      result.push(row);
    }

    return result;
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

  /**
   * Set mask data from a 2D array.
   */
  const setMaskData2D = useCallback(
    (data: number[][]) => {
      const w = widthRef.current;
      const h = heightRef.current;
      const flat = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          flat[y * w + x] = data[y]?.[x] ?? 0;
        }
      }
      maskDataRef.current = flat;
    },
    []
  );

  // Stable object — never changes
  return {
    paintAt,
    eraseAt,
    paintLine,
    reset,
    saveState,
    undo,
    redo,
    getCanUndo,
    getCanRedo,
    getMaskData,
    getMaskData2D,
    setMaskData,
    setMaskData2D,
    maskDataRef,
    setDimensions,
    setBrushSize,
  };
}
