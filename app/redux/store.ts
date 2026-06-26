import { configureStore } from '@reduxjs/toolkit';
import boardSettingsReducer from './board-settings-slice';
export const store = configureStore({
  reducer: {
    boardSettings: boardSettingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;