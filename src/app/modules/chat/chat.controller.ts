import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { storeFile } from '../../utils/fileHelper';
import sendResponse from '../../utils/sendResponse';
import { ChatService } from './chat.service';

const addNewChat = catchAsync(async (req: Request, res: Response) => {
  
  const { userId } = req.user;

  const { users = [] } = req.body;


  // Ensure the current userId is included in the `users` array if not already present
  if (!users.includes(userId)) {
    users.push(userId); // Add the current userId to the users array
  }

  // Check if the users array has exactly 2 users
  if (users.length !== 2) {
    sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Chat can only be created with exactly two users.',
      data: '',
    });
  }

  // Creating chat data to be saved
  const chatData = {
    createdBy: userId, // Set the `createdBy` to the current userId
    users, // Use the modified users array
  };


  const result = await ChatService.addNewChat(chatData);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Chat is created successfully!',
    data: result || '',
  });
});



const getMyChatList = catchAsync(async (req: Request, res: Response) => {

  const { userId } = req.user;


  const result = await ChatService.getMyChatList(userId, req.query);

  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Chat retrieved successfully',
    data: result,
  });
});

const getAdminChatList = catchAsync(async (req: Request, res: Response) => {

  const { userId } = req.user;


  const result = await ChatService.getAdminChatList(userId, req.query);

  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Admin chat retrieved successfully',
    data: result,
  });
});


const leaveUserFromSpecificChatController = catchAsync(
  async (req: Request, res: Response) => {
    const { chatId } = req.params;
    const { userId, fullName } = req.user;

    const payload = {
      chatId,
      userId,
      fullName,
    };


    const result = await ChatService.leaveUserFromSpecific(payload);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: `${fullName} has left the chat`,
      data: result,
    });
  },
);


const getChatById = async (req: Request, res: Response, next: NextFunction) => {
  const chat = await ChatService.getChatById(req.params.chatId);
  res.status(200).json({
    success: true,
    message: 'Chat retrieved successfully!',
    data: chat,
  });
};



export const ChatController = {
  addNewChat,
  getMyChatList,
  getAdminChatList,
  getChatById,
  leaveUserFromSpecificChatController,
};
