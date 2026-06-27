import type { DriveStep } from 'driver.js'

// One tour per page. Keys usually match a route name; a couple of routes share a
// tour (the two editor routes, the player route).
export type TourKey =
  | 'home'
  | 'archive'
  | 'editor'
  | 'player'
  | 'settings'
  | 'my-puzzles'
  | 'profile'
  | 'collection'
  | 'series'
  | 'feed'

// Map a router route name to a tour key. Routes absent here (login, register,
// forgot-password, reset-password, oauth-callback, legal pages, owner edit views)
// have no first-visit tour.
export const ROUTE_TO_TOUR: Record<string, TourKey> = {
  home: 'home',
  archive: 'archive',
  'editor-new': 'editor',
  'editor-edit': 'editor',
  player: 'player',
  settings: 'settings',
  'my-puzzles': 'my-puzzles',
  profile: 'profile',
  collection: 'collection',
  series: 'series',
  feed: 'feed',
}

function step(
  el: string,
  title: string,
  description: string,
  opts: Partial<NonNullable<DriveStep['popover']>> = {},
): DriveStep {
  return {
    element: el,
    popover: { title, description, side: 'bottom', align: 'start', ...opts },
  }
}

// NB: user-facing copy must not use em-dashes (project rule). Commas and periods only.
export const TOURS: Record<TourKey, DriveStep[]> = {
  home: [
    step('[data-tour="nav-browse"]', 'Browse puzzles', 'Explore the archive to find puzzles by difficulty, type, and rating.', { side: 'bottom' }),
    step('[data-tour="nav-editor"]', 'Set your own', 'Ready to create? The editor has everything you need to build a puzzle.', { side: 'bottom' }),
    step('[data-tour="nav-help"]', 'Tips any time', 'Tap the help button on any page to replay its walkthrough.', { side: 'bottom', align: 'end' }),
  ],

  archive: [
    step('[data-tour="archive-tabs"]', 'Puzzles, collections, series', 'Switch between standalone puzzles and curated collections or series.', { side: 'bottom' }),
    step('[data-tour="archive-filters"]', 'Narrow it down', 'Filter by difficulty, constraint type, rating, and more.', { side: 'right' }),
    step('[data-tour="archive-toolbar"]', 'Search and sort', 'Search by name and sort to surface what you are after.', { side: 'bottom' }),
    step('[data-tour="archive-card"]', 'Open a puzzle', 'Click any card to read its details and start solving.', { side: 'top' }),
  ],

  editor: [
    step('[data-tour="editor-toolselector"]', 'Pick a tool', 'Start here. Choose digits, regions, lines, cages, and every constraint type you want to place.', { side: 'right' }),
    step('[data-tour="editor-grid"]', 'Build the grid', 'Place givens and constraints right on the grid. Selected cells get whatever tool is active.', { side: 'left' }),
    step('[data-tour="editor-newgrid"]', 'New grid', 'Resize the grid or start over from a blank board.', { side: 'bottom', align: 'start' }),
    step('[data-tour="editor-clear"]', 'Clear', 'Clear the digits and marks entered while testing, leaving the puzzle you built intact.', { side: 'bottom', align: 'start' }),
    step('[data-tour="editor-setsolution"]', 'Set the solution', 'Save the current grid as the puzzle solution. Shift-click to clear it if you set it by mistake.', { side: 'bottom', align: 'start' }),
    step('[data-tour="editor-viewsolution"]', 'View the solution', 'Load the saved solution onto the grid to double-check it.', { side: 'bottom', align: 'start' }),
    step('[data-tour="editor-modetoggle"]', 'Setting vs solving', 'Flip to Solving to test your puzzle the way a solver will, then flip back to keep setting.', { side: 'bottom' }),
    step('[data-tour="editor-save"]', 'Save your work', 'Save a draft as you go. Your first save creates the puzzle.', { side: 'bottom', align: 'end' }),
    step('[data-tour="editor-versions"]', 'Version history', 'Browse and restore earlier saved versions of this puzzle.', { side: 'bottom', align: 'end' }),
    step('[data-tour="editor-importexport"]', 'Import and export', 'Bring in a puzzle from JSON, or export yours to share or back up.', { side: 'bottom', align: 'end' }),
    step('[data-tour="editor-publish"]', 'Publish and share', 'Publish your puzzle and get a link to share it with solvers.', { side: 'bottom', align: 'end' }),
  ],

  player: [
    step('[data-tour="player-grid"]', 'Solve here', 'Click a cell, then type or tap a number to fill it in. Drag to select several cells at once.', { side: 'right' }),
    step('[data-tour="numpad-digits"]', 'Enter numbers', 'Use these buttons, or your keyboard, to place digits. Hit Delete to clear a cell.', { side: 'top' }),
    step('[data-tour="numpad-modes"]', 'Pencil marks and colors', 'Switch between full digits, corner marks, center marks, and cell colors. Pencil marks help you track candidates.', { side: 'top' }),
    step('[data-tour="player-rules"]', 'Read the rules', 'Each puzzle has its own rules. Check them here any time, especially for variant constraints.', { side: 'left' }),
    step('[data-tour="player-timer"]', 'Track your time', 'The timer runs while you solve. Pause it whenever you need a break.', { side: 'left' }),
    step('[data-tour="player-check"]', 'Check your work', 'Stuck or unsure? Check your solution and we will tell you whether it holds up.', { side: 'left' }),
    step('[data-tour="player-controls"]', 'More controls', 'Reset the grid, open settings, or start a shared collaborative solve from here.', { side: 'left' }),
  ],

  settings: [
    step('[data-tour="settings-profile"]', 'Your profile', 'Set your display name, bio, and avatar. This is what other solvers see.'),
    step('[data-tour="settings-privacy"]', 'Privacy', 'Choose what shows on your public profile, from solve history to favorites.'),
    step('[data-tour="settings-appearance"]', 'Appearance', 'Pick a theme or build your own. Changes apply everywhere and follow your account.'),
    step('[data-tour="settings-password"]', 'Password', 'Set or change the password you use to sign in.'),
    step('[data-tour="settings-connections"]', 'Connections', 'Link Google or Patreon so you can sign in with one tap.'),
    step('[data-tour="settings-data"]', 'Your data', 'Export everything we hold, or delete your account. Your data, your call.'),
    step('[data-tour="settings-tours"]', 'Replay these tips', 'Want a refresher? Replay any walkthrough, or turn tips off entirely, from here.'),
  ],

  'my-puzzles': [
    step('[data-tour="mypuzzles-new"]', 'Create a puzzle', 'Start a fresh puzzle, collection, or series here.', { side: 'bottom', align: 'end' }),
    step('[data-tour="mypuzzles-tabs"]', 'Your work', 'Find your drafts and published puzzles, grouped by type.', { side: 'bottom' }),
    step('[data-tour="mypuzzles-folders"]', 'Organize with folders', 'Group your puzzles and collections into folders. Drag an item onto a folder to file it away.', { side: 'right' }),
    step('[data-tour="toolbar-search"]', 'Search', 'Filter the list by title as you type.', { side: 'bottom', align: 'start' }),
    step('[data-tour="toolbar-constraints"]', 'Filter by constraint', 'Narrow the list to puzzles that use specific constraint types.', { side: 'bottom', align: 'end' }),
    step('[data-tour="toolbar-visibility"]', 'Filter by visibility', 'Show only drafts, or only public, unlisted, and other visibility states.', { side: 'bottom', align: 'end' }),
    step('[data-tour="toolbar-sort"]', 'Sort', 'Order by most recent, title, rating, or number of solves.', { side: 'bottom', align: 'end' }),
  ],

  profile: [
    step('[data-tour="profile-header"]', 'Public profile', 'This is how your profile looks to other solvers.', { side: 'bottom' }),
    step('[data-tour="profile-tabs"]', 'Browse the tabs', 'Switch between published work, solves, favorites, and activity, depending on what is shared.', { side: 'bottom' }),
  ],

  collection: [
    step('[data-tour="collection-header"]', 'About this collection', 'A curated set of puzzles. Solve them in order or jump around.', { side: 'bottom' }),
    step('[data-tour="collection-puzzles"]', 'The puzzles', 'Pick any puzzle to start. Timed collections feed a leaderboard.', { side: 'top' }),
  ],

  series: [
    step('[data-tour="series-header"]', 'About this series', 'An ongoing run of puzzles. Subscribe to follow new entries.', { side: 'bottom' }),
    step('[data-tour="series-puzzles"]', 'Entries', 'Browse every puzzle in the series here.', { side: 'top' }),
  ],

  feed: [
    step('[data-tour="feed-intro"]', 'Your updates', 'New puzzles and activity from setters and series you follow.', { side: 'bottom' }),
    step('[data-tour="feed-list"]', 'Latest first', 'The newest updates sit at the top. Click through to solve.', { side: 'top' }),
  ],
}

// Human-readable labels for the Settings "replay" list.
export const TOUR_LABELS: Record<TourKey, string> = {
  home: 'Home',
  archive: 'Browse archive',
  editor: 'Puzzle editor',
  player: 'Solving a puzzle',
  settings: 'Settings',
  'my-puzzles': 'My puzzles',
  profile: 'Profile',
  collection: 'Collections',
  series: 'Series',
  feed: 'Updates feed',
}
