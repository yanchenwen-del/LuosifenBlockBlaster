/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Shape = number[][];

export interface Block {
  id: string;
  shape: Shape;
  color: string;
}

export const SHAPES: Shape[] = [
  [[1]], // 1x1
  [[1, 1]], // 1x2
  [[1], [1]], // 2x1
  [[1, 1, 1]], // 1x3
  [[1], [1], [1]], // 3x1
  [[1, 1, 1, 1]], // 1x4
  [[1], [1], [1], [1]], // 4x1
  [[1, 1, 1, 1, 1]], // 1x5
  [[1], [1], [1], [1], [1]], // 5x1
  [[1, 1], [1, 1]], // 2x2 Square
  [[1, 1, 1], [1, 1, 1]], // 2x3 Rectangle
  [[1, 1], [1, 1], [1, 1]], // 3x2 Rectangle
  [[1, 1, 1], [1, 1, 1], [1, 1, 1]], // 3x3 Square
  [[1, 1], [1, 0]], // L-small
  [[1, 1], [0, 1]], // L-small rev
  [[1, 0], [1, 1]], // L-small rev 2
  [[0, 1], [1, 1]], // L-small rev 3
  [[1, 1, 1], [1, 0, 0], [1, 0, 0]], // L-large
  [[1, 1, 1], [0, 0, 1], [0, 0, 1]], // L-large rev
  [[1, 0, 0], [1, 0, 0], [1, 1, 1]], // L-large rev 2
  [[0, 0, 1], [0, 0, 1], [1, 1, 1]], // L-large rev 3
  [[1, 1, 1], [0, 1, 0]], // T-shape
  [[0, 1, 0], [1, 1, 1]], // T-shape rev
  [[1, 0], [1, 1], [1, 0]], // T-shape left
  [[0, 1], [1, 1], [0, 1]], // T-shape right
];

export const COLORS = [
  "#F97316", // Orange
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#EAB308", // Yellow
  "#84CC16", // Lime
  "#10B981", // Emerald
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#8B5CF6", // Violet
  "#D946EF", // Fuchsia
];

export const GRID_SIZE = 8;
