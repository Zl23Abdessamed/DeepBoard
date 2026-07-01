import { PieceRenderObject } from "react-chessboard";

export const generateLocalPieces = (style: string) => {
        const base = `/piece/${style}`;
        const pieces = {
            wP: `${base}/wP.svg`,
            wN: `${base}/wN.svg`,
            wB: `${base}/wB.svg`,
            wR: `${base}/wR.svg`,
            wQ: `${base}/wQ.svg`,
            wK: `${base}/wK.svg`,
            bP: `${base}/bP.svg`,
            bN: `${base}/bN.svg`,
            bB: `${base}/bB.svg`,
            bR: `${base}/bR.svg`,
            bQ: `${base}/bQ.svg`,
            bK: `${base}/bK.svg`,
        };
        return Object.fromEntries(
            Object.entries(pieces).map(([piece, src]) => [
                piece,
                ({ squareWidth }: { squareWidth: number }) => (
                    <img
                        src={src}
                        alt={piece}
                        style={{ width: squareWidth, height: squareWidth, objectFit: 'contain' }}
                        draggable={true}
                    />
                ),
            ])
        ) as PieceRenderObject;
    };