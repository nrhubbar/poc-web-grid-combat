import { configureStore } from '@reduxjs/toolkit';
import gameReducer from './slice';


export const store = configureStore({
    reducer: {
        game: gameReducer,
    },
    devTools: {
        name: 'Grid Combat Game', // This will show up in the DevTools
        trace: true, // This will show the stack trace for each action
        traceLimit: 25, // Limit the stack trace to 25 frames
    },
    // middleware: (getDefaultMiddleware) =>
    //     getDefaultMiddleware({
    //         serializableCheck: false, // if you have non-serializable values
    //         immutableCheck: false, // if you have performance issues
    //     }),
});

// Add this for debugging
console.log('Store initialized:', store.getState());


// // Infer the `RootState` and `AppDispatch` types from the store itself
// export type RootState = ReturnType<typeof store.getState>
// // Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
// export type AppDispatch = typeof store.dispatch

// Get the type of our store variable
export type AppStore = typeof store
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = AppStore['dispatch']