export interface ProfileTheme {
  backgroundImage?: string;
  backgroundColor?: string;
  customCss?: string;
  fontFamily?: 'mono' | 'sans' | 'serif' | 'cyber';
  accentColor?: string;
  cursorEffect?: 'sparkles' | 'trails' | 'none';
  layoutStyle?: 'grid' | 'masonry' | 'classic';
}
export interface SubscriptionPlan {
  name: string;
  priceEth: string;
  priceBtc: string;
  benefits: string[];
}
export interface User {
  id: string;
  username: string;
  walletAddress: string;
  btcAddress?: string;
  avatar: string;
  bio: string;
  faction?: string;
  isVerified?: boolean;
  isAgeVerified?: boolean;
  theme?: ProfileTheme;
  subscriptionPlan?: SubscriptionPlan;
  mood?: string;
  interests?: string[];
  memberSince?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isFollowing?: boolean;
}
export interface Video {
  id: string;
  url: string;
  thumbnail: string;
  user: User;
  description: string;
  likes: number;
  comments?: number;
  shares?: number;
  isSensitive: boolean;
  isNSFW?: boolean;
  isPremium?: boolean;
  price?: string;
  tags: string[];
  createdAt?: string;
  views?: number;
}
export enum WidgetType {
  BIO = 'BIO',
  TOP_FRIENDS = 'TOP_FRIENDS',
  MUSIC_PLAYER = 'MUSIC_PLAYER',
  STAT_BLOCK = 'STAT_BLOCK',
  DATA_LOG = 'DATA_LOG',
  GEO_NODE = 'GEO_NODE',
  ASSET_GALLERY = 'ASSET_GALLERY',
  SOCIAL_HUB = 'SOCIAL_HUB',
  CUSTOM_CODE = 'CUSTOM_CODE',
  ABOUT_ME = 'ABOUT_ME',
  VISITOR_COUNTER = 'VISITOR_COUNTER',
  MOOD_STATUS = 'MOOD_STATUS'
}
export interface ProfileWidget {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  content?: any;
}
export interface Comment {
  id: string;
  user: User;
  text: string;
  createdAt: string;
  likes: number;
}
