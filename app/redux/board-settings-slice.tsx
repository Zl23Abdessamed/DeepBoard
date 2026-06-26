import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface BoardSettingsState {
  lightSquareColor: string;
  darkSquareColor: string;
  pieceStyle: string;
}

const initialState: BoardSettingsState = {
  lightSquareColor: '#eeeed2',
  darkSquareColor: '#769656',
  pieceStyle: 'cburnett',
};

export const boardSettingsSlice = createSlice({
  name: 'boardSettings',
  initialState,
  reducers: {
    setLightSquareColor(state, action: PayloadAction<string>) {
      state.lightSquareColor = action.payload;
    },
    setDarkSquareColor(state, action: PayloadAction<string>) {
      state.darkSquareColor = action.payload;
    },
    setPieceStyle(state, action: PayloadAction<string>) {
      state.pieceStyle = action.payload;
    },
    // Convenience action to update all three at once
    setBoardColors(
      state,
      action: PayloadAction<{ light: string; dark: string }>
    ) {
      state.lightSquareColor = action.payload.light;
      state.darkSquareColor = action.payload.dark;
    },
    setAllBoardSettings(
      state,
      action: PayloadAction<Partial<BoardSettingsState>>
    ) {
      return { ...state, ...action.payload };
    },
  },
});

export const {
  setLightSquareColor,
  setDarkSquareColor,
  setPieceStyle,
  setBoardColors,
  setAllBoardSettings,
} = boardSettingsSlice.actions;

export default boardSettingsSlice.reducer;