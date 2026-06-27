/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type * as Types from './schema-types';

export * from './schema-types';
export type ChangePasswordMutationVariables = Exact<{
  currentPassword?: string | null | undefined;
  newPassword: string;
}>;


export type ChangePasswordMutation = { changePassword: { token: string | null, errors: Array<string>, user: { id: string, email: string | null, username: string, displayName: string, avatarUrl: string | null, bio: string | null, role: Types.UserRoleEnum, passwordSet: boolean | null, playerSettings: unknown, colorPalette: unknown, onboardingSeen: unknown, onboardingDisabled: boolean | null, activeThemeId: string | null, enableCustomStyles: boolean | null, profileVisibility: { solveHistory: Types.SolveHistoryVisibilityEnum, stats: boolean, favorites: boolean, subscriptions: boolean, activity: boolean }, puzzlePreferences: { includeSolutionInSudokupadExport: boolean, commentsRequireSolveDefault: boolean } | null, userThemes: Array<{ id: string, name: string, basePresetId: string, schemaVersion: number, appearance: unknown, constraints: unknown, position: number }> | null, oauthConnections: Array<{ provider: string, createdAt: string }> | null } | null } | null };

export type CreateUserThemeMutationVariables = Exact<{
  uid: string;
  attrs: Types.UserThemeAttrsInput;
}>;


export type CreateUserThemeMutation = { createUserTheme: { errors: Array<string>, userTheme: { id: string, name: string, basePresetId: string, schemaVersion: number, appearance: unknown, constraints: unknown, position: number } | null } | null };

export type DeleteAccountMutationVariables = Exact<{
  currentPassword?: string | null | undefined;
  confirmation?: string | null | undefined;
}>;


export type DeleteAccountMutation = { deleteAccount: { success: boolean, errors: Array<string> } | null };

export type DeleteUserThemeMutationVariables = Exact<{
  uid: string;
}>;


export type DeleteUserThemeMutation = { deleteUserTheme: { deletedId: string | null, errors: Array<string> } | null };

export type DisconnectOauthProviderMutationVariables = Exact<{
  provider: string;
}>;


export type DisconnectOauthProviderMutation = { disconnectOauthProvider: { errors: Array<string>, user: { id: string, email: string | null, username: string, displayName: string, avatarUrl: string | null, bio: string | null, role: Types.UserRoleEnum, passwordSet: boolean | null, playerSettings: unknown, colorPalette: unknown, onboardingSeen: unknown, onboardingDisabled: boolean | null, activeThemeId: string | null, enableCustomStyles: boolean | null, profileVisibility: { solveHistory: Types.SolveHistoryVisibilityEnum, stats: boolean, favorites: boolean, subscriptions: boolean, activity: boolean }, puzzlePreferences: { includeSolutionInSudokupadExport: boolean, commentsRequireSolveDefault: boolean } | null, userThemes: Array<{ id: string, name: string, basePresetId: string, schemaVersion: number, appearance: unknown, constraints: unknown, position: number }> | null, oauthConnections: Array<{ provider: string, createdAt: string }> | null } | null } | null };

export type PrepareOauthConnectMutationVariables = Exact<{
  provider: string;
}>;


export type PrepareOauthConnectMutation = { prepareOauthConnect: { url: string | null, errors: Array<string> } | null };

export type RemoveAvatarMutationVariables = Exact<{ [key: string]: never; }>;


export type RemoveAvatarMutation = { removeAvatar: { errors: Array<string>, user: { id: string, email: string | null, username: string, displayName: string, avatarUrl: string | null, bio: string | null, role: Types.UserRoleEnum, passwordSet: boolean | null, playerSettings: unknown, colorPalette: unknown, onboardingSeen: unknown, onboardingDisabled: boolean | null, activeThemeId: string | null, enableCustomStyles: boolean | null, profileVisibility: { solveHistory: Types.SolveHistoryVisibilityEnum, stats: boolean, favorites: boolean, subscriptions: boolean, activity: boolean }, puzzlePreferences: { includeSolutionInSudokupadExport: boolean, commentsRequireSolveDefault: boolean } | null, userThemes: Array<{ id: string, name: string, basePresetId: string, schemaVersion: number, appearance: unknown, constraints: unknown, position: number }> | null, oauthConnections: Array<{ provider: string, createdAt: string }> | null } | null } | null };

export type UpdateOnboardingMutationVariables = Exact<{
  onboardingSeen?: unknown;
  onboardingDisabled?: boolean | null | undefined;
}>;


export type UpdateOnboardingMutation = { updateOnboarding: { errors: Array<string>, user: { id: string, email: string | null, username: string, displayName: string, avatarUrl: string | null, bio: string | null, role: Types.UserRoleEnum, passwordSet: boolean | null, playerSettings: unknown, colorPalette: unknown, onboardingSeen: unknown, onboardingDisabled: boolean | null, activeThemeId: string | null, enableCustomStyles: boolean | null, profileVisibility: { solveHistory: Types.SolveHistoryVisibilityEnum, stats: boolean, favorites: boolean, subscriptions: boolean, activity: boolean }, puzzlePreferences: { includeSolutionInSudokupadExport: boolean, commentsRequireSolveDefault: boolean } | null, userThemes: Array<{ id: string, name: string, basePresetId: string, schemaVersion: number, appearance: unknown, constraints: unknown, position: number }> | null, oauthConnections: Array<{ provider: string, createdAt: string }> | null } | null } | null };

export type UpdatePlayerPrefsMutationVariables = Exact<{
  playerSettings?: unknown;
  colorPalette?: unknown;
}>;


export type UpdatePlayerPrefsMutation = { updatePlayerPrefs: { errors: Array<string>, user: { id: string, email: string | null, username: string, displayName: string, avatarUrl: string | null, bio: string | null, role: Types.UserRoleEnum, passwordSet: boolean | null, playerSettings: unknown, colorPalette: unknown, onboardingSeen: unknown, onboardingDisabled: boolean | null, activeThemeId: string | null, enableCustomStyles: boolean | null, profileVisibility: { solveHistory: Types.SolveHistoryVisibilityEnum, stats: boolean, favorites: boolean, subscriptions: boolean, activity: boolean }, puzzlePreferences: { includeSolutionInSudokupadExport: boolean, commentsRequireSolveDefault: boolean } | null, userThemes: Array<{ id: string, name: string, basePresetId: string, schemaVersion: number, appearance: unknown, constraints: unknown, position: number }> | null, oauthConnections: Array<{ provider: string, createdAt: string }> | null } | null } | null };

export type UpdateProfileMutationVariables = Exact<{
  username?: string | null | undefined;
  displayName?: string | null | undefined;
  bio?: string | null | undefined;
}>;


export type UpdateProfileMutation = { updateProfile: { errors: Array<string>, user: { id: string, email: string | null, username: string, displayName: string, avatarUrl: string | null, bio: string | null, role: Types.UserRoleEnum, passwordSet: boolean | null, playerSettings: unknown, colorPalette: unknown, onboardingSeen: unknown, onboardingDisabled: boolean | null, activeThemeId: string | null, enableCustomStyles: boolean | null, profileVisibility: { solveHistory: Types.SolveHistoryVisibilityEnum, stats: boolean, favorites: boolean, subscriptions: boolean, activity: boolean }, puzzlePreferences: { includeSolutionInSudokupadExport: boolean, commentsRequireSolveDefault: boolean } | null, userThemes: Array<{ id: string, name: string, basePresetId: string, schemaVersion: number, appearance: unknown, constraints: unknown, position: number }> | null, oauthConnections: Array<{ provider: string, createdAt: string }> | null } | null } | null };

export type UpdateProfileVisibilityMutationVariables = Exact<{
  attrs: Types.ProfileVisibilityInput;
}>;


export type UpdateProfileVisibilityMutation = { updateProfileVisibility: { errors: Array<string>, user: { id: string, email: string | null, username: string, displayName: string, avatarUrl: string | null, bio: string | null, role: Types.UserRoleEnum, passwordSet: boolean | null, playerSettings: unknown, colorPalette: unknown, onboardingSeen: unknown, onboardingDisabled: boolean | null, activeThemeId: string | null, enableCustomStyles: boolean | null, profileVisibility: { solveHistory: Types.SolveHistoryVisibilityEnum, stats: boolean, favorites: boolean, subscriptions: boolean, activity: boolean }, puzzlePreferences: { includeSolutionInSudokupadExport: boolean, commentsRequireSolveDefault: boolean } | null, userThemes: Array<{ id: string, name: string, basePresetId: string, schemaVersion: number, appearance: unknown, constraints: unknown, position: number }> | null, oauthConnections: Array<{ provider: string, createdAt: string }> | null } | null } | null };

export type UpdatePuzzlePreferencesMutationVariables = Exact<{
  attrs: Types.PuzzlePreferencesInput;
}>;


export type UpdatePuzzlePreferencesMutation = { updatePuzzlePreferences: { errors: Array<string>, user: { id: string, email: string | null, username: string, displayName: string, avatarUrl: string | null, bio: string | null, role: Types.UserRoleEnum, passwordSet: boolean | null, playerSettings: unknown, colorPalette: unknown, onboardingSeen: unknown, onboardingDisabled: boolean | null, activeThemeId: string | null, enableCustomStyles: boolean | null, profileVisibility: { solveHistory: Types.SolveHistoryVisibilityEnum, stats: boolean, favorites: boolean, subscriptions: boolean, activity: boolean }, puzzlePreferences: { includeSolutionInSudokupadExport: boolean, commentsRequireSolveDefault: boolean } | null, userThemes: Array<{ id: string, name: string, basePresetId: string, schemaVersion: number, appearance: unknown, constraints: unknown, position: number }> | null, oauthConnections: Array<{ provider: string, createdAt: string }> | null } | null } | null };

export type UpdateThemePreferencesMutationVariables = Exact<{
  activeThemeId?: string | null | undefined;
  enableCustomStyles?: boolean | null | undefined;
}>;


export type UpdateThemePreferencesMutation = { updateThemePreferences: { errors: Array<string>, user: { id: string, email: string | null, username: string, displayName: string, avatarUrl: string | null, bio: string | null, role: Types.UserRoleEnum, passwordSet: boolean | null, playerSettings: unknown, colorPalette: unknown, onboardingSeen: unknown, onboardingDisabled: boolean | null, activeThemeId: string | null, enableCustomStyles: boolean | null, profileVisibility: { solveHistory: Types.SolveHistoryVisibilityEnum, stats: boolean, favorites: boolean, subscriptions: boolean, activity: boolean }, puzzlePreferences: { includeSolutionInSudokupadExport: boolean, commentsRequireSolveDefault: boolean } | null, userThemes: Array<{ id: string, name: string, basePresetId: string, schemaVersion: number, appearance: unknown, constraints: unknown, position: number }> | null, oauthConnections: Array<{ provider: string, createdAt: string }> | null } | null } | null };

export type UpdateUserThemeMutationVariables = Exact<{
  uid: string;
  attrs: Types.UserThemeAttrsInput;
}>;


export type UpdateUserThemeMutation = { updateUserTheme: { errors: Array<string>, userTheme: { id: string, name: string, basePresetId: string, schemaVersion: number, appearance: unknown, constraints: unknown, position: number } | null } | null };

export type UploadAvatarMutationVariables = Exact<{
  file: File;
}>;


export type UploadAvatarMutation = { uploadAvatar: { errors: Array<string>, user: { id: string, email: string | null, username: string, displayName: string, avatarUrl: string | null, bio: string | null, role: Types.UserRoleEnum, passwordSet: boolean | null, playerSettings: unknown, colorPalette: unknown, onboardingSeen: unknown, onboardingDisabled: boolean | null, activeThemeId: string | null, enableCustomStyles: boolean | null, profileVisibility: { solveHistory: Types.SolveHistoryVisibilityEnum, stats: boolean, favorites: boolean, subscriptions: boolean, activity: boolean }, puzzlePreferences: { includeSolutionInSudokupadExport: boolean, commentsRequireSolveDefault: boolean } | null, userThemes: Array<{ id: string, name: string, basePresetId: string, schemaVersion: number, appearance: unknown, constraints: unknown, position: number }> | null, oauthConnections: Array<{ provider: string, createdAt: string }> | null } | null } | null };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: { id: string, email: string | null, username: string, displayName: string, avatarUrl: string | null, bio: string | null, role: Types.UserRoleEnum, passwordSet: boolean | null, playerSettings: unknown, colorPalette: unknown, onboardingSeen: unknown, onboardingDisabled: boolean | null, activeThemeId: string | null, enableCustomStyles: boolean | null, profileVisibility: { solveHistory: Types.SolveHistoryVisibilityEnum, stats: boolean, favorites: boolean, subscriptions: boolean, activity: boolean }, puzzlePreferences: { includeSolutionInSudokupadExport: boolean, commentsRequireSolveDefault: boolean } | null, userThemes: Array<{ id: string, name: string, basePresetId: string, schemaVersion: number, appearance: unknown, constraints: unknown, position: number }> | null, oauthConnections: Array<{ provider: string, createdAt: string }> | null } | null };

export type AddPuzzleToCollectionMutationVariables = Exact<{
  collectionId: string | number;
  puzzleId: string | number;
}>;


export type AddPuzzleToCollectionMutation = { addPuzzleToCollection: { errors: Array<string>, collection: { id: string, puzzles: Array<{ id: string, title: string, status: Types.PuzzleStatusEnum, visibility: Types.PuzzleVisibilityEnum }> } | null } | null };

export type CreateCollectionMutationVariables = Exact<{
  title: string;
}>;


export type CreateCollectionMutation = { createCollection: { errors: Array<string>, collection: { id: string, title: string, visibility: Types.CollectionVisibilityEnum, mode: Types.CollectionModeEnum, puzzleCount: number, avgRating: number | null, solveCount: number, shareToken: string | null, folder: { id: string, name: string } | null } | null } | null };

export type CreateFolderMutationVariables = Exact<{
  name: string;
  parentId?: string | number | null | undefined;
}>;


export type CreateFolderMutation = { createFolder: { errors: Array<string>, folder: { id: string, name: string, parentId: string | null, puzzleCount: number, collectionCount: number } | null } | null };

export type DeleteCollectionMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteCollectionMutation = { deleteCollection: { success: boolean, errors: Array<string> } | null };

export type DeleteFolderMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteFolderMutation = { deleteFolder: { success: boolean, errors: Array<string> } | null };

export type MoveCollectionToFolderMutationVariables = Exact<{
  collectionId: string | number;
  folderId?: string | number | null | undefined;
}>;


export type MoveCollectionToFolderMutation = { moveCollectionToFolder: { errors: Array<string>, collection: { id: string, folder: { id: string, name: string } | null } | null } | null };

export type MoveFolderMutationVariables = Exact<{
  id: string | number;
  parentId?: string | number | null | undefined;
}>;


export type MoveFolderMutation = { moveFolder: { errors: Array<string>, folder: { id: string, parentId: string | null } | null } | null };

export type MovePuzzleToFolderMutationVariables = Exact<{
  puzzleId: string | number;
  folderId?: string | number | null | undefined;
}>;


export type MovePuzzleToFolderMutation = { movePuzzleToFolder: { errors: Array<string>, puzzle: { id: string, folder: { id: string, name: string } | null } | null } | null };

export type RecordCollectionSolveTimeMutationVariables = Exact<{
  collectionId: string | number;
  puzzleId: string | number;
  seconds: number;
}>;


export type RecordCollectionSolveTimeMutation = { recordCollectionSolveTime: { recorded: boolean, errors: Array<string> } | null };

export type RemovePuzzleFromCollectionMutationVariables = Exact<{
  collectionId: string | number;
  puzzleId: string | number;
}>;


export type RemovePuzzleFromCollectionMutation = { removePuzzleFromCollection: { errors: Array<string>, collection: { id: string, puzzles: Array<{ id: string, title: string, status: Types.PuzzleStatusEnum, visibility: Types.PuzzleVisibilityEnum }> } | null } | null };

export type RenameFolderMutationVariables = Exact<{
  id: string | number;
  name: string;
}>;


export type RenameFolderMutation = { renameFolder: { errors: Array<string>, folder: { id: string, name: string, puzzleCount: number } | null } | null };

export type ReorderCollectionPuzzlesMutationVariables = Exact<{
  collectionId: string | number;
  orderedPuzzleIds: Array<string | number> | string | number;
}>;


export type ReorderCollectionPuzzlesMutation = { reorderCollectionPuzzles: { errors: Array<string>, collection: { id: string, puzzles: Array<{ id: string }> } | null } | null };

export type UpdateCollectionMutationVariables = Exact<{
  id: string | number;
  title?: string | null | undefined;
  description?: string | null | undefined;
  visibility?: Types.CollectionVisibilityEnum | null | undefined;
  mode?: Types.CollectionModeEnum | null | undefined;
  timed?: boolean | null | undefined;
}>;


export type UpdateCollectionMutation = { updateCollection: { errors: Array<string>, collection: { id: string, title: string, description: string | null, visibility: Types.CollectionVisibilityEnum, mode: Types.CollectionModeEnum, timed: boolean } | null } | null };

export type CollectionByTokenPublicQueryVariables = Exact<{
  token: string;
}>;


export type CollectionByTokenPublicQuery = { collectionByToken: { id: string, title: string, description: string | null, mode: Types.CollectionModeEnum, timed: boolean, author: { id: string, username: string, displayName: string }, puzzles: Array<{ id: string, title: string, shareToken: string | null, constraintTypes: Array<string>, avgRating: number | null, solveCount: number }> } | null };

export type CollectionDetailQueryVariables = Exact<{
  id: string | number;
}>;


export type CollectionDetailQuery = { collection: { id: string, title: string, description: string | null, visibility: Types.CollectionVisibilityEnum, mode: Types.CollectionModeEnum, timed: boolean, shareToken: string | null, puzzles: Array<{ id: string, title: string, status: Types.PuzzleStatusEnum, visibility: Types.PuzzleVisibilityEnum }> } | null };

export type CollectionLeaderboardQueryVariables = Exact<{
  collectionId: string | number;
}>;


export type CollectionLeaderboardQuery = { collectionLeaderboard: Array<{ rank: number, username: string, displayName: string, totalSeconds: number }> };

export type CollectionPublicQueryVariables = Exact<{
  id: string | number;
}>;


export type CollectionPublicQuery = { collection: { id: string, title: string, description: string | null, mode: Types.CollectionModeEnum, timed: boolean, author: { id: string, username: string, displayName: string }, puzzles: Array<{ id: string, title: string, shareToken: string | null, constraintTypes: Array<string>, avgRating: number | null, solveCount: number }> } | null };

export type CollectionsQueryVariables = Exact<{
  filter?: Types.ListingFilterInput | null | undefined;
}>;


export type CollectionsQuery = { collections: { nodes: Array<{ id: string, title: string, visibility: Types.CollectionVisibilityEnum, mode: Types.CollectionModeEnum, puzzleCount: number, avgRating: number | null, solveCount: number, author: { id: string, username: string, displayName: string, setterTier: Types.SetterTierEnum } }>, pageInfo: { page: number, perPage: number, totalCount: number, totalPages: number, hasNextPage: boolean, hasPreviousPage: boolean } } };

export type MyCollectionsQueryVariables = Exact<{
  filter?: Types.ListingFilterInput | null | undefined;
}>;


export type MyCollectionsQuery = { myCollections: { nodes: Array<{ id: string, title: string, visibility: Types.CollectionVisibilityEnum, mode: Types.CollectionModeEnum, puzzleCount: number, avgRating: number | null, solveCount: number, shareToken: string | null, folder: { id: string, name: string } | null }>, pageInfo: { page: number, perPage: number, totalCount: number, totalPages: number, hasNextPage: boolean, hasPreviousPage: boolean } } };

export type MyFolderTreeQueryVariables = Exact<{ [key: string]: never; }>;


export type MyFolderTreeQuery = { myFolderTree: Array<{ id: string, name: string, parentId: string | null, position: number, puzzleCount: number, collectionCount: number, children: Array<{ id: string, name: string, parentId: string | null, position: number, puzzleCount: number, collectionCount: number, children: Array<{ id: string, name: string, parentId: string | null, position: number, puzzleCount: number, collectionCount: number, children: Array<{ id: string, name: string, parentId: string | null, position: number, puzzleCount: number, collectionCount: number, children: Array<{ id: string, name: string, parentId: string | null, position: number, puzzleCount: number, collectionCount: number }> }> }> }> }> };

export type FolderNodeFragment = { id: string, name: string, parentId: string | null, position: number, puzzleCount: number, collectionCount: number };

export type MyFoldersQueryVariables = Exact<{ [key: string]: never; }>;


export type MyFoldersQuery = { myFolders: Array<{ id: string, name: string, puzzleCount: number }> };

export type CollectionCardFieldsFragment = { id: string, title: string, visibility: Types.CollectionVisibilityEnum, mode: Types.CollectionModeEnum, puzzleCount: number, avgRating: number | null, solveCount: number, author: { id: string, username: string, displayName: string, setterTier: Types.SetterTierEnum } };

export type CollectionPublicFieldsFragment = { id: string, title: string, description: string | null, mode: Types.CollectionModeEnum, timed: boolean, author: { id: string, username: string, displayName: string }, puzzles: Array<{ id: string, title: string, shareToken: string | null, constraintTypes: Array<string>, avgRating: number | null, solveCount: number }> };

export type CollectionSummaryFragment = { id: string, title: string, visibility: Types.CollectionVisibilityEnum, mode: Types.CollectionModeEnum, puzzleCount: number, avgRating: number | null, solveCount: number, shareToken: string | null, folder: { id: string, name: string } | null };

export type CommentFieldsFragment = { id: string, body: string, createdAt: string, commenterSolved: boolean, isAuthor: boolean, user: { id: string, username: string, displayName: string, avatarUrl: string | null } };

export type PageInfoFieldsFragment = { page: number, perPage: number, totalCount: number, totalPages: number, hasNextPage: boolean, hasPreviousPage: boolean };

export type PublicUserFieldsFragment = { id: string, username: string, displayName: string, avatarUrl: string | null, bio: string | null, role: Types.UserRoleEnum, createdAt: string, setterTier: Types.SetterTierEnum, setterScore: number, puzzleCount: number, publicCollectionCount: number, publicSeriesCount: number, solveCount: number, profileVisibility: { solveHistory: Types.SolveHistoryVisibilityEnum, stats: boolean, favorites: boolean, subscriptions: boolean, activity: boolean }, profileStats: { collectionCount: number, seriesCount: number, totalSolvesReceived: number, totalFavoritesReceived: number, avgRatingReceived: number | null, reviewsReceivedCount: number, joinedAt: string } | null };

export type PuzzleAdminFieldsFragment = { id: string, status: Types.PuzzleStatusEnum, visibility: Types.PuzzleVisibilityEnum, shareToken: string | null, pageDescriptionHtml: string | null, commentsRequireSolveOverride: boolean | null, publishedVersion: { id: string } | null, grantedUsers: Array<{ id: string, username: string, displayName: string }> };

export type PuzzleCardFieldsFragment = { id: string, title: string, constraintTypes: Array<string>, avgRating: number | null, effectiveDifficulty: number | null, solveCount: number, featured: boolean, authorName: string | null, grid: { rows: number, cols: number }, author: { id: string, username: string, displayName: string, setterTier: Types.SetterTierEnum } };

export type PuzzleDescriptionFieldsFragment = { id: string, title: string, authorName: string | null, description: string | null, pageDescriptionHtml: string | null, status: Types.PuzzleStatusEnum, visibility: Types.PuzzleVisibilityEnum, shareToken: string | null, publishedAt: string | null, effectiveDifficulty: number | null, avgRating: number | null, solveCount: number, favoriteCount: number, constraintTypes: Array<string>, sudokupadUrl: string | null, sudokupadIncludesSolution: boolean, commentsRequireSolveEffective: boolean, viewerHasSolved: boolean, isFavorited: boolean, grid: { rows: number, cols: number }, author: { id: string, username: string, displayName: string, avatarUrl: string | null }, publishedVersion: { id: string, definition: unknown, solutionHash: string | null } | null, myRating: { stars: number | null, difficultyVote: number | null } | null, comments: Array<{ id: string, body: string, createdAt: string, commenterSolved: boolean, isAuthor: boolean, replies: Array<{ id: string, body: string, createdAt: string, commenterSolved: boolean, isAuthor: boolean, user: { id: string, username: string, displayName: string, avatarUrl: string | null } }>, user: { id: string, username: string, displayName: string, avatarUrl: string | null } }> };

export type SeriesCardFieldsFragment = { id: string, title: string, visibility: Types.SeriesVisibilityEnum, entryCount: number, subscriberCount: number, avgRating: number | null, solveCount: number, author: { id: string, username: string, displayName: string, setterTier: Types.SetterTierEnum } };

export type SeriesEntryFieldsFragment = { id: string, position: number, entryType: string, released: boolean, releasedAt: string | null, puzzle: { id: string, title: string, shareToken: string | null, status: Types.PuzzleStatusEnum, visibility: Types.PuzzleVisibilityEnum, avgRating: number | null } | null, collection: { id: string, title: string, shareToken: string | null, visibility: Types.CollectionVisibilityEnum, puzzleCount: number } | null };

export type SeriesSummaryFragment = { id: string, title: string, visibility: Types.SeriesVisibilityEnum, entryCount: number, subscriberCount: number, avgRating: number | null, solveCount: number, shareToken: string | null };

export type UserFieldsFragment = { id: string, email: string | null, username: string, displayName: string, avatarUrl: string | null, bio: string | null, role: Types.UserRoleEnum, passwordSet: boolean | null, playerSettings: unknown, colorPalette: unknown, onboardingSeen: unknown, onboardingDisabled: boolean | null, activeThemeId: string | null, enableCustomStyles: boolean | null, profileVisibility: { solveHistory: Types.SolveHistoryVisibilityEnum, stats: boolean, favorites: boolean, subscriptions: boolean, activity: boolean }, puzzlePreferences: { includeSolutionInSudokupadExport: boolean, commentsRequireSolveDefault: boolean } | null, userThemes: Array<{ id: string, name: string, basePresetId: string, schemaVersion: number, appearance: unknown, constraints: unknown, position: number }> | null, oauthConnections: Array<{ provider: string, createdAt: string }> | null };

export type UserThemeFieldsFragment = { id: string, name: string, basePresetId: string, schemaVersion: number, appearance: unknown, constraints: unknown, position: number };

export type VersionFullFragment = { definition: unknown, solution: unknown, solutionHash: string | null, solveMessage: string | null, id: string, versionNumber: number, displayName: string, label: string | null, isPublished: boolean, constraintTypes: Array<string>, createdAt: string };

export type VersionSummaryFragment = { id: string, versionNumber: number, displayName: string, label: string | null, isPublished: boolean, constraintTypes: Array<string>, createdAt: string };

export type CheckSolutionMutationVariables = Exact<{
  puzzleId: string | number;
  board: unknown;
  shareToken?: string | null | undefined;
}>;


export type CheckSolutionMutation = { checkSolution: { result: Types.CheckResultEnum } | null };

export type ConfigurePuzzlePageMutationVariables = Exact<{
  puzzleId: string | number;
  commentsRequireSolveOverride?: boolean | null | undefined;
}>;


export type ConfigurePuzzlePageMutation = { configurePuzzlePage: { errors: Array<string>, puzzle: { id: string, status: Types.PuzzleStatusEnum, visibility: Types.PuzzleVisibilityEnum, shareToken: string | null, pageDescriptionHtml: string | null, commentsRequireSolveOverride: boolean | null, publishedVersion: { id: string } | null, grantedUsers: Array<{ id: string, username: string, displayName: string }> } | null } | null };

export type CreatePuzzleMutationVariables = Exact<{
  title: string;
  gridRows?: number | null | undefined;
  gridCols?: number | null | undefined;
}>;


export type CreatePuzzleMutation = { createPuzzle: { errors: Array<string>, puzzle: { id: string, title: string, shareToken: string | null } | null } | null };

export type DeletePuzzleMutationVariables = Exact<{
  id: string | number;
}>;


export type DeletePuzzleMutation = { deletePuzzle: { success: boolean, errors: Array<string> } | null };

export type DeletePuzzleVersionMutationVariables = Exact<{
  id: string | number;
}>;


export type DeletePuzzleVersionMutation = { deletePuzzleVersion: { success: boolean, errors: Array<string> } | null };

export type ExportSudokupadLinkMutationVariables = Exact<{
  definition: unknown;
  solution?: unknown;
  includeSolution?: boolean | null | undefined;
}>;


export type ExportSudokupadLinkMutation = { exportSudokupadLink: { url: string | null, warnings: Array<string>, errors: Array<string> } | null };

export type GeneratePlayShareTokenMutationVariables = Exact<{
  puzzlePlayId?: string | number | null | undefined;
  puzzleId?: string | number | null | undefined;
  seed?: unknown;
  singleUse?: boolean | null | undefined;
}>;


export type GeneratePlayShareTokenMutation = { generatePlayShareToken: { errors: Array<string>, puzzlePlay: { id: string } | null, shareToken: { id: string, token: string, singleUse: boolean, consumed: boolean } | null } | null };

export type GrantPuzzleAccessMutationVariables = Exact<{
  puzzleId: string | number;
  username: string;
}>;


export type GrantPuzzleAccessMutation = { grantPuzzleAccess: { errors: Array<string>, puzzle: { id: string, status: Types.PuzzleStatusEnum, visibility: Types.PuzzleVisibilityEnum, shareToken: string | null, pageDescriptionHtml: string | null, commentsRequireSolveOverride: boolean | null, publishedVersion: { id: string } | null, grantedUsers: Array<{ id: string, username: string, displayName: string }> } | null } | null };

export type JoinPlaySessionMutationVariables = Exact<{
  token: string;
}>;


export type JoinPlaySessionMutation = { joinPlaySession: { errors: Array<string>, puzzlePlay: { id: string, cellState: unknown, progressState: unknown, timeElapsedSeconds: number | null, isSolved: boolean, puzzle: { id: string } } | null } | null };

export type KickParticipantMutationVariables = Exact<{
  puzzlePlayId: string | number;
  actorId: string;
  block?: boolean | null | undefined;
}>;


export type KickParticipantMutation = { kickParticipant: { success: boolean, errors: Array<string> } | null };

export type PublishPuzzleVersionMutationVariables = Exact<{
  puzzleId: string | number;
  versionId: string | number;
  visibility?: Types.PuzzleVisibilityEnum | null | undefined;
}>;


export type PublishPuzzleVersionMutation = { publishPuzzleVersion: { errors: Array<string>, puzzle: { id: string, status: Types.PuzzleStatusEnum, visibility: Types.PuzzleVisibilityEnum, shareToken: string | null, pageDescriptionHtml: string | null, commentsRequireSolveOverride: boolean | null, publishedVersion: { id: string } | null, grantedUsers: Array<{ id: string, username: string, displayName: string }> } | null } | null };

export type RevealSolveMessageMutationVariables = Exact<{
  puzzleId: string | number;
  solutionHash: string;
  shareToken?: string | null | undefined;
}>;


export type RevealSolveMessageMutation = { revealSolveMessage: { correct: boolean, solveMessage: string | null } | null };

export type RevokePlaySessionMutationVariables = Exact<{
  puzzlePlayId: string | number;
}>;


export type RevokePlaySessionMutation = { revokePlaySession: { errors: Array<string>, puzzlePlay: { id: string } | null } | null };

export type RevokePuzzleAccessMutationVariables = Exact<{
  puzzleId: string | number;
  userId: string | number;
}>;


export type RevokePuzzleAccessMutation = { revokePuzzleAccess: { errors: Array<string>, puzzle: { id: string, status: Types.PuzzleStatusEnum, visibility: Types.PuzzleVisibilityEnum, shareToken: string | null, pageDescriptionHtml: string | null, commentsRequireSolveOverride: boolean | null, publishedVersion: { id: string } | null, grantedUsers: Array<{ id: string, username: string, displayName: string }> } | null } | null };

export type SaveProgressMutationVariables = Exact<{
  puzzlePlayId: string | number;
  cellState: unknown;
  timeElapsedSeconds: number;
  progressState: unknown;
}>;


export type SaveProgressMutation = { saveProgress: { errors: Array<string>, puzzlePlay: { id: string } | null } | null };

export type SavePuzzleVersionMutationVariables = Exact<{
  puzzleId: string | number;
  definition: unknown;
  solution?: unknown;
  solveMessage?: string | null | undefined;
  label?: string | null | undefined;
}>;


export type SavePuzzleVersionMutation = { savePuzzleVersion: { errors: Array<string>, version: { id: string, versionNumber: number, displayName: string, label: string | null, isPublished: boolean, constraintTypes: Array<string>, createdAt: string } | null } | null };

export type SetPuzzleVisibilityMutationVariables = Exact<{
  id: string | number;
  visibility: Types.PuzzleVisibilityEnum;
}>;


export type SetPuzzleVisibilityMutation = { setPuzzleVisibility: { errors: Array<string>, puzzle: { id: string, status: Types.PuzzleStatusEnum, visibility: Types.PuzzleVisibilityEnum, shareToken: string | null, pageDescriptionHtml: string | null, commentsRequireSolveOverride: boolean | null, publishedVersion: { id: string } | null, grantedUsers: Array<{ id: string, username: string, displayName: string }> } | null } | null };

export type StartPlayMutationVariables = Exact<{
  puzzleId: string | number;
}>;


export type StartPlayMutation = { startPlay: { errors: Array<string>, puzzlePlay: { id: string, cellState: unknown, progressState: unknown, timeElapsedSeconds: number | null, isSolved: boolean } | null } | null };

export type UnpublishPuzzleMutationVariables = Exact<{
  id: string | number;
}>;


export type UnpublishPuzzleMutation = { unpublishPuzzle: { errors: Array<string>, puzzle: { id: string, status: Types.PuzzleStatusEnum, visibility: Types.PuzzleVisibilityEnum, shareToken: string | null, pageDescriptionHtml: string | null, commentsRequireSolveOverride: boolean | null, publishedVersion: { id: string } | null, grantedUsers: Array<{ id: string, username: string, displayName: string }> } | null } | null };

export type UpdatePageDescriptionMutationVariables = Exact<{
  puzzleId: string | number;
  html: string;
}>;


export type UpdatePageDescriptionMutation = { updatePageDescription: { errors: Array<string>, puzzle: { id: string, status: Types.PuzzleStatusEnum, visibility: Types.PuzzleVisibilityEnum, shareToken: string | null, pageDescriptionHtml: string | null, commentsRequireSolveOverride: boolean | null, publishedVersion: { id: string } | null, grantedUsers: Array<{ id: string, username: string, displayName: string }> } | null } | null };

export type UpdatePuzzleMutationVariables = Exact<{
  id: string | number;
  attrs: Types.UpdatePuzzleAttrsInput;
}>;


export type UpdatePuzzleMutation = { updatePuzzle: { errors: Array<string>, puzzle: { id: string, authorDifficulty: number | null, effectiveDifficulty: number | null } | null } | null };

export type UpdatePuzzleVersionLabelMutationVariables = Exact<{
  id: string | number;
  label?: string | null | undefined;
}>;


export type UpdatePuzzleVersionLabelMutation = { updatePuzzleVersionLabel: { errors: Array<string>, version: { id: string, versionNumber: number, displayName: string, label: string | null, isPublished: boolean, constraintTypes: Array<string>, createdAt: string } | null } | null };

export type UploadDescriptionImageMutationVariables = Exact<{
  puzzleId: string | number;
  file: File;
}>;


export type UploadDescriptionImageMutation = { uploadDescriptionImage: { url: string | null, errors: Array<string> } | null };

export type MyPuzzlesQueryVariables = Exact<{
  filter?: Types.ListingFilterInput | null | undefined;
  status?: Types.PuzzleStatusEnum | null | undefined;
}>;


export type MyPuzzlesQuery = { myPuzzles: { nodes: Array<{ id: string, title: string, status: Types.PuzzleStatusEnum, visibility: Types.PuzzleVisibilityEnum, shareToken: string | null, avgRating: number | null, solveCount: number, folder: { id: string, name: string } | null, publishedVersion: { id: string, displayName: string } | null }>, pageInfo: { page: number, perPage: number, totalCount: number, totalPages: number, hasNextPage: boolean, hasPreviousPage: boolean } } };

export type PuzzleByTokenForPlayQueryVariables = Exact<{
  token: string;
}>;


export type PuzzleByTokenForPlayQuery = { puzzleByToken: { id: string, title: string, authorName: string | null, myRating: { stars: number | null, difficultyVote: number | null } | null, author: { id: string, username: string, displayName: string }, publishedVersion: { id: string, definition: unknown, solutionHash: string | null } | null } | null };

export type PuzzleDescriptionQueryVariables = Exact<{
  id: string | number;
}>;


export type PuzzleDescriptionQuery = { puzzle: { id: string, title: string, authorName: string | null, description: string | null, pageDescriptionHtml: string | null, status: Types.PuzzleStatusEnum, visibility: Types.PuzzleVisibilityEnum, shareToken: string | null, publishedAt: string | null, effectiveDifficulty: number | null, avgRating: number | null, solveCount: number, favoriteCount: number, constraintTypes: Array<string>, sudokupadUrl: string | null, sudokupadIncludesSolution: boolean, commentsRequireSolveEffective: boolean, viewerHasSolved: boolean, isFavorited: boolean, grid: { rows: number, cols: number }, author: { id: string, username: string, displayName: string, avatarUrl: string | null }, publishedVersion: { id: string, definition: unknown, solutionHash: string | null } | null, myRating: { stars: number | null, difficultyVote: number | null } | null, comments: Array<{ id: string, body: string, createdAt: string, commenterSolved: boolean, isAuthor: boolean, replies: Array<{ id: string, body: string, createdAt: string, commenterSolved: boolean, isAuthor: boolean, user: { id: string, username: string, displayName: string, avatarUrl: string | null } }>, user: { id: string, username: string, displayName: string, avatarUrl: string | null } }> } | null };

export type PuzzleDescriptionByTokenQueryVariables = Exact<{
  token: string;
}>;


export type PuzzleDescriptionByTokenQuery = { puzzleByToken: { id: string, title: string, authorName: string | null, description: string | null, pageDescriptionHtml: string | null, status: Types.PuzzleStatusEnum, visibility: Types.PuzzleVisibilityEnum, shareToken: string | null, publishedAt: string | null, effectiveDifficulty: number | null, avgRating: number | null, solveCount: number, favoriteCount: number, constraintTypes: Array<string>, sudokupadUrl: string | null, sudokupadIncludesSolution: boolean, commentsRequireSolveEffective: boolean, viewerHasSolved: boolean, isFavorited: boolean, grid: { rows: number, cols: number }, author: { id: string, username: string, displayName: string, avatarUrl: string | null }, publishedVersion: { id: string, definition: unknown, solutionHash: string | null } | null, myRating: { stars: number | null, difficultyVote: number | null } | null, comments: Array<{ id: string, body: string, createdAt: string, commenterSolved: boolean, isAuthor: boolean, replies: Array<{ id: string, body: string, createdAt: string, commenterSolved: boolean, isAuthor: boolean, user: { id: string, username: string, displayName: string, avatarUrl: string | null } }>, user: { id: string, username: string, displayName: string, avatarUrl: string | null } }> } | null };

export type PuzzleForEditQueryVariables = Exact<{
  id: string | number;
}>;


export type PuzzleForEditQuery = { puzzle: { title: string, description: string | null, authorDifficulty: number | null, id: string, status: Types.PuzzleStatusEnum, visibility: Types.PuzzleVisibilityEnum, shareToken: string | null, pageDescriptionHtml: string | null, commentsRequireSolveOverride: boolean | null, versions: Array<{ id: string, versionNumber: number, displayName: string, label: string | null, isPublished: boolean, constraintTypes: Array<string>, createdAt: string }>, publishedVersion: { id: string } | null, grantedUsers: Array<{ id: string, username: string, displayName: string }> } | null };

