export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

/** An address used to position an element */
export type Address = {
  __typename?: 'Address';
  /** Column Location */
  column: Scalars['Float']['output'];
  /** Row Location */
  row: Scalars['Float']['output'];
};

/** Input for the location of an element */
export type AddressInput = {
  /** Horizontal Location */
  column: Scalars['Float']['input'];
  /** Vertical Location */
  row: Scalars['Float']['input'];
};

/** Anti-Kropki Global Constraint Settings */
export type AntiKropki = {
  __typename?: 'AntiKropki';
  /** All black dots given */
  antiBlack: Scalars['Boolean']['output'];
  /** All white dots given (non-consecutive) */
  antiWhite: Scalars['Boolean']['output'];
};

/** Input for an Anti-Kropki Global Constraint */
export type AntiKropkiInput = {
  /** All black dots given */
  antiBlack: Scalars['Boolean']['input'];
  /** All white dots given */
  antiWhite: Scalars['Boolean']['input'];
};

/** Anti XV Global Setting */
export type AntiXv = {
  __typename?: 'AntiXV';
  /** All V's are given */
  antiV: Scalars['Boolean']['output'];
  /** All X's are given */
  antiX: Scalars['Boolean']['output'];
};

/** Input for an Anti-XV Global Constraint */
export type AntiXvInput = {
  /** All V's are given */
  antiV: Scalars['Boolean']['input'];
  /** All X's are given */
  antiX: Scalars['Boolean']['input'];
};

/** An Arrow clue */
export type Arrow = {
  __typename?: 'Arrow';
  /** Arrow circle cells */
  cells: Array<Address>;
  /** Arrow lines */
  lines: Array<Array<Address>>;
};

/** Input for an Arrow element */
export type ArrowInput = {
  /** Cells included in the Arrow Circle */
  circleCells: Array<AddressInput>;
  /** Arrow lines */
  lines: Array<Array<AddressInput>>;
};

/** Mutations related to app authentication */
export type AuthMutations = {
  /** Used to confirm an email with a token */
  confirmEmail?: Maybe<ConfirmEmailPayload>;
  /** Used to confirm linking an OAuth provider */
  confirmProviderLink?: Maybe<ConfirmProviderLinkPayload>;
  /** Used to generate a CSRF token to validate an OAuth request */
  generateOAuthCsrfToken?: Maybe<GenerateOAuthCsrfTokenPayload>;
  /** Used to request an email with a token used to reset a User's password */
  requestPasswordReset?: Maybe<RequestPasswordResetPayload>;
  /** Used to reset a password with a token */
  resetPassword?: Maybe<ResetPasswordPayload>;
  /** Used to sign in with email and password */
  signIn?: Maybe<SignInPayload>;
  /** Used to sign in with a OAuth code */
  signInWithOAuth?: Maybe<SignInWithOAuthPayload>;
  /** Used to sign out by invalidating the User's JWT */
  signOut?: Maybe<SignOutPayload>;
  /** Used to invalidate all of the User's current login tokens */
  signOutAllLocations?: Maybe<SignOutAllLocationsPayload>;
  /** Used to sign up as a User */
  signUp?: Maybe<SignUpPayload>;
};


/** Mutations related to app authentication */
export type AuthMutationsConfirmEmailArgs = {
  input: ConfirmEmailInput;
};


/** Mutations related to app authentication */
export type AuthMutationsConfirmProviderLinkArgs = {
  input: ConfirmProviderLinkInput;
};


/** Mutations related to app authentication */
export type AuthMutationsGenerateOAuthCsrfTokenArgs = {
  input: GenerateOAuthCsrfTokenInput;
};


/** Mutations related to app authentication */
export type AuthMutationsRequestPasswordResetArgs = {
  input: RequestPasswordResetInput;
};


/** Mutations related to app authentication */
export type AuthMutationsResetPasswordArgs = {
  input: ResetPasswordInput;
};


/** Mutations related to app authentication */
export type AuthMutationsSignInArgs = {
  input: SignInInput;
};


/** Mutations related to app authentication */
export type AuthMutationsSignInWithOAuthArgs = {
  input: SignInWithOAuthInput;
};


/** Mutations related to app authentication */
export type AuthMutationsSignOutArgs = {
  input: SignOutInput;
};


/** Mutations related to app authentication */
export type AuthMutationsSignOutAllLocationsArgs = {
  input: SignOutAllLocationsInput;
};


/** Mutations related to app authentication */
export type AuthMutationsSignUpArgs = {
  input: SignUpInput;
};

/** Queries related to app authentication */
export type AuthQueries = {
  /** The currently logged in User */
  me?: Maybe<User>;
};

export type BaseLineInput = {
  /** Points along the line */
  points: Array<AddressInput>;
};

/** A Between line */
export type BetweenLine = Line & {
  __typename?: 'BetweenLine';
  /** Cells along the line */
  points: Array<Address>;
};

/** A Cosmetic Cage Element */
export type Cage = MultiCell & {
  __typename?: 'Cage';
  /** Color of the cage */
  cageColor: Color;
  /** Cells included in the constraint */
  cells: Array<Address>;
  /** Text in the top corner of the cage */
  text?: Maybe<Scalars['String']['output']>;
  /** Text color */
  textColor?: Maybe<Color>;
};

