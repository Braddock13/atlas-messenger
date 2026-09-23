export type WhoCanMessage = "everyone" | "nobody";

export type PrivacySettings = {
  showLastSeen: boolean;
  showOnline: boolean;
  whoCanMessage: WhoCanMessage;
};

export type Profile = {
  userId: string;
  displayName: string;
  username: string;
  email: string | null;
  photoUrl: string | null;
  bio: string;
  createdAt: string;
  lastSeen: string | null;
  isOnline: boolean;
  emailVerified: boolean;
  privacy: PrivacySettings;
};

export type ConversationSummary = {
  id: string;
  type: "direct";
  lastMessageText: string | null;
  lastMessageAt: string | null;
  lastMessageSenderId: string | null;
  unreadCount: number;
  isMuted: boolean;
  peerTyping: boolean;
  peerLastReadAt: string | null;
  peer: {
    userId: string;
    displayName: string;
    username: string;
    photoUrl: string | null;
    bio: string;
    isOnline: boolean;
    lastSeen: string | null;
  };
};

export type MessageType = "text" | "image" | "file";

export type MessageReaction = {
  emoji: string;
  userId: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  body: string;
  mediaUrl: string | null;
  replyToId: string | null;
  replyPreview: { body: string; senderId: string } | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  reactions: MessageReaction[];
  pending?: boolean;
};

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  conversationId: string | null;
  read: boolean;
  createdAt: string;
};

export const DEFAULT_PRIVACY: PrivacySettings = {
  showLastSeen: true,
  showOnline: true,
  whoCanMessage: "everyone",
};

export const REACTION_SET = ["❤️", "👍", "😂", "😮", "😢", "🔥"] as const;