export type PuzzleForPlayQueryVariables = Exact<{
  id: string | number;
}>;


export type PuzzleForPlayQuery = { puzzle: { id: string, title: string, authorName: string | null, myRating: { stars: number | null, difficultyVote: number | null } | null, author: { id: string, username: string, displayName: string }, publishedVersion: { id: string, definition: unknown, solutionHash: string | null } | null } | null };

export type PuzzleGridSizesQueryVariables = Exact<{ [key: string]: never; }>;


export type PuzzleGridSizesQuery = { puzzleGridSizes: Array<{ rows: number, cols: number, count: number }> };

export type PuzzleVersionQueryVariables = Exact<{
  id: string | number;
}>;


export type PuzzleVersionQuery = { puzzleVersion: { definition: unknown, solution: unknown, solutionHash: string | null, solveMessage: string | null, id: string, versionNumber: number, displayName: string, label: string | null, isPublished: boolean, constraintTypes: Array<string>, createdAt: string } | null };

export type PuzzlesQueryVariables = Exact<{
  filter?: Types.ListingFilterInput | null | undefined;
}>;


export type PuzzlesQuery = { puzzles: { nodes: Array<{ id: string, title: string, constraintTypes: Array<string>, avgRating: number | null, effectiveDifficulty: number | null, solveCount: number, featured: boolean, authorName: string | null, grid: { rows: number, cols: number }, author: { id: string, username: string, displayName: string, setterTier: Types.SetterTierEnum } }>, pageInfo: { page: number, perPage: number, totalCount: number, totalPages: number, hasNextPage: boolean, hasPreviousPage: boolean } } };

export type ProgressUpdatedSubscriptionVariables = Exact<{
  puzzlePlayId: string | number;
}>;


export type ProgressUpdatedSubscription = { progressUpdated: { puzzlePlay: { id: string, cellState: unknown, progressState: unknown, timeElapsedSeconds: number | null, isSolved: boolean } } };

export type AddSeriesEntryMutationVariables = Exact<{
  seriesId: string | number;
  entryableType: string;
  entryableId: string | number;
}>;


export type AddSeriesEntryMutation = { addSeriesEntry: { errors: Array<string>, series: { id: string, entries: Array<{ id: string, position: number, entryType: string, released: boolean, releasedAt: string | null, puzzle: { id: string, title: string, shareToken: string | null, status: Types.PuzzleStatusEnum, visibility: Types.PuzzleVisibilityEnum, avgRating: number | null } | null, collection: { id: string, title: string, shareToken: string | null, visibility: Types.CollectionVisibilityEnum, puzzleCount: number } | null }> } | null } | null };

export type CreateSeriesMutationVariables = Exact<{
  title: string;
}>;


export type CreateSeriesMutation = { createSeries: { errors: Array<string>, series: { id: string, title: string, visibility: Types.SeriesVisibilityEnum, entryCount: number, subscriberCount: number, avgRating: number | null, solveCount: number, shareToken: string | null } | null } | null };

export type DeleteSeriesMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteSeriesMutation = { deleteSeries: { deletedId: string | null, errors: Array<string> } | null };

export type RemoveSeriesEntryMutationVariables = Exact<{
  entryId: string | number;
}>;


export type RemoveSeriesEntryMutation = { removeSeriesEntry: { errors: Array<string>, series: { id: string, entryCount: number } | null } | null };

export type ReorderSeriesEntriesMutationVariables = Exact<{
  seriesId: string | number;
  orderedEntryIds: Array<string | number> | string | number;
}>;


export type ReorderSeriesEntriesMutation = { reorderSeriesEntries: { errors: Array<string>, series: { id: string } | null } | null };

export type ScheduleSeriesEntryMutationVariables = Exact<{
  entryId: string | number;
  releasedAt?: string | null | undefined;
}>;


export type ScheduleSeriesEntryMutation = { scheduleSeriesEntry: { errors: Array<string>, entry: { id: string, released: boolean, releasedAt: string | null } | null } | null };

export type ToggleSeriesSubscriptionMutationVariables = Exact<{
  seriesId: string | number;
}>;


export type ToggleSeriesSubscriptionMutation = { toggleSeriesSubscription: { subscribed: boolean, subscriberCount: number } | null };

export type UpdateSeriesMutationVariables = Exact<{
  id: string | number;
  title?: string | null | undefined;
  description?: string | null | undefined;
  visibility?: Types.SeriesVisibilityEnum | null | undefined;
}>;


export type UpdateSeriesMutation = { updateSeries: { errors: Array<string>, series: { id: string, title: string, description: string | null, visibility: Types.SeriesVisibilityEnum } | null } | null };

export type MySeriesQueryVariables = Exact<{
  filter?: Types.ListingFilterInput | null | undefined;
}>;


export type MySeriesQuery = { mySeries: { nodes: Array<{ id: string, title: string, visibility: Types.SeriesVisibilityEnum, entryCount: number, subscriberCount: number, avgRating: number | null, solveCount: number, shareToken: string | null }>, pageInfo: { page: number, perPage: number, totalCount: number, totalPages: number, hasNextPage: boolean, hasPreviousPage: boolean } } };

export type MySubscriptionsQueryVariables = Exact<{ [key: string]: never; }>;


export type MySubscriptionsQuery = { mySubscriptions: Array<{ id: string, title: string, visibility: Types.SeriesVisibilityEnum, entryCount: number, subscriberCount: number, avgRating: number | null, solveCount: number, shareToken: string | null, author: { id: string, username: string, displayName: string } }> };

export type PublicSeriesQueryVariables = Exact<{
  filter?: Types.ListingFilterInput | null | undefined;
}>;


export type PublicSeriesQuery = { publicSeries: { nodes: Array<{ id: string, title: string, visibility: Types.SeriesVisibilityEnum, entryCount: number, subscriberCount: number, avgRating: number | null, solveCount: number, author: { id: string, username: string, displayName: string, setterTier: Types.SetterTierEnum } }>, pageInfo: { page: number, perPage: number, totalCount: number, totalPages: number, hasNextPage: boolean, hasPreviousPage: boolean } } };

export type SeriesByTokenPublicQueryVariables = Exact<{
  token: string;
}>;


export type SeriesByTokenPublicQuery = { seriesByToken: { id: string, title: string, description: string | null, visibility: Types.SeriesVisibilityEnum, subscribed: boolean, subscriberCount: number, author: { id: string, username: string, displayName: string }, entries: Array<{ id: string, position: number, entryType: string, released: boolean, releasedAt: string | null, puzzle: { id: string, title: string, shareToken: string | null, status: Types.PuzzleStatusEnum, visibility: Types.PuzzleVisibilityEnum, avgRating: number | null } | null, collection: { id: string, title: string, shareToken: string | null, visibility: Types.CollectionVisibilityEnum, puzzleCount: number } | null }> } | null };