/** Input for a cosmetic cage */
export type CageInput = {
  /** Color of the cage */
  cageColor: ColorInput;
  /** Cells included in the element */
  cells: Array<AddressInput>;
  /** Text to place in the corner of the cage */
  text?: InputMaybe<Scalars['String']['input']>;
  /** Color of the corner text */
  textColor?: InputMaybe<ColorInput>;
};

/** A background color for a single cell */
export type CellBackgroundColor = SingleCell & {
  __typename?: 'CellBackgroundColor';
  /** Cell Address */
  cell: Address;
  /** The background color */
  color: Color;
};

/** Chess Global Constraint Settings */
export type Chess = {
  __typename?: 'Chess';
  /** Anti-King move */
  king: Scalars['Boolean']['output'];
  /** Anti-Knight move */
  knight: Scalars['Boolean']['output'];
};

/** Input for a Chess Move Global Constraint */
export type ChessInput = {
  /** Anti-King restriction */
  king: Scalars['Boolean']['input'];
  /** Anti-Knight restriction */
  knight: Scalars['Boolean']['input'];
};

/** A Cosmetic Circle Element */
export type Circle = CosmeticShape & {
  __typename?: 'Circle';
  /** The center point of the shape */
  address: Address;
  /** Shape rotation angle */
  angle?: Maybe<Scalars['Float']['output']>;
  /** Shape color */
  fillColor: Color;
  /** Shape height */
  height: Scalars['Float']['output'];
  /** Shape outline color */
  outlineColor: Color;
  /** Text inside shape */
  text?: Maybe<Scalars['String']['output']>;
  /** Text color */
  textColor?: Maybe<Color>;
  /** Shape width */
  width: Scalars['Float']['output'];
};

/** Input for a cosmetic circle */
export type CircleInput = {
  /** Center point of the shape */
  address: AddressInput;
  /** Angle of rotation */
  angle?: InputMaybe<Scalars['Float']['input']>;
  /** Color to fill the shape */
  fillColor: ColorInput;
  /** Height of the shape */
  height: Scalars['Float']['input'];
  /** Color of the shape's outline */
  outlineColor: ColorInput;
  /** Text to place inside the shape */
  text?: InputMaybe<Scalars['String']['input']>;
  /** Color of the text inside the shape */
  textColor?: InputMaybe<ColorInput>;
  /** Width of the shape */
  width: Scalars['Float']['input'];
};

/** A Clone Group */
export type Clone = MultiCell & {
  __typename?: 'Clone';
  /** Cells included in the constraint */
  cells: Array<Address>;
  /** Clone locations */
  cloneCells: Array<Array<Address>>;
};

/** Input for a clone group */
export type CloneInput = {
  /** Cells included in the element */
  cells: Array<AddressInput>;
  /** The cells that are cloned */
  cloneCells: Array<Array<AddressInput>>;
};

/** A Color used for a puzzle element */
export type Color = {
  __typename?: 'Color';
  /** Blue value (0-255) */
  blue: Scalars['Float']['output'];
  /** Green value (0-255) */
  green: Scalars['Float']['output'];
  /** Opacity value (0-1) */
  opacity: Scalars['Float']['output'];
  /** Red value (0-255) */
  red: Scalars['Float']['output'];
};

/** Input for the color of an element */
export type ColorInput = {
  /** Blue value (0-255) */
  blue: Scalars['Float']['input'];
  /** Green value (0-255) */
  green: Scalars['Float']['input'];
  /** Opacity (0-1) */
  opacity: Scalars['Float']['input'];
  /** Red value (0-255) */
  red: Scalars['Float']['input'];
};

/** A Column Indexing cell */
export type ColumnIndexCell = SingleCell & {
  __typename?: 'ColumnIndexCell';
  /** Cell Address */
  cell: Address;
};

/** Autogenerated input type of ConfirmEmail */
export type ConfirmEmailInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The token attatched to the link sent in the confirmation email */
  token: Scalars['String']['input'];
};

/** Autogenerated return type of ConfirmEmail. */
export type ConfirmEmailPayload = {
  __typename?: 'ConfirmEmailPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Error messages passed along with mutation response */
  errors?: Maybe<Array<Scalars['String']['output']>>;
  /** A Signed JWT for authenticating a user */
  jwt?: Maybe<Scalars['String']['output']>;
  /** Flag marking if mutation was successful */
  success: Scalars['Boolean']['output'];
};

/** Autogenerated input type of ConfirmProviderLink */
export type ConfirmProviderLinkInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The token attached to the link sent in the confirmation email */
  token: Scalars['String']['input'];
};

/** Autogenerated return type of ConfirmProviderLink. */
export type ConfirmProviderLinkPayload = {
  __typename?: 'ConfirmProviderLinkPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Error messages passed along with mutation response */
  errors?: Maybe<Array<Scalars['String']['output']>>;
  /** A Signed JWT for authenticating a user */
  jwt?: Maybe<Scalars['String']['output']>;
  /** Flag marking if mutation was successful */
  success: Scalars['Boolean']['output'];
};

/** The collection of cosmetic elements for a puzzle */
export type CosmeticElements = {
  __typename?: 'CosmeticElements';
  /** Cosmetic Cages */
  cages?: Maybe<Array<Cage>>;
  /** A list of cells with a background color */
  cellBackgroundColors?: Maybe<Array<CellBackgroundColor>>;
  /** Cosmetic Circle */
  circles?: Maybe<Array<Circle>>;
  /** Cosmetic Lines */
  lines?: Maybe<Array<CustomLine>>;
  /** Cosmetic Rectangles */
  rectangles?: Maybe<Array<Rectangle>>;
  /** Cosmetic Text */
  text?: Maybe<Array<Text>>;
};

