import mongoose from 'mongoose';
import { connectedUsers } from '../../../socketIo';
import AppError from '../../error/AppError';
import Message from '../message/message.model';
import { User } from '../user/user.model';
import { IChat } from './chat.interface';
import Chat from './chat.model';
import httpStatus from 'http-status';
import { Types } from 'mongoose';
import { Console } from 'console';
import { getAdminData, getAdminId } from '../../DB/adminStrore';
import QueryBuilder from '../../builder/QueryBuilder';
import { USER_ROLE } from '../user/user.constants';
// Convert string to ObjectId
const toObjectId = (id: string): mongoose.Types.ObjectId =>
  new mongoose.Types.ObjectId(id);


const createChatWithAdmin = async(userId: string) => {


  const adminId = getAdminId();
  if (!adminId) {
    throw new AppError(httpStatus.NOT_FOUND, 'Admin data not found');
  }


  const admin = await User.findById(adminId);

  if (!admin) {
    throw new AppError(httpStatus.NOT_FOUND, 'Admin not found');
  }

  const chatData: IChat = {
    users: [userId, adminId],
    createdBy: userId as any,
  };

  const existingChat = await Chat.findOne({
  users: { $all: chatData.users, $size: 2 }, // Ensure both users exist in the chat
    });

  if (existingChat) {
    return;
  }

    const chat = await Chat.create(chatData);
    return chat;

  }


const addNewChat = async (
  data: IChat
) => {
  // Check if the creator exists
  const isCreatorExist = await User.findById(data?.createdBy);

  if (!isCreatorExist) {
    throw new Error('Creator not found');
  }

  // Check if another user in the chat exist
  const anotherUser = await User.find({ _id: new mongoose.Types.ObjectId((data as any)?.users[0]) });

  if (!anotherUser) {
    throw new Error('Another user not found');
  }

  const existingChat = await Chat.findOne({
    users: { $all: data.users, $size: 2 }, // Ensure both users exist in the chat
  });

  if (existingChat) {
    return;
  }

  // Create the chat in the database
  const result = await Chat.create(data);
  return result;
};

// const getMyChatList = async (userId: string, query: Record<string, any>) => {
//   const baseFilter = {
//     users: { $all: [new Types.ObjectId(userId)] },
//   };

//   // STEP 1 - Use QueryBuilder
//   const chatQuery = new QueryBuilder(Chat.find(baseFilter), query)
//     .customSearch((queryRef, searchTerm) => {
//       queryRef.populate({
//         path: "users",
//         select: "nameemail profileImage",
//         match: {
//           _id: { $ne: userId },
//           name: { $regex: searchTerm, $options: "i" }
//         }
//       });
//     })
//     .sort()        // supports ?sort=-createdAt
//     .paginate()    // supports ?page & ?limit
//     .fields();     // supports ?fields=

//   const chats = await chatQuery.modelQuery;

//   if (!chats || chats.length === 0) {
//     return { meta: await chatQuery.countTotal(), result: [] };
//   }

//   const list: any[] = [];

//   for (const chatItem of chats) {
//     if (!chatItem.users.length) continue;

//     const chatId = chatItem._id;

//     // STEP 2 - Find last message
//     const lastMessage = await Message.findOne({ chat: chatId })
//       .sort({ updatedAt: -1 })
//       .select("text images sender updatedAt");

//     // STEP 3 - Count unread
//     const unreadMessageCount = await Message.countDocuments({
//       chat: chatId,
//       seen: false,
//       sender: { $ne: userId },
//     });

//     list.push({
//       chat: chatItem,
//       lastMessage: lastMessage?.text || null,
//       images: lastMessage?.images || [],
//       lastMessageSender: lastMessage?.sender || null,
//       unreadMessageCount,
//       lastMessageCreatedAt: lastMessage?.updatedAt || null,
//     });
//   }

//   // STEP 4 — Sort manually by lastMessage time
//   list.sort((a, b) => {
//     const A = a.lastMessageCreatedAt ? new Date(a.lastMessageCreatedAt).getTime() : 0;
//     const B = b.lastMessageCreatedAt ? new Date(b.lastMessageCreatedAt).getTime() : 0;
//     return B - A;
//   });

//   const meta = await chatQuery.countTotal();

//   return { meta, result: list };
// };

