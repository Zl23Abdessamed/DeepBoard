import { CraftyAnalysisResult } from "../utils/crafty-client";

export type Rating = "beginner" | "intermediate" | "advanced";

export type PuzzleLocal = {
    puzzle_id: string;
    fen_for_player: string;
    first_opponent_move_uci: string;
    solution_moves_uci: string[];
    rating: number;
};

export interface GetPuzzleSetParams {
    tier: string;
    minRating: number;
    maxRating: number;
    puzzleCount: number;
    selectedThemes?: string[];
    selectedOpenings?: string[];
}

export type EngineChoice = 'stockfish' | 'crafty';


export type AnalysisResult = CraftyAnalysisResult;