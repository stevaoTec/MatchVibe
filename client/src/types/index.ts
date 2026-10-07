export interface User {
  id: number;
  email: string;
  name: string;
  bio: string;
  cpf?: string;
  age: number;
  gender: string;
  profilePhoto: string;
  coverPhoto: string;
  photos: string[];
  interests: string[];
  verified: boolean;
  distance?: number;
  latitude?: number;
  longitude?: number;
  maxDistance?: number;
  minAge?: number;
  maxAge?: number;
  genderPreference?: string;
  createdAt?: string;
}

export interface Match {
  matchId: number;
  userId: number;
  isSuper?: boolean;
  name: string;
  profilePhoto: string;
  bio: string;
  age: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  matchedAt: string;
}

export interface Message {
  id: number;
  content: string;
  senderId: number;
  senderName: string;
  senderPhoto: string;
  createdAt: string;
  read: number;
}

export interface SwipeResult {
  success: boolean;
  match: {
    matchId: number;
    user: User;
  } | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}