const getMyChatList = async (userId: string, query: any) => {


  // Build the query object to filter the chats
  const filterQuery: any = { users: { $all: [new Types.ObjectId(userId)] } };

  const chats = await Chat.find(filterQuery).populate({
    path: 'users',
    select: 'name profileImage email _id',
    match: { _id: { $ne: userId } },
  });

  // ✅ Instead of throwing error, just return empty array
  if (!chats || chats.length === 0) {
    return [];
  }

  const data: any[] = [];

  for (const chatItem of chats) {
    if (!chatItem.users.length) continue;

    const chatId = chatItem._id;

    // optional search filter for chat user name
    if (query.search) {
      const matched = chatItem.users.filter((user) =>
        (user as any).name?.toLowerCase().includes(query.search.toLowerCase())
      );
      if (!matched.length) continue;
    }

    // Find the latest message (no populate)
    const message = await Message.findOne({ chat: chatId })
      .sort({ updatedAt: -1 })
      .select('text images sender updatedAt');

    // Count unread messages for this user
    const unreadMessageCount = await Message.countDocuments({
      chat: chatId,
      seen: false,
      sender: { $ne: userId },
    });

    data.push({
      chat: chatItem,
      lastMessage: message?.text  || null,
      images: message?.images || [],
      lastMessageSender: message?.sender || null, // 👈 only sender _id
      unreadMessageCount,
      lastMessageCreatedAt: (message as any)?.updatedAt || null,
    });
  }

  // Sort chats by last message time (descending)
  data.sort((a, b) => {
    const dateA = a.lastMessageCreatedAt
      ? new Date(a.lastMessageCreatedAt).getTime()
      : 0;
    const dateB = b.lastMessageCreatedAt
      ? new Date(b.lastMessageCreatedAt).getTime()
      : 0;
    return dateB - dateA;
  });

  return data;
};


const getAdminChatList = async (adminId: string, query: any) => {
  const { role, search } = query; 
  // role = candidate | employer

  if (![USER_ROLE.CANDIDATE, USER_ROLE.EMPLOYER].includes(role)) {
    throw new Error('Invalid role type for admin chat list');
  }

  const chats = await Chat.find({
    users: { $all: [new Types.ObjectId(adminId)] },
  }).populate({
    path: 'users',
    select: 'name profileImage email role _id',
    match: {
      _id: { $ne: adminId },
      role: role, // 🔥 filter by candidate / employer
    },
  });

  if (!chats || chats.length === 0) return [];

  const data: any[] = [];

  for (const chatItem of chats) {
    if (!chatItem.users.length) continue;

    const chatId = chatItem._id;

    // optional search filter for chat user name
    if (query.search) {
      const matched = chatItem.users.filter((user) =>
        (user as any).name?.toLowerCase().includes(query.search.toLowerCase())
      );
      if (!matched.length) continue;
    }

    // Find the latest message (no populate)
    const message = await Message.findOne({ chat: chatId })
      .sort({ updatedAt: -1 })
      .select('text images sender updatedAt');

    // Count unread messages for this user
    const unreadMessageCount = await Message.countDocuments({
      chat: chatId,
      seen: false,
      sender: { $ne: adminId },
    });

    data.push({
      chat: chatItem,
      lastMessage: message?.text  || null,
      images: message?.images || [],
      lastMessageSender: message?.sender || null, // 👈 only sender _id
      unreadMessageCount,
      lastMessageCreatedAt: (message as any)?.updatedAt || null,
    });
  }

  // Sort chats by last message time (descending)
  data.sort((a, b) => {
    const dateA = a.lastMessageCreatedAt
      ? new Date(a.lastMessageCreatedAt).getTime()
      : 0;
    const dateB = b.lastMessageCreatedAt
      ? new Date(b.lastMessageCreatedAt).getTime()
      : 0;
    return dateB - dateA;
  });

  return data;
};


const getChatById = async (chatId: string) => {
  const result = await Chat.findById(chatId);

  // If no chat is found, throw an AppError
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Chat not found');
  }

  return result;
};

const leaveUserFromSpecific = async (payload: any) => {
  const { chatId, userId, fullName } = payload; // Expect chatId and userId in the payload

  // Check if chatId is provided
  if (!chatId) {
    throw new Error('Chat ID is required'); // Throw an error for the caller to handle
  }

  // Check if userId is provided
  if (!userId) {
    throw new Error('User ID is required');
  }

  // Find the chat
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new Error('Chat not found');
  }

  // Check if the user is part of the chat
  if (!chat.users.includes(userId)) {
    throw new Error('You are not part of this chat');
  }

  // // Remove the user from the chat
  chat.users = chat.users.filter((user) => user.toString() !== userId);

  // // If the user is an admin in a group chat, remove them from groupAdmins
  // if (chat.isGroupChat) {
  //   (chat as any).groupAdmins = (chat as any).groupAdmins.filter(
  //     (admin: any) => admin.toString() !== userId,
  //   );
  // }
  // // Save the updated chat
  await chat.save();

  await Message.create({
    sender: userId,
    text: `${fullName} has left the chat`,
    isLeft: true,
    chat: chatId,
  });

  // Return success message
  return 'User has left the chat successfully';
};

export const ChatService = {
  createChatWithAdmin,
  addNewChat,
  getMyChatList,
  getAdminChatList,
  // getConnectionUsersOfSpecificUser,
  // getOnlineConnectionUsersOfSpecificUser,
  // getUserChats,
  getChatById,
  leaveUserFromSpecific,
};
