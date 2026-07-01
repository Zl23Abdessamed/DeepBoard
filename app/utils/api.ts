"use client";

import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { PuzzleLocal, GetPuzzleSetParams } from "../types/types";

export const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export interface SignupPayload {
	username: string;
	email: string;
	password: string;
}

export interface SigninPayload {
	email: string;
	password: string;
}

export interface AuthResponse {
	message?: string;
	token?: string;
	user?: {
		id?: string | number;
		username?: string;
		email?: string;
	};
	[key: string]: unknown;
}

type PuzzleApiItem = {
	id: string;
	fen: string;
	moves?: string;
	rating?: number;
};



function createUrl(path: string) {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${baseUrl}${normalizedPath}`;
}

async function postJson<TResponse, TPayload>(
	path: string,
	payload: TPayload
): Promise<TResponse> {
	const response = await fetch(createUrl(path), {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	const data = await response.json().catch(() => null);

	if (!response.ok) {
		const message =
			data &&
			typeof data === "object" &&
			"message" in data &&
			typeof data.message === "string"
				? data.message
				: `Request failed with status ${response.status}`;

		throw new Error(message);
	}

	return data as TResponse;
}

export function signup(username: string, email: string, password: string) {
	return postJson<AuthResponse, SignupPayload>("/auth/signup", {
		username,
		email,
		password,
	});
}

export function signin(email: string, password: string) {
	return postJson<AuthResponse, SigninPayload>("/auth/signin", {
		email,
		password,
	});
}

export function useSignup(): UseMutationResult<AuthResponse, Error, SignupPayload> {
	return useMutation({
		mutationFn: ({ username, email, password }) => signup(username, email, password),
	});
}

export function useSignin(): UseMutationResult<AuthResponse, Error, SigninPayload> {
	return useMutation({
		mutationFn: ({ email, password }) => signin(email, password),
	});
}

function mapPuzzleResponseItem(p: PuzzleApiItem): PuzzleLocal {
	const allMoves: string[] = p.moves ? p.moves.split(" ") : [];

	return {
		puzzle_id: p.id,
		fen_for_player: p.fen,
		first_opponent_move_uci: allMoves[0] || "",
		solution_moves_uci: allMoves.slice(1),
		rating: Number(p.rating ?? 0),
	};
}

export async function getPuzzleStreak(
	rating: number,
	count: number
): Promise<PuzzleLocal[]> {
	const params = new URLSearchParams();
	params.set("rating", String(rating));
	params.set("limit", String(count));

	const res = await fetch(createUrl(`/api/puzzles/streak?${params.toString()}`));
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error((err as { error?: string }).error || "Failed to fetch puzzles");
	}

	const data = (await res.json()) as PuzzleApiItem[];
	return data.map(mapPuzzleResponseItem);
}

export async function getPuzzleSet({
	tier,
	minRating,
	maxRating,
	puzzleCount,
	selectedThemes = [],
	selectedOpenings = [],
}: GetPuzzleSetParams): Promise<PuzzleLocal[]> {
	const params = new URLSearchParams();
	params.set("tier", tier);
	params.set("min", String(minRating));
	params.set("max", String(maxRating));
	params.set("limit", String(puzzleCount));

	if (selectedThemes.length) {
		params.set("themes", selectedThemes.join(","));
	}

	if (selectedOpenings.length) {
		params.set("opening_tags", selectedOpenings.join(","));
	}

	const res = await fetch(createUrl(`/api/puzzles?${params.toString()}`));
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error((err as { error?: string }).error || "Failed to fetch puzzles");
	}

	const data = (await res.json()) as PuzzleApiItem[];
	return data.map(mapPuzzleResponseItem);
}
