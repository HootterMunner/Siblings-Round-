export type UserRole = 'admin' | 'reader';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: number;
}

export type ChapterStatus = 'draft' | 'published';

export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  status: ChapterStatus;
  createdAt: number;
  updatedAt: number;
}

export interface Comment {
  id: string;
  chapterId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: number;
}

export interface Bookmark {
  id: string;
  chapterId: string;
  userId: string;
  createdAt: number;
}

export interface Highlight {
  id: string;
  chapterId: string;
  userId: string;
  text: string;
  color?: string;
  paragraphIndex: number;
  createdAt: number;
}

export interface ReadChapter {
  id: string;
  chapterId: string;
  userId: string;
  readAt: number;
}