export type SeriesDetailQueryVariables = Exact<{
  id: string | number;
}>;


export type SeriesDetailQuery = { series: { id: string, title: string, description: string | null, visibility: Types.SeriesVisibilityEnum, shareToken: string | null, subscriberCount: number, entries: Array<{ id: string, position: number, entryType: string, released: boolean, releasedAt: string | null, puzzle: { id: string, title: string, shareToken: string | null, status: Types.PuzzleStatusEnum, visibility: Types.PuzzleVisibilityEnum, avgRating: number | null } | null, collection: { id: string, title: string, shareToken: string | null, visibility: Types.CollectionVisibilityEnum, puzzleCount: number } | null }> } | null };

export type SeriesFeedQueryVariables = Exact<{ [key: string]: never; }>;


export type SeriesFeedQuery = { seriesFeed: Array<{ id: string, entryType: string, releasedAt: string | null, seriesId: string, seriesTitle: string | null, puzzle: { id: string, title: string, shareToken: string | null } | null, collection: { id: string, title: string, shareToken: string | null, puzzleCount: number } | null }> };

export type SeriesPublicQueryVariables = Exact<{
  id: string | number;
}>;


export type SeriesPublicQuery = { series: { id: string, title: string, description: string | null, visibility: Types.SeriesVisibilityEnum, subscribed: boolean, subscriberCount: number, author: { id: string, username: string, displayName: string }, entries: Array<{ id: string, position: number, entryType: string, released: boolean, releasedAt: string | null, puzzle: { id: string, title: string, shareToken: string | null, status: Types.PuzzleStatusEnum, visibility: Types.PuzzleVisibilityEnum, avgRating: number | null } | null, collection: { id: string, title: string, shareToken: string | null, visibility: Types.CollectionVisibilityEnum, puzzleCount: number } | null }> } | null };

export type CreateCommentMutationVariables = Exact<{
  puzzleId: string | number;
  body: string;
  parentId?: string | number | null | undefined;
}>;


export type CreateCommentMutation = { createComment: { errors: Array<string>, comment: { id: string, body: string, createdAt: string, commenterSolved: boolean, isAuthor: boolean, user: { id: string, username: string, displayName: string, avatarUrl: string | null } } | null } | null };

export type RatePuzzleMutationVariables = Exact<{
  puzzleId: string | number;
  stars?: number | null | undefined;
  difficultyVote?: number | null | undefined;
}>;


export type RatePuzzleMutation = { ratePuzzle: { errors: Array<string>, rating: { id: string, stars: number | null, difficultyVote: number | null } | null } | null };

export type TagsQueryVariables = Exact<{ [key: string]: never; }>;


export type TagsQuery = { tags: Array<{ id: string, name: string, slug: string }> };

export type ProfileActivityQueryVariables = Exact<{
  username: string;
  limit?: number | null | undefined;
}>;


export type ProfileActivityQuery = { user: { id: string, activity: Array<{ kind: Types.ProfileActivityKindEnum, occurredAt: string, puzzle: { id: string, title: string } | null, comment: { id: string, body: string, createdAt: string } | null }> } | null };

export type ProfileFavoritesQueryVariables = Exact<{
  username: string;
  filter?: Types.ListingFilterInput | null | undefined;
}>;


export type ProfileFavoritesQuery = { user: { id: string, favoritedPuzzles: { nodes: Array<{ id: string, title: string, constraintTypes: Array<string>, avgRating: number | null, effectiveDifficulty: number | null, solveCount: number, featured: boolean, authorName: string | null, grid: { rows: number, cols: number }, author: { id: string, username: string, displayName: string, setterTier: Types.SetterTierEnum } }>, pageInfo: { page: number, perPage: number, totalCount: number, totalPages: number, hasNextPage: boolean, hasPreviousPage: boolean } } } | null };

export type ProfileReviewsReceivedQueryVariables = Exact<{
  username: string;
  page?: number | null | undefined;
  perPage?: number | null | undefined;
}>;


export type ProfileReviewsReceivedQuery = { user: { id: string, reviewsReceived: { nodes: Array<{ id: string, body: string, createdAt: string, user: { id: string, username: string, displayName: string, avatarUrl: string | null }, puzzle: { id: string, title: string } }>, pageInfo: { page: number, perPage: number, totalCount: number, totalPages: number, hasNextPage: boolean, hasPreviousPage: boolean } } } | null };

export type ProfileSolvedPuzzlesQueryVariables = Exact<{
  username: string;
  filter?: Types.ListingFilterInput | null | undefined;
}>;


export type ProfileSolvedPuzzlesQuery = { user: { id: string, solvedPuzzles: { nodes: Array<{ puzzle: { id: string, title: string, constraintTypes: Array<string>, avgRating: number | null, effectiveDifficulty: number | null, solveCount: number, featured: boolean, authorName: string | null, grid: { rows: number, cols: number }, author: { id: string, username: string, displayName: string, setterTier: Types.SetterTierEnum } }, ownerRating: { stars: number | null, difficultyVote: number | null } | null, ownerReview: { id: string, body: string, createdAt: string } | null }>, pageInfo: { page: number, perPage: number, totalCount: number, totalPages: number, hasNextPage: boolean, hasPreviousPage: boolean } } } | null };

export type ProfileSubscribedSeriesQueryVariables = Exact<{
  username: string;
  filter?: Types.ListingFilterInput | null | undefined;
}>;


export type ProfileSubscribedSeriesQuery = { user: { id: string, subscribedSeries: { nodes: Array<{ id: string, title: string, visibility: Types.SeriesVisibilityEnum, entryCount: number, subscriberCount: number, avgRating: number | null, solveCount: number, author: { id: string, username: string, displayName: string, setterTier: Types.SetterTierEnum } }>, pageInfo: { page: number, perPage: number, totalCount: number, totalPages: number, hasNextPage: boolean, hasPreviousPage: boolean } } } | null };

export type ProfileUserQueryVariables = Exact<{
  username: string;
}>;


export type ProfileUserQuery = { user: { id: string, username: string, displayName: string, avatarUrl: string | null, bio: string | null, role: Types.UserRoleEnum, createdAt: string, setterTier: Types.SetterTierEnum, setterScore: number, puzzleCount: number, publicCollectionCount: number, publicSeriesCount: number, solveCount: number, profileVisibility: { solveHistory: Types.SolveHistoryVisibilityEnum, stats: boolean, favorites: boolean, subscriptions: boolean, activity: boolean }, profileStats: { collectionCount: number, seriesCount: number, totalSolvesReceived: number, totalFavoritesReceived: number, avgRatingReceived: number | null, reviewsReceivedCount: number, joinedAt: string } | null } | null };
