import { Schema } from 'mongoose';

export interface IMessage {
  text: string;
  images: string[];
  seen: boolean;
  sender: Schema.Types.ObjectId; // Reference to the sender (User)
  chat: Schema.Types.ObjectId; // Reference to the chat (Chat)
  isDeleted: boolean;
}