/** Input for the collection of cosmetic elements in a puzzle */
export type CosmeticElementsInput = {
  /** Cosmetic Cages */
  cages?: InputMaybe<Array<CageInput>>;
  /** Cosmetic Circles */
  circles?: InputMaybe<Array<CircleInput>>;
  /** Cosmetic Lines */
  lines?: InputMaybe<Array<CustomLineInput>>;
  /** Cosmetic Rectangles */
  rectangles?: InputMaybe<Array<RectangleInput>>;
  /** Cosmetic Text */
  text?: InputMaybe<Array<TextInput>>;
};

/** An element that creates a shape in the grid */
export type CosmeticShape = {
  /** The center point of the shape */
  address: Address;
  /** Shape rotation angle */
  angle?: Maybe<Scalars['Float']['output']>;
  /** Shape color */
  fillColor: Color;
  /** Shape height */
  height: Scalars['Float']['output'];
  /** Shape outline color */
  outlineColor: Color;
  /** Text inside shape */
  text?: Maybe<Scalars['String']['output']>;
  /** Text color */
  textColor?: Maybe<Color>;
  /** Shape width */
  width: Scalars['Float']['output'];
};

/** Autogenerated input type of CreatePuzzle */
export type CreatePuzzleInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The Puzzle to save */
  puzzle: PuzzleInput;
};

/** Autogenerated return type of CreatePuzzle. */
export type CreatePuzzlePayload = {
  __typename?: 'CreatePuzzlePayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Error messages passed along with mutation response */
  errors?: Maybe<Array<Scalars['String']['output']>>;
  /** The created puzzle */
  puzzle?: Maybe<Puzzle>;
  /** Flag marking if mutation was successful */
  success: Scalars['Boolean']['output'];
};

/** A Csrf Token generated by the server with an identifier generated by the client */
export type CsrfToken = {
  /** The identifier for the token generated client-side */
  clientTokenId: Scalars['String']['input'];
  /** The token that was generated from the server to validate */
  token: Scalars['String']['input'];
};

/** A Custom Cosmetic Line */
export type CustomLine = Line & {
  __typename?: 'CustomLine';
  /** Line color */
  color: Color;
  /** Cells along the line */
  points: Array<Address>;
  /** Line thickness */
  width: Scalars['Float']['output'];
};

/** Input for a Custom Cosmetic Line */
export type CustomLineInput = {
  /** Line Color */
  color: ColorInput;
  /** Points along the line */
  points: Array<AddressInput>;
  /** The width of the line */
  width: Scalars['Float']['input'];
};

/** Diagonal Global Constraint Settings */
export type Diagonals = {
  __typename?: 'Diagonals';
  /** Top left to bottom right */
  negative: Scalars['Boolean']['output'];
  /** Bottom left to top right */
  positive: Scalars['Boolean']['output'];
};

/** Input for a Diagonals Global Constraint */
export type DiagonalsInput = {
  /** Top left to bottom right */
  negative: Scalars['Boolean']['input'];
  /** Bottom left to top right */
  positive: Scalars['Boolean']['input'];
};

/** A Difference Dot */
export type DifferenceDot = MultiCell & {
  __typename?: 'DifferenceDot';
  /** Cells included in the constraint */
  cells: Array<Address>;
  /** Difference of the touching cells */
  difference?: Maybe<Scalars['Int']['output']>;
  /** Visual location of the element */
  location: Address;
};

/** Input for a difference dot */
export type DifferenceDotInput = {
  /** Cells included in the element */
  cells: Array<AddressInput>;
  /** The difference of the two cells */
  difference?: InputMaybe<Scalars['Int']['input']>;
};

/** Disjoint Sets Global Settings */
export type DisjointSets = {
  __typename?: 'DisjointSets';
  /** Disjoint sets enabled */
  enabled: Scalars['Boolean']['output'];
};

/** Input for a Disjoint Set Global Constraint */
export type DisjointSetsInput = {
  /** Disjoint Sets restriction */
  enabled: Scalars['Boolean']['input'];
};

/** A Dutch Whisper line */
export type DutchWhisperLine = Line & {
  __typename?: 'DutchWhisperLine';
  /** Cells along the line */
  points: Array<Address>;
};

/** An Even Cell */
export type EvenCell = SingleCell & {
  __typename?: 'EvenCell';
  /** Cell Address */
  cell: Address;
};

/** An Extra Region */
export type ExtraRegion = MultiCell & {
  __typename?: 'ExtraRegion';
  /** Cells included in the constraint */
  cells: Array<Address>;
};

/** Autogenerated input type of GenerateOAuthCsrfToken */
export type GenerateOAuthCsrfTokenInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Token Identifier from the client */
  clientTokenId: Scalars['String']['input'];
};

/** Autogenerated return type of GenerateOAuthCsrfToken. */
export type GenerateOAuthCsrfTokenPayload = {
  __typename?: 'GenerateOAuthCsrfTokenPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Server CSRF Token for OAuth validation */
  csrfToken: Scalars['String']['output'];
  /** Error messages passed along with mutation response */
  errors?: Maybe<Array<Scalars['String']['output']>>;
  /** Flag marking if mutation was successful */
  success: Scalars['Boolean']['output'];
};

/** A German Whisper line */
export type GermanWhisperLine = Line & {
  __typename?: 'GermanWhisperLine';
  /** Cells along the line */
  points: Array<Address>;
};

/** The collection of global constraints for a puzzle */
export type GlobalConstraints = {
  __typename?: 'GlobalConstraints';
  /** Anti-Kropki sudoku global */
  antiKropki?: Maybe<AntiKropki>;
  /** Anti-XV sudoku global */
  antiXV?: Maybe<AntiXv>;
  /** Anti-Chess move sudoku global */
  chess?: Maybe<Chess>;
  /** Diagonal sudoku global */
  diagonals?: Maybe<Diagonals>;
  /** Disjoint sets sudoku global */
  disjointSets?: Maybe<DisjointSets>;
};

/** Input for the collection of global constraints for a puzzle */
export type GlobalConstraintsInput = {
  /** Anti-Kropki global */
  antiKropki?: InputMaybe<AntiKropkiInput>;
  /** Anti-XV sudoku */
  antiXV?: InputMaybe<AntiXvInput>;
  /** Anti-Chess global */
  chess?: InputMaybe<ChessInput>;
  /** Diagonal global */
  diagonals?: InputMaybe<DiagonalsInput>;
  /** Disjoint Sets global */
  disjointSets?: InputMaybe<DisjointSetsInput>;
};

/** A Cell in a puzzle grid */
export type GridCell = {
  __typename?: 'GridCell';
  /** The digit inside the cell */
  digit?: Maybe<Scalars['Int']['output']>;
  /** If the cell contains a given digit */
  given?: Maybe<Scalars['Boolean']['output']>;
  /** The region the cell belongs to */
  region: Scalars['Int']['output'];
};

/** A Killer Cage */
export type KillerCage = MultiCell & {
  __typename?: 'KillerCage';
  /** Cells included in the constraint */
  cells: Array<Address>;
  /** Value of the cage */
  value?: Maybe<Scalars['Int']['output']>;
};

/** Input for a killer cage */
export type KillerCageInput = {
  /** Cells included in the element */
  cells: Array<AddressInput>;
  /** The value of the Killer Cage */
  value?: InputMaybe<Scalars['Int']['input']>;
};

/** An element that makes up a line in the grid */
export type Line = {
  /** Cells along the line */
  points: Array<Address>;
};

/** The Direction of a little killer */
export type LittleKillerDirection = {
  __typename?: 'LittleKillerDirection';
  /** Left or Right */
  left: Scalars['Boolean']['output'];
  /** Top or Bottom */
  top: Scalars['Boolean']['output'];
};

/** Input for the direction of a little killer arrow */
export type LittleKillerDirectionInput = {
  /** Left or Right */
  left: Scalars['Boolean']['input'];
  /** Top or Bottom */
  top: Scalars['Boolean']['input'];
};

/** A Little Killer Clue */
export type LittleKillerSum = NumberOutsideGrid & {
  __typename?: 'LittleKillerSum';
  /** Direction the little killer arrow is pointing */
  direction: LittleKillerDirection;
  /** Location of the value */
  location: Address;
  /** Value of the clue */
  value?: Maybe<Scalars['Int']['output']>;
};

/** Input for a little killer sum */
export type LittleKillerSumInput = {
  /** Direction of the arrow */
  direction: LittleKillerDirectionInput;
  /** The location of the clue */
  location: AddressInput;
  /** The value of the clue */
  value?: InputMaybe<Scalars['Int']['input']>;
};

/** The set of local constraints for a puzzle */
export type LocalConstraints = {
  __typename?: 'LocalConstraints';
  /** Arrow Constraint */
  arrows?: Maybe<Array<Arrow>>;
  /** Between Lines */
  betweenLines?: Maybe<Array<BetweenLine>>;
  /** Clones */
  clones?: Maybe<Array<Clone>>;
  /** Column Index Cells */
  columnIndexCells?: Maybe<Array<ColumnIndexCell>>;
  /** Difference Dots */
  differenceDots?: Maybe<Array<DifferenceDot>>;
  /** Dutch Whisper Lines */
  dutchWhisperLines?: Maybe<Array<DutchWhisperLine>>;
  /** EvenCell */
  evenCells?: Maybe<Array<EvenCell>>;
  /** Extra Regions */
  extraRegions?: Maybe<Array<ExtraRegion>>;
  /** German Whisper Lines */
  germanWhisperLines?: Maybe<Array<GermanWhisperLine>>;
  /** Killer Cages */
  killerCages?: Maybe<Array<KillerCage>>;
  /** Little Killer Sums */
  littleKillerSums?: Maybe<Array<LittleKillerSum>>;
  /** Maximum Cells */
  maxCells?: Maybe<Array<MaxCell>>;
  /** Minimum Cells */
  minCells?: Maybe<Array<MinCell>>;
  /** Odd Cells */
  oddCells?: Maybe<Array<OddCell>>;
  /** Palindrome Lines */
  palindromeLines?: Maybe<Array<PalindromeLine>>;
  /** Quadruples */
  quadruples?: Maybe<Array<Quadruple>>;
  /** Ratio Dots */
  ratioDots?: Maybe<Array<RatioDot>>;
  /** Region Sum Lines */
  regionSumLines?: Maybe<Array<RegionSumLine>>;
  /** Renban Lines */
  renbanLines?: Maybe<Array<RenbanLine>>;
  /** Row Index Cells */
  rowIndexCells?: Maybe<Array<RowIndexCell>>;
  /** Sandwich Sums */
  sandwichSums?: Maybe<Array<SandwichSum>>;
  /** Skyscrapers */
  skyscrapers?: Maybe<Array<Skyscraper>>;
  /** Thermometer Constraint */
  thermometers?: Maybe<Array<Thermometer>>;
  /** X Sums */
  xSums?: Maybe<Array<XSum>>;
  /** XV Constraints */
  xv?: Maybe<Array<Xv>>;
};

/** Input for the collection of local constraints for a puzzle */
export type LocalConstraintsInput = {
  /** Arrows */
  arrows?: InputMaybe<Array<ArrowInput>>;
  /** Between Lines */
  betweenLines?: InputMaybe<Array<BaseLineInput>>;
  /** Clone Groups */
  clones?: InputMaybe<Array<CloneInput>>;
  /** Column Index Cells */
  columnIndexCells?: InputMaybe<Array<SingleCellInput>>;
  /** Difference Dots */
  differenceDots?: InputMaybe<Array<DifferenceDotInput>>;
  /** Dutch Whisper Lines */
  dutchWhisperLines?: InputMaybe<Array<BaseLineInput>>;
  /** Even Cells */
  evenCells?: InputMaybe<Array<SingleCellInput>>;
  /** Extra Regions */
  extraRegions?: InputMaybe<Array<MultiCellInput>>;
  /** German Whisper Lines */
  germanWhisperLines?: InputMaybe<Array<BaseLineInput>>;
  /** Killer Cages */
  killerCages?: InputMaybe<Array<KillerCageInput>>;
  /** Little Killers */
  littleKillerSums?: InputMaybe<Array<LittleKillerSumInput>>;
  /** Maximum Cells */
  maxCells?: InputMaybe<Array<SingleCellInput>>;
  /** Minimum Cells */
  minCells?: InputMaybe<Array<SingleCellInput>>;
  /** Odd Cells */
  oddCells?: InputMaybe<Array<SingleCellInput>>;
  /** Palindrome Lines */
  palindromeLines?: InputMaybe<Array<BaseLineInput>>;
  /** Quadruples */
  quadruples?: InputMaybe<Array<QuadrupleInput>>;
  /** Ratio Dots */
  ratioDots?: InputMaybe<Array<RatioDotInput>>;
  /** Region Sum Lines */
  regionSumLines?: InputMaybe<Array<BaseLineInput>>;
  /** Renban Lines */
  renbanLines?: InputMaybe<Array<BaseLineInput>>;
  /** Row Index Cells */
  rowIndexCells?: InputMaybe<Array<SingleCellInput>>;
  /** Sandwich Sums */
  sandwichSums?: InputMaybe<Array<NumberOutsideGridInput>>;
  /** Skyscrapers */
  skyscrapers?: InputMaybe<Array<NumberOutsideGridInput>>;
  /** Thermometers */
  thermometers?: InputMaybe<Array<ThermometerInput>>;
  /** X Sums */
  xSums?: InputMaybe<Array<NumberOutsideGridInput>>;
  /** XV Elements */
  xv?: InputMaybe<Array<XvInput>>;
};

/** A Maximum Cell */
export type MaxCell = SingleCell & {
  __typename?: 'MaxCell';
  /** Cell Address */
  cell: Address;
};

/** A Minimum Cell */
export type MinCell = SingleCell & {
  __typename?: 'MinCell';
  /** Cell Address */
  cell: Address;
};

/** An element that references Multiple Cells */
export type MultiCell = {
  /** Cells included in the constraint */
  cells: Array<Address>;
};

/** Input for an element that references multiple cells */
export type MultiCellInput = {
  /** Cells included in the element */
  cells: Array<AddressInput>;
};

/** An element with a number outside the grid */
export type NumberOutsideGrid = {
  /** Location of the value */
  location: Address;
  /** Value of the clue */
  value?: Maybe<Scalars['Int']['output']>;
};

/** Input for an element that has a number outside the grid */
export type NumberOutsideGridInput = {
  /** The location of the clue */
  location: AddressInput;
  /** The value of the clue */
  value?: InputMaybe<Scalars['Int']['input']>;
};

/** Payload to sign in with an OAuth provider */
export type OAuthSignIn = {
  /** The Code sent from the OAuth provider to authenticate the user */
  code: Scalars['String']['input'];
  /** The OAuth provider who sent the code */
  providerName: Scalars['String']['input'];
};

/** An Odd Cell */
export type OddCell = SingleCell & {
  __typename?: 'OddCell';
  /** Cell Address */
  cell: Address;
};

/** A Palindrome line */
export type PalindromeLine = Line & {
  __typename?: 'PalindromeLine';
  /** Cells along the line */
  points: Array<Address>;
};

/** The base Mutation Object */
export type PuzlerMutations = AuthMutations & PuzzleMutations & {
  __typename?: 'PuzlerMutations';
  /** Used to confirm an email with a token */
  confirmEmail?: Maybe<ConfirmEmailPayload>;
  /** Used to confirm linking an OAuth provider */
  confirmProviderLink?: Maybe<ConfirmProviderLinkPayload>;
  /** Create a Puzzle */
  createPuzzle?: Maybe<CreatePuzzlePayload>;
  /** Used to generate a CSRF token to validate an OAuth request */
  generateOAuthCsrfToken?: Maybe<GenerateOAuthCsrfTokenPayload>;
  /** Used to request an email with a token used to reset a User's password */
  requestPasswordReset?: Maybe<RequestPasswordResetPayload>;
  /** Used to reset a password with a token */
  resetPassword?: Maybe<ResetPasswordPayload>;
  /** Used to sign in with email and password */
  signIn?: Maybe<SignInPayload>;
  /** Used to sign in with a OAuth code */
  signInWithOAuth?: Maybe<SignInWithOAuthPayload>;
  /** Used to sign out by invalidating the User's JWT */
  signOut?: Maybe<SignOutPayload>;
  /** Used to invalidate all of the User's current login tokens */
  signOutAllLocations?: Maybe<SignOutAllLocationsPayload>;
  /** Used to sign up as a User */
  signUp?: Maybe<SignUpPayload>;
};


/** The base Mutation Object */
export type PuzlerMutationsConfirmEmailArgs = {
  input: ConfirmEmailInput;
};


/** The base Mutation Object */
export type PuzlerMutationsConfirmProviderLinkArgs = {
  input: ConfirmProviderLinkInput;
};


/** The base Mutation Object */
export type PuzlerMutationsCreatePuzzleArgs = {
  input: CreatePuzzleInput;
};


/** The base Mutation Object */
export type PuzlerMutationsGenerateOAuthCsrfTokenArgs = {
  input: GenerateOAuthCsrfTokenInput;
};


/** The base Mutation Object */
export type PuzlerMutationsRequestPasswordResetArgs = {
  input: RequestPasswordResetInput;
};


/** The base Mutation Object */
export type PuzlerMutationsResetPasswordArgs = {
  input: ResetPasswordInput;
};


/** The base Mutation Object */
export type PuzlerMutationsSignInArgs = {
  input: SignInInput;
};


/** The base Mutation Object */
export type PuzlerMutationsSignInWithOAuthArgs = {
  input: SignInWithOAuthInput;
};


/** The base Mutation Object */
export type PuzlerMutationsSignOutArgs = {
  input: SignOutInput;
};


/** The base Mutation Object */
export type PuzlerMutationsSignOutAllLocationsArgs = {
  input: SignOutAllLocationsInput;
};


/** The base Mutation Object */
export type PuzlerMutationsSignUpArgs = {
  input: SignUpInput;
};

/** The base Query Object */
export type PuzlerQueries = AuthQueries & PuzzleQueries & {
  __typename?: 'PuzlerQueries';
  /** Fetch a Puzzle */
  fetchPuzzle?: Maybe<Puzzle>;
  /** Load a Puzzle from FPuzzles from a compressed Base64 string */
  loadFPuzzle?: Maybe<Puzzle>;
  /** The currently logged in User */
  me?: Maybe<User>;
};


/** The base Query Object */
export type PuzlerQueriesFetchPuzzleArgs = {
  id: Scalars['ID']['input'];
};


/** The base Query Object */
export type PuzlerQueriesLoadFPuzzleArgs = {
  base64Data: Scalars['String']['input'];
};

/** A playable Sudoku Puzzle */
export type Puzzle = {
  __typename?: 'Puzzle';
  /** The Puzzle Author */
  author?: Maybe<Scalars['String']['output']>;
  /** Grid Cell data containing given digits and cell regions */
  cells: Array<Array<GridCell>>;
  /** Cosmetics for the Puzzle */
  cosmetics: CosmeticElements;
  /** Global Constraints for the Puzzle */
  globalConstraints: GlobalConstraints;
  /** The Puzzle ID */
  id?: Maybe<Scalars['ID']['output']>;
  /** Local Constraints for the Puzzle */
  localConstraints: LocalConstraints;
  /** Rules for the Puzzle */
  rules?: Maybe<Scalars['String']['output']>;
  /** The Puzzle Size */
  size: Scalars['Int']['output'];
  /** The puzzle solution */
  solution?: Maybe<Array<Maybe<Scalars['Int']['output']>>>;
  /** The Puzzle Title */
  title?: Maybe<Scalars['String']['output']>;
  /** The User who owns the Puzzle */
  user?: Maybe<User>;
  /** The visibility of the puzzle */
  visibility: Visibility;
};

/** Input for a Puzzle */
export type PuzzleInput = {
  /** Puzzle Author */
  author?: InputMaybe<Scalars['String']['input']>;
  /** Cosmetic Elements */
  cosmetics?: InputMaybe<CosmeticElementsInput>;
  /** Given Digits */
  givenDigits: Array<Array<InputMaybe<Scalars['Int']['input']>>>;
  /** Global Constraints */
  globalConstraints?: InputMaybe<GlobalConstraintsInput>;
  /** Grid Regions */
  gridRegions: Array<Array<Scalars['Int']['input']>>;
  /** Local Constratints */
  localConstraints?: InputMaybe<LocalConstraintsInput>;
  /** Puzzle Rules */
  rules?: InputMaybe<Scalars['String']['input']>;
  /** Puzzle Size */
  size: Scalars['Int']['input'];
  /** Puzzle Title */
  title?: InputMaybe<Scalars['String']['input']>;
};

/** Base Mutation object for Puzzles */
export type PuzzleMutations = {
  /** Create a Puzzle */
  createPuzzle?: Maybe<CreatePuzzlePayload>;
};


/** Base Mutation object for Puzzles */
export type PuzzleMutationsCreatePuzzleArgs = {
  input: CreatePuzzleInput;
};

/** Base Query object for Puzzles */
export type PuzzleQueries = {
  /** Fetch a Puzzle */
  fetchPuzzle?: Maybe<Puzzle>;
  /** Load a Puzzle from FPuzzles from a compressed Base64 string */
  loadFPuzzle?: Maybe<Puzzle>;
};


/** Base Query object for Puzzles */
export type PuzzleQueriesFetchPuzzleArgs = {
  id: Scalars['ID']['input'];
};


/** Base Query object for Puzzles */
export type PuzzleQueriesLoadFPuzzleArgs = {
  base64Data: Scalars['String']['input'];
};

/** A Quadruple clue */
export type Quadruple = MultiCell & {
  __typename?: 'Quadruple';
  /** Cells included in the constraint */
  cells: Array<Address>;
  /** Visual location of the element */
  location: Address;
  /** Values in the Quadruple */
  values: Array<Scalars['Int']['output']>;
};

/** Input for a quadruple clue */
export type QuadrupleInput = {
  /** Cells included in the element */
  cells: Array<AddressInput>;
  /** The values in the Quadruple */
  values: Array<Scalars['Int']['input']>;
};

/** A Ratio Dot */
export type RatioDot = MultiCell & {
  __typename?: 'RatioDot';
  /** Cells included in the constraint */
  cells: Array<Address>;
  /** Visual location of the element */
  location: Address;
  /** Ratio of the connected dots */
  ratio?: Maybe<Scalars['Int']['output']>;
};

/** Input for a ratio dot */
export type RatioDotInput = {
  /** Cells included in the element */
  cells: Array<AddressInput>;
  /** The ratio of the two cells */
  ratio?: InputMaybe<Scalars['Int']['input']>;
};

/** A Cosmetic Rectangle Element */
export type Rectangle = CosmeticShape & {
  __typename?: 'Rectangle';
  /** The center point of the shape */
  address: Address;
  /** Shape rotation angle */
  angle?: Maybe<Scalars['Float']['output']>;
  /** Shape color */
  fillColor: Color;
  /** Shape height */
  height: Scalars['Float']['output'];
  /** Shape outline color */
  outlineColor: Color;
  /** Text inside shape */
  text?: Maybe<Scalars['String']['output']>;
  /** Text color */
  textColor?: Maybe<Color>;
  /** Shape width */
  width: Scalars['Float']['output'];
};

/** Input for a cosmetic rectangle */
export type RectangleInput = {
  /** Center point of the shape */
  address: AddressInput;
  /** Angle of rotation */
  angle?: InputMaybe<Scalars['Float']['input']>;
  /** Color to fill the shape */
  fillColor: ColorInput;
  /** Height of the shape */
  height: Scalars['Float']['input'];
  /** Color of the shape's outline */
  outlineColor: ColorInput;
  /** Text to place inside the shape */
  text?: InputMaybe<Scalars['String']['input']>;
  /** Color of the text inside the shape */
  textColor?: InputMaybe<ColorInput>;
  /** Width of the shape */
  width: Scalars['Float']['input'];
};

/** A Region Sum line */
export type RegionSumLine = Line & {
  __typename?: 'RegionSumLine';
  /** Cells along the line */
  points: Array<Address>;
};

/** A Renban line */
export type RenbanLine = Line & {
  __typename?: 'RenbanLine';
  /** Cells along the line */
  points: Array<Address>;
};

/** Autogenerated input type of RequestPasswordReset */
export type RequestPasswordResetInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The email of the User requesting a reset */
  email: Scalars['String']['input'];
};

/** Autogenerated return type of RequestPasswordReset. */
export type RequestPasswordResetPayload = {
  __typename?: 'RequestPasswordResetPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Error messages passed along with mutation response */
  errors?: Maybe<Array<Scalars['String']['output']>>;
  /** Flag marking if mutation was successful */
  success: Scalars['Boolean']['output'];
};

/** Autogenerated input type of ResetPassword */
export type ResetPasswordInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The new password to use */
  password: Scalars['String']['input'];
  /** Token sent to the User during a password reset request */
  token: Scalars['String']['input'];
};

/** Autogenerated return type of ResetPassword. */
export type ResetPasswordPayload = {
  __typename?: 'ResetPasswordPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Error messages passed along with mutation response */
  errors?: Maybe<Array<Scalars['String']['output']>>;
  /** A Signed JWT used to authenticate the User */
  jwt?: Maybe<Scalars['String']['output']>;
  /** Flag marking if mutation was successful */
  success: Scalars['Boolean']['output'];
};

/** A Row Indexing cell */
export type RowIndexCell = SingleCell & {
  __typename?: 'RowIndexCell';
  /** Cell Address */
  cell: Address;
};

/** A Sandwich Sum clue */
export type SandwichSum = NumberOutsideGrid & {
  __typename?: 'SandwichSum';
  /** Location of the value */
  location: Address;
  /** Value of the clue */
  value?: Maybe<Scalars['Int']['output']>;
};

/** Autogenerated input type of SignIn */
export type SignInInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** User Email */
  email: Scalars['String']['input'];
  /** User Password */
  password: Scalars['String']['input'];
};

/** Autogenerated return type of SignIn. */
export type SignInPayload = {
  __typename?: 'SignInPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Error messages passed along with mutation response */
  errors?: Maybe<Array<Scalars['String']['output']>>;
  /** A Signed JWT for Authenticating the User */
  jwt?: Maybe<Scalars['String']['output']>;
  /** Flag marking if mutation was successful */
  success: Scalars['Boolean']['output'];
};

/** Autogenerated input type of SignInWithOAuth */
export type SignInWithOAuthInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Token generated by the api to prevent CSRF attacks */
  csrfToken: CsrfToken;
  /** The OAuth code and provider to attempt sign in with */
  oAuthData: OAuthSignIn;
};

/** Autogenerated return type of SignInWithOAuth. */
export type SignInWithOAuthPayload = {
  __typename?: 'SignInWithOAuthPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Error messages passed along with mutation response */
  errors?: Maybe<Array<Scalars['String']['output']>>;
  /** A Signed JWT used to authenticate a User */
  jwt?: Maybe<Scalars['String']['output']>;
  /** Flag marking if mutation was successful */
  success: Scalars['Boolean']['output'];
};

/** Autogenerated input type of SignOutAllLocations */
export type SignOutAllLocationsInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
};

/** Autogenerated return type of SignOutAllLocations. */
export type SignOutAllLocationsPayload = {
  __typename?: 'SignOutAllLocationsPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Error messages passed along with mutation response */
  errors?: Maybe<Array<Scalars['String']['output']>>;
  /** Flag marking if mutation was successful */
  success: Scalars['Boolean']['output'];
};

/** Autogenerated input type of SignOut */
export type SignOutInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The JWT to invalidate */
  token: Scalars['String']['input'];
};

/** Autogenerated return type of SignOut. */
export type SignOutPayload = {
  __typename?: 'SignOutPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Error messages passed along with mutation response */
  errors?: Maybe<Array<Scalars['String']['output']>>;
  /** Flag marking if mutation was successful */
  success: Scalars['Boolean']['output'];
};

/** Autogenerated input type of SignUp */
export type SignUpInput = {
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Email used to sign in */
  email: Scalars['String']['input'];
  /** Password used to sign in */
  password: Scalars['String']['input'];
};

/** Autogenerated return type of SignUp. */
export type SignUpPayload = {
  __typename?: 'SignUpPayload';
  /** A unique identifier for the client performing the mutation. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Error messages passed along with mutation response */
  errors?: Maybe<Array<Scalars['String']['output']>>;
  /** A Signed JWT for Authenticating the User */
  jwt?: Maybe<Scalars['String']['output']>;
  /** Flag marking if mutation was successful */
  success: Scalars['Boolean']['output'];
};

/** An element that references a single cell */
export type SingleCell = {
  /** Cell Address */
  cell: Address;
};

/** Input for an element that references a single cell */
export type SingleCellInput = {
  /** The cell for the element */
  cell: AddressInput;
};

/** A Skyscraper clue */
export type Skyscraper = NumberOutsideGrid & {
  __typename?: 'Skyscraper';
  /** Location of the value */
  location: Address;
  /** Value of the clue */
  value?: Maybe<Scalars['Int']['output']>;
};

/** A Cosmetic Text Element */
export type Text = {
  __typename?: 'Text';
  /** Text Location */
  address: Address;
  /** Text Rotation Angle */
  angle?: Maybe<Scalars['Float']['output']>;
  /** Font Color */
  fontColor?: Maybe<Color>;
  /** Text Size */
  size: Scalars['Float']['output'];
  /** Text to Display */
  text?: Maybe<Scalars['String']['output']>;
};

/** Input for a cosmetic text element */
export type TextInput = {
  /** Text Location */
  address: AddressInput;
  /** Angle of Rotation */
  angle?: InputMaybe<Scalars['Float']['input']>;
  /** Text Color */
  fontColor: ColorInput;
  /** Size of the text */
  size: Scalars['Float']['input'];
  /** Text to display */
  text: Scalars['String']['input'];
};

/** A Thermometer */
export type Thermometer = {
  __typename?: 'Thermometer';
  /** Thermo bulb location */
  bulb: Address;
  /** Thermo lines */
  lines: Array<Array<Address>>;
};

/** Input for a thermometer element */
export type ThermometerInput = {
  /** Location of the bulb */
  bulb: AddressInput;
  /** Lines from the bulb */
  lines: Array<Array<AddressInput>>;
};

/** A User that can sign in */
export type User = {
  __typename?: 'User';
  /** A User's display name */
  displayName: Scalars['String']['output'];
  /** A User's email */
  email?: Maybe<Scalars['String']['output']>;
  /** A User's first name */
  firstName?: Maybe<Scalars['String']['output']>;
  /** A User's id */
  id: Scalars['ID']['output'];
  /** A User's last name */
  lastName?: Maybe<Scalars['String']['output']>;
  /** Puzzles made by the User */
  puzzles: Array<Puzzle>;
};

/** Enum for the visibility of a puzzle */
export enum Visibility {
  Private = 'PRIVATE',
  Public = 'PUBLIC',
  Unlisted = 'UNLISTED'
}

/** An X-Sum clue */
export type XSum = NumberOutsideGrid & {
  __typename?: 'XSum';
  /** Location of the value */
  location: Address;
  /** Value of the clue */
  value?: Maybe<Scalars['Int']['output']>;
};

/** An XV clue */
export type Xv = MultiCell & {
  __typename?: 'XV';
  /** Cells included in the constraint */
  cells: Array<Address>;
  /** Visual location of the element */
  location: Address;
  /** Type of XV */
  xvType?: Maybe<XvTypes>;
};

/** Input for an XV element */
export type XvInput = {
  /** Cells included in the element */
  cells: Array<AddressInput>;
  /** Element is an X or a V */
  xvType?: InputMaybe<XvTypes>;
};

/** Enum describing if an XV constraint is an X or a V */
export enum XvTypes {
  V = 'V',
  X = 'X'
}
