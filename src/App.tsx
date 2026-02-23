/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw, Play, Info, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SHAPES, COLORS, GRID_SIZE, Block, Shape } from './constants';

// --- Utilities ---

const generateId = () => Math.random().toString(36).substr(2, 9);

const getRandomBlock = (): Block => {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return { id: generateId(), shape, color };
};

const createEmptyGrid = () => Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));

export default function App() {
  // --- State ---
  const [grid, setGrid] = useState<(string | null)[][]>(createEmptyGrid());
  const [availableBlocks, setAvailableBlocks] = useState<(Block | null)[]>([null, null, null]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [combo, setCombo] = useState(0);
  const [movesSinceLastClear, setMovesSinceLastClear] = useState(0);
  const [isGameStarted, setIsGameStarted] = useState(false);
  
  // Dragging state
  const [draggingBlock, setDraggingBlock] = useState<{ block: Block; index: number; x: number; y: number } | null>(null);
  const [previewPos, setPreviewPos] = useState<{ r: number; c: number } | null>(null);
  
  const gridRef = useRef<HTMLDivElement>(null);

  // --- Initialization ---
  useEffect(() => {
    const savedHighScore = localStorage.getItem('block-blaster-highscore');
    if (savedHighScore) setHighScore(parseInt(savedHighScore, 10));
    
    // Start with 3 blocks
    setAvailableBlocks([getRandomBlock(), getRandomBlock(), getRandomBlock()]);
  }, []);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('block-blaster-highscore', score.toString());
    }
  }, [score, highScore]);

  // --- Game Logic ---

  const canPlaceBlock = useCallback((gridState: (string | null)[][], shape: Shape, row: number, col: number) => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] === 1) {
          const targetR = row + r;
          const targetC = col + c;
          if (
            targetR < 0 || targetR >= GRID_SIZE ||
            targetC < 0 || targetC >= GRID_SIZE ||
            gridState[targetR][targetC] !== null
          ) {
            return false;
          }
        }
      }
    }
    return true;
  }, []);

  const checkGameOver = useCallback((currentGrid: (string | null)[][], currentBlocks: (Block | null)[]) => {
    const activeBlocks = currentBlocks.filter((b): b is Block => b !== null);
    if (activeBlocks.length === 0) return false;

    for (const block of activeBlocks) {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (canPlaceBlock(currentGrid, block.shape, r, c)) {
            return false;
          }
        }
      }
    }
    return true;
  }, [canPlaceBlock]);

  const placeBlock = (block: Block, blockIndex: number, row: number, col: number) => {
    if (!canPlaceBlock(grid, block.shape, row, col)) return;

    const newGrid = grid.map(r => [...r]);
    block.shape.forEach((rowArr, rIdx) => {
      rowArr.forEach((cell, cIdx) => {
        if (cell === 1) {
          newGrid[row + rIdx][col + cIdx] = block.color;
        }
      });
    });

    // Check for clears
    let rowsToClear: number[] = [];
    let colsToClear: number[] = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      if (newGrid[r].every(cell => cell !== null)) rowsToClear.push(r);
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      if (newGrid.every(row => row[c] !== null)) colsToClear.push(c);
    }

    const totalLinesCleared = rowsToClear.length + colsToClear.length;
    
    if (totalLinesCleared > 0) {
      // Clear lines
      rowsToClear.forEach(r => {
        for (let c = 0; c < GRID_SIZE; c++) newGrid[r][c] = null;
      });
      colsToClear.forEach(c => {
        for (let r = 0; r < GRID_SIZE; r++) newGrid[r][c] = null;
      });

      // Scoring
      let baseScore = totalLinesCleared * 10;
      let multiplier = 1;
      if (totalLinesCleared === 3) multiplier = 2;
      if (totalLinesCleared >= 4) multiplier = 3;
      
      const clearScore = baseScore * multiplier;
      
      // Combo logic: 3 moves within last clear
      let newCombo = combo;
      if (movesSinceLastClear < 3) {
        newCombo += 1;
      } else {
        newCombo = 0;
      }
      
      const comboBonus = newCombo * 10;
      setScore(prev => prev + clearScore + comboBonus);
      setCombo(newCombo);
      setMovesSinceLastClear(0);
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: [block.color, '#FFFFFF']
      });
    } else {
      setMovesSinceLastClear(prev => prev + 1);
    }

    setGrid(newGrid);

    // Update available blocks
    const nextBlocks = [...availableBlocks];
    nextBlocks[blockIndex] = null;
    
    // If all blocks used, generate new ones
    if (nextBlocks.every(b => b === null)) {
      setAvailableBlocks([getRandomBlock(), getRandomBlock(), getRandomBlock()]);
    } else {
      setAvailableBlocks(nextBlocks);
    }

    // Check game over
    if (checkGameOver(newGrid, nextBlocks.every(b => b === null) ? [getRandomBlock(), getRandomBlock(), getRandomBlock()] : nextBlocks)) {
      setGameOver(true);
    }
  };

  const resetGame = () => {
    setGrid(createEmptyGrid());
    setAvailableBlocks([getRandomBlock(), getRandomBlock(), getRandomBlock()]);
    setScore(0);
    setCombo(0);
    setMovesSinceLastClear(0);
    setGameOver(false);
    setIsGameStarted(true);
  };

  // --- Drag & Drop Handlers ---

  const handlePointerDown = (e: React.PointerEvent, block: Block, index: number) => {
    if (gameOver) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDraggingBlock({
      block,
      index,
      x: e.clientX,
      y: e.clientY,
    });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingBlock || !gridRef.current) return;

    setDraggingBlock(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);

    // Calculate grid position
    const gridRect = gridRef.current.getBoundingClientRect();
    const cellSize = gridRect.width / GRID_SIZE;
    
    // We want the "center" of the block or the top-left to align with the grid
    // Let's use the pointer position as the top-left of the block for placement logic
    const relativeX = e.clientX - gridRect.left;
    const relativeY = e.clientY - gridRect.top;
    
    const col = Math.floor(relativeX / cellSize);
    const row = Math.floor(relativeY / cellSize);

    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      if (canPlaceBlock(grid, draggingBlock.block.shape, row, col)) {
        setPreviewPos({ r: row, c: col });
      } else {
        setPreviewPos(null);
      }
    } else {
      setPreviewPos(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!draggingBlock) return;

    if (previewPos) {
      placeBlock(draggingBlock.block, draggingBlock.index, previewPos.r, previewPos.c);
    }

    setDraggingBlock(null);
    setPreviewPos(null);
  };

  // --- Render Helpers ---

  const renderGrid = () => {
    return (
      <div 
        ref={gridRef}
        className="relative grid grid-cols-8 gap-1 p-2 bg-stone-800 rounded-xl shadow-2xl border-4 border-stone-700 aspect-square w-full max-w-[400px] mx-auto"
      >
        {grid.map((row, rIdx) => 
          row.map((cell, cIdx) => {
            const isPreview = previewPos && 
              rIdx >= previewPos.r && rIdx < previewPos.r + draggingBlock!.block.shape.length &&
              cIdx >= previewPos.c && cIdx < previewPos.c + draggingBlock!.block.shape[0].length &&
              draggingBlock!.block.shape[rIdx - previewPos.r][cIdx - previewPos.c] === 1;

            return (
              <div 
                key={`${rIdx}-${cIdx}`}
                className={`
                  aspect-square rounded-sm transition-all duration-200
                  ${cell ? 'shadow-inner' : 'bg-stone-700/50'}
                `}
                style={{ 
                  backgroundColor: cell || (isPreview ? `${draggingBlock!.block.color}80` : undefined),
                  boxShadow: cell ? `inset 0 0 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)` : 'none'
                }}
              />
            );
          })
        )}
      </div>
    );
  };

  const renderBlock = (block: Block, index: number, isDragging = false) => {
    const shape = block.shape;
    const rows = shape.length;
    const cols = shape[0].length;

    return (
      <motion.div
        key={block.id}
        className={`relative cursor-grab active:cursor-grabbing ${isDragging ? 'z-50 pointer-events-none' : ''}`}
        onPointerDown={(e) => handlePointerDown(e, block, index)}
        style={isDragging ? {
          position: 'fixed',
          left: draggingBlock!.x,
          top: draggingBlock!.y,
          transform: 'translate(-50%, -50%) scale(1.1)',
        } : {}}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
      >
        <div 
          className="grid gap-0.5"
          style={{ 
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            width: isDragging ? `${(gridRef.current?.clientWidth || 0) / GRID_SIZE * cols}px` : 'auto'
          }}
        >
          {shape.map((row, rIdx) => 
            row.map((cell, cIdx) => (
              <div 
                key={`${rIdx}-${cIdx}`}
                className="aspect-square w-4 sm:w-6 md:w-8 rounded-sm"
                style={{ 
                  backgroundColor: cell === 1 ? block.color : 'transparent',
                  boxShadow: cell === 1 ? `inset 0 0 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.1)` : 'none'
                }}
              />
            ))
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-stone-800 font-sans selection:bg-orange-200 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="p-4 md:p-6 flex justify-between items-center max-w-4xl mx-auto w-full">
        <div className="flex flex-col">
          <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-orange-600 uppercase italic">
            螺蛳粉 <span className="text-stone-800">消消乐</span>
          </h1>
          <div className="flex items-center gap-2 text-stone-600 text-sm font-bold uppercase tracking-wide mt-1">
            <Trophy size={16} className="text-amber-500" />
            <span>最高分: {highScore}</span>
          </div>
        </div>

        <div className="bg-white px-8 py-3 rounded-2xl shadow-md border border-stone-200 flex flex-col items-center">
          <span className="text-xs uppercase font-bold tracking-widest text-stone-400 mb-1">当前得分</span>
          <span className="text-4xl md:text-5xl font-black text-stone-800 tabular-nums leading-none">{score}</span>
        </div>
      </header>

      {/* Main Game Area */}
      <main 
        className="flex-1 flex flex-col items-center justify-center p-4 gap-8 touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Combo Indicator */}
        <AnimatePresence>
          {combo > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.5 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="absolute top-32 bg-orange-500 text-white px-4 py-1 rounded-full font-black text-sm shadow-lg z-10"
            >
              COMBO x{combo}
            </motion.div>
          )}
        </AnimatePresence>

        {renderGrid()}

        {/* Available Blocks */}
        <div className="flex justify-center items-center gap-4 md:gap-8 h-32 w-full max-w-md bg-white/50 rounded-3xl p-4 border border-stone-200/50">
          {availableBlocks.map((block, idx) => (
            <div key={idx} className="flex-1 flex justify-center items-center min-w-[80px]">
              {block && renderBlock(block, idx)}
            </div>
          ))}
        </div>
      </main>

      {/* Floating Dragging Block */}
      {draggingBlock && renderBlock(draggingBlock.block, draggingBlock.index, true)}

      {/* Footer / Controls */}
      <footer className="p-6 flex justify-center gap-4">
        <button 
          onClick={resetGame}
          className="p-3 bg-white hover:bg-stone-50 rounded-full shadow-md border border-stone-200 transition-all active:scale-95 group"
          title="Reset Game"
        >
          <RotateCcw size={20} className="text-stone-600 group-hover:rotate-[-45deg] transition-transform" />
        </button>
      </footer>

      {/* Overlays */}
      <AnimatePresence>
        {!isGameStarted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-stone-900/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[40px] p-8 md:p-12 max-w-md w-full shadow-2xl text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 via-red-500 to-amber-500" />
              
              <h2 className="text-4xl font-black text-stone-800 mb-4 italic uppercase tracking-tighter">
                螺蛳粉 <br/><span className="text-orange-600">消消乐</span>
              </h2>
              
              <p className="text-stone-500 mb-8 text-sm leading-relaxed">
                拖拽方块填充行或列。<br/>消除整行或整列来获得分数并保持棋盘整洁！
              </p>

              <div className="space-y-4">
                <button 
                  onClick={() => setIsGameStarted(true)}
                  className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Play size={20} fill="currentColor" />
                  开始游戏
                </button>
              </div>

              <div className="mt-8 pt-8 border-t border-stone-100 flex justify-center">
                <div className="text-center">
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">棋盘规格</h4>
                  <p className="text-xl font-black text-stone-700">8 x 8 经典</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {gameOver && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] bg-red-900/40 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[40px] p-8 md:p-12 max-w-md w-full shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <X size={40} strokeWidth={3} />
              </div>
              
              <h2 className="text-3xl font-black text-stone-800 mb-2">游戏结束！</h2>
              <p className="text-stone-500 mb-8">没有可放置的位置了。</p>

              <div className="bg-stone-50 rounded-3xl p-6 mb-8 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">最终得分</p>
                  <p className="text-3xl font-black text-stone-800">{score}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">最高分</p>
                  <p className="text-3xl font-black text-orange-600">{highScore}</p>
                </div>
              </div>

              <button 
                onClick={resetGame}
                className="w-full py-4 bg-stone-900 hover:bg-black text-white rounded-2xl font-bold text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <RotateCcw size={20} />
                再来一局
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Decoration */}
      <div className="fixed -bottom-20 -left-20 w-64 h-64 bg-orange-100 rounded-full blur-3xl opacity-50 -z-10" />
      <div className="fixed -top-20 -right-20 w-64 h-64 bg-amber-100 rounded-full blur-3xl opacity-50 -z-10" />
    </div>
  );
}
