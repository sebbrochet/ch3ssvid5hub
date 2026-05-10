import { useEffect, useRef, useState, useCallback } from 'react';
import { Chessground } from 'chessground';
import { parseFen } from 'chessops/fen';
import { Chess } from 'chessops/chess';
import { parseSan } from 'chessops/san';
import type { Api } from 'chessground/api';
import type { Key } from 'chessground/types';

import { extractSanMoves } from '../utils/pgn-utils';
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';
import './BoardPreview.css';

interface BoardPreviewProps {
  /** Starting FEN position */
  fen: string;
  /** PGN movetext (with annotations) */
  pgn: string;
  /** Board orientation */
  orientation?: 'white' | 'black';
  /** Number of moves to auto-play */
  maxMoves?: number;
  /** Delay between moves in ms */
  moveDelay?: number;
}

export default function BoardPreview({
  fen,
  pgn,
  orientation = 'white',
  maxMoves = 15,
  moveDelay = 800,
}: BoardPreviewProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const cgRef = useRef<Api | null>(null);
  const [playing, setPlaying] = useState(false);
  const [moveIndex, setMoveIndex] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute the move sequence once
  const moves = useRef(extractSanMoves(pgn).slice(0, maxMoves));

  // Initialize Chessground
  useEffect(() => {
    if (!boardRef.current) return;

    cgRef.current = Chessground(boardRef.current, {
      fen,
      orientation,
      movable: { free: false, color: undefined },
      draggable: { enabled: false },
      selectable: { enabled: false },
      animation: { enabled: true, duration: 200 },
      highlight: { lastMove: true, check: true },
      drawable: { enabled: false },
      coordinates: false,
    });

    return () => {
      cgRef.current?.destroy();
      cgRef.current = null;
    };
  }, [fen, orientation]);

  // Apply a move at a given index
  const applyMove = useCallback(
    (idx: number): boolean => {
      if (idx < 0 || idx >= moves.current.length) return false;

      // Rebuild position from start up to idx
      const setup = parseFen(fen);
      if (setup.isErr) return false;
      const pos = Chess.fromSetup(setup.unwrap());
      if (pos.isErr) return false;
      const position = pos.unwrap();

      // Apply all moves up to idx
      let lastFrom: Key | null = null;
      let lastTo: Key | null = null;
      for (let i = 0; i <= idx; i++) {
        const san = moves.current[i];
        const move = parseSan(position, san);
        if (!move) return false;

        // Get from/to for the last move highlight
        if (i === idx) {
          if ('from' in move && 'to' in move) {
            const fromSq = move.from;
            const toSq = move.to;
            const files = 'abcdefgh';
            lastFrom = `${files[fromSq % 8]}${Math.floor(fromSq / 8) + 1}` as Key;
            lastTo = `${files[toSq % 8]}${Math.floor(toSq / 8) + 1}` as Key;
          }
        }

        position.play(move);
      }

      // Update the board
      if (cgRef.current) {
        const newSetup = position.toSetup();
        const fenParts = [];
        // Build a simple FEN from the position
        for (let rank = 7; rank >= 0; rank--) {
          let empty = 0;
          let rankStr = '';
          for (let file = 0; file < 8; file++) {
            const sq = rank * 8 + file;
            const piece = newSetup.board.get(sq);
            if (piece) {
              if (empty > 0) {
                rankStr += empty;
                empty = 0;
              }
              const letter =
                piece.role === 'pawn'
                  ? 'p'
                  : piece.role === 'knight'
                    ? 'n'
                    : piece.role === 'bishop'
                      ? 'b'
                      : piece.role === 'rook'
                        ? 'r'
                        : piece.role === 'queen'
                          ? 'q'
                          : 'k';
              rankStr += piece.color === 'white' ? letter.toUpperCase() : letter;
            } else {
              empty++;
            }
          }
          if (empty > 0) rankStr += empty;
          fenParts.push(rankStr);
        }
        const boardFen = fenParts.join('/');

        cgRef.current.set({
          fen: boardFen,
          lastMove: lastFrom && lastTo ? [lastFrom, lastTo] : undefined,
          turnColor: position.turn,
          check: position.isCheck(),
        });
      }

      return true;
    },
    [fen],
  );

  // Auto-play timer
  useEffect(() => {
    if (!playing) return;

    if (moveIndex >= moves.current.length - 1) {
      setPlaying(false);
      return;
    }

    timerRef.current = setTimeout(() => {
      const nextIdx = moveIndex + 1;
      if (applyMove(nextIdx)) {
        setMoveIndex(nextIdx);
      } else {
        setPlaying(false);
      }
    }, moveDelay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, moveIndex, moveDelay, applyMove]);

  const handlePlayPause = () => {
    if (playing) {
      setPlaying(false);
    } else {
      // If at end, restart
      if (moveIndex >= moves.current.length - 1) {
        setMoveIndex(-1);
        // Reset board to starting position
        if (cgRef.current) {
          cgRef.current.set({ fen, lastMove: undefined, check: false });
        }
      }
      setPlaying(true);
    }
  };

  const progress = moves.current.length > 0 ? ((moveIndex + 1) / moves.current.length) * 100 : 0;

  return (
    <div className="board-preview">
      <div ref={boardRef} className="board-preview-board" />
      <div className="board-preview-controls">
        <button onClick={handlePlayPause} className="board-preview-play" title={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸' : '▶'}
        </button>
        <div className="board-preview-progress">
          <div className="board-preview-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <span className="board-preview-counter">
          {moveIndex + 1}/{moves.current.length}
        </span>
      </div>
    </div>
  );
}
