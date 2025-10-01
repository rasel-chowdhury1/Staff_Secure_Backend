import { Server as SocketIOServer, Socket } from 'socket.io'
import { Server as HttpServer } from 'http'
import express, { Application } from 'express'
import httpStatus from 'http-status'
import AppError from './app/error/AppError'
import { verifyToken } from './app/utils/tokenManage'
import config from './app/config'
import mongoose from 'mongoose'
import { callbackFn } from './app/utils/callbackFn'
import Chat from './app/modules/chat/chat.model'
import moment from 'moment-timezone'
import Message from './app/modules/message/message.model'
import { ChatService } from './app/modules/chat/chat.service'
import { Notification } from './app/modules/notifications/notifications.model'
import { User } from './app/modules/user/user.model'

// Define the socket server port
const socketPort: number = parseInt(process.env.SOCKET_PORT || '9020', 10)

const app: Application = express()

declare module 'socket.io' {
  interface Socket {
    user?: {
      _id: string
      name: string
      email: string
      role: string
    }
  }
}

// Initialize the Socket.IO server
let io: SocketIOServer

export const connectedUsers = new Map<
  string,
  {
    socketID: string
  }
>()

export const initSocketIO = async (server: HttpServer): Promise<void> => {
  const { Server } = await import('socket.io')

  io = new Server(server, {
    cors: {
      origin: '*', // Replace with your client's origin
      methods: ['GET', 'POST'],
      allowedHeaders: ['my-custom-header'], // Add any custom headers if needed
      credentials: true,
    },
  })

  // Start the HTTP server on the specified port
  server.listen(socketPort, () => {
    console.log(
      //@ts-ignore
      `---> Stuff HR Management socket is listening on  : http://${config.ip}:${config.socket_port}`
        .yellow.bold
    )
  })

  // Authentication middleware: now takes the token from headers.
  io.use(async (socket: Socket, next: (err?: any) => void) => {
    // Extract token from headers (ensure your client sends it in headers)
    const token =
      (socket.handshake.auth.token as string) ||
      (socket.handshake.headers.token as string) ||
      (socket.handshake.headers.authorization as string)

    if (!token) {
      return next(
        new AppError(
          httpStatus.UNAUTHORIZED,
          'Authentication error: Token missing'
        )
      )
    }

    // const userDetails = verifyToken({token, access_secret: config.jwt_access_secret as string});

    let userDetails
    try {
      userDetails = verifyToken({
        token,
        access_secret: config.jwt_access_secret as string,
      })
    } catch (err) {
      console.error('Socket JWT verify error:', err)
      return next(new Error('Authentication error: Invalid token'))
    }

    if (!userDetails) {
      return next(new Error('Authentication error: Invalid token'))
    }

    const user = await User.findById(userDetails.userId)
    if (!user) {
      return next(new Error('Authentication error: User not found'))
    }

    socket.user = {
      _id: user._id.toString(), // Convert _id to string if necessary
      name: user.name as string,
      email: user.email,
      role: user.role,
    }
    next()
  })

  io.on('connection', (socket: Socket) => {
    // =================== try catch 1 start ================
    try {
      // Automatically register the connected user to avoid missing the "userConnected" event.
      if (socket.user && socket.user._id) {
        connectedUsers.set(socket.user._id.toString(), { socketID: socket.id })
        console.log(
          `Registered user ${socket.user._id.toString()} with socket ID: ${socket.id}`
        )
      }

      // (Optional) In addition to auto-registering, you can still listen for a "userConnected" event if needed.
      socket.on('userConnected', ({ userId }: { userId: string }) => {
        connectedUsers.set(userId, { socketID: socket.id })
        // console.log(`User ${userId} connected with socket ID: ${socket.id}`)
      })

      //----------------------online array send for front end------------------------//
      io.emit('onlineUser', Array.from(connectedUsers.keys()))

      // ===================== join by user id ================================
      // socket.join(user?._id?.toString());

      // ======= message send ====
      socket.on(
        'send-message',
        async (
          payload: { text: string; images: string[]; chatId: string,from: string },
          callback
        ) => {
          try {
            const { chatId, text, images } = payload
            if (!chatId) {
              return callbackFn(callback, {
                success: false,
                message: 'chatId is required',
              })
            }

            // ✅ Validate chat exists
            const chat = await Chat.findById(chatId).select('users')
            if (!chat) {
              return callbackFn(callback, {
                success: false,
                message: 'Chat not found',
              })
            }

            // ✅ Filter other users in chat
            const receivers = chat.users.filter(
              (u) => u.toString() !== socket.user?._id
            )

            // ✅ Find online users
            const receiverSocketIds = receivers
              .map((u) => connectedUsers.get(u.toString())?.socketID)
              .filter((id): id is string => Boolean(id))

            // ✅ Format time in timezone
            const time = moment()
              .tz('Asia/Dhaka')
              .format('YYYY-MM-DDTHH:mm:ss.SSS')

            // ✅ Create message first (important!)
            const newMessage = await Message.create({
              sender: socket.user?._id,
              chat: chatId,
              text,
              images,
              time,
            })

            // ✅ Outgoing payload
            const messagePayload = {
              success: true,
              chatId,
              sender: {
                _id: socket.user?._id,
                name: socket.user?.name,
                email: socket.user?.email,
                role: socket.user?.role,
              },
              text,
              images,
              time,
              messageId: newMessage._id,
            }

            // ✅ Emit to sender (local message)
            socket.emit(`message_received::${chatId}`, messagePayload)

            // ✅ Emit only if receivers exist
            if (receiverSocketIds.length > 0) {
              socket.emit('newMessage', messagePayload)
              io.to(receiverSocketIds).emit('newMessage', messagePayload)
              io.to(receiverSocketIds).emit(
                `message_received::${chatId}`,
                messagePayload
              )
            }

            if(receiverSocketIds.length === 0){
              emitNotification({
              senderId: socket.user?._id as any,
              receiverId: receivers[0] as any,
              message: `New message from ${payload.from}`,
              type: 'message',
            })
            }

            // ✅ Reply callback
            callbackFn(callback, { success: true, message: messagePayload })
            
          } catch (err: any) {
            console.error('Socket send-message error:', err)
            callbackFn(callback, {
              success: false,
              message: err.message || 'Failed to send message',
            })

            io.emit('io-error', {
              success: false,
              message: 'Error sending message',
            })
          }
        }
      )

      //----------------------chat list start------------------------//
      socket.on('my-chat-list', async ({}, callback) => {
        try {
          const chatList = await ChatService.getMyChatList(
            (socket as any).user._id,
            {}
          )

          const userSocket = connectedUsers.get((socket as any).user._id)

          if (userSocket) {
            io.to(userSocket.socketID).emit('chat-list', chatList)
            callbackFn(callback, { success: true, message: chatList })
          }

          callbackFn(callback, {
            success: false,
            message: 'not found your socket id.',
          })
        } catch (error: any) {
          callbackFn(callback, {
            success: false,
            message: error.message,
          })

          io.emit('io-error', { success: false, message: error.message })
        }
      })
      //----------------------chat list end------------------------//

      //-----------------------Disconnect functionlity start ------------------------//
      socket.on('disconnect', () => {
        console.log(
          `${socket.user?.name} || ${socket.user?.email} || ${socket.user?._id} just disconnected with socket ID: ${socket.id}`
        )

        // Remove user from connectedUsers map
        for (const [key, value] of connectedUsers.entries()) {
          if (value.socketID === socket.id) {
            connectedUsers.delete(key)
            break
          }
        }

        // console.log('connectedUsers', Array.from(connectedUsers))
        io.emit('onlineUser', Array.from(connectedUsers.keys()))
      })
      //-----------------------Disconnect functionlity end ------------------------//
    } catch (error) {
      console.error('-- socket.io connection error --', error)

      // throw new Error(error)
      //-----------------------Disconnect functionlity start ------------------------//
      socket.on('disconnect', () => {
        console.log(
          `${socket.user?.name} || ${socket.user?.email} || ${socket.user?._id} just disconnected with socket ID: ${socket.id}`
        )

        // Remove user from connectedUsers map
        for (const [key, value] of connectedUsers.entries()) {
          if (value.socketID === socket.id) {
            connectedUsers.delete(key)
            break
          }
        }
        // io.emit('onlineUser', Array.from(connectedUsers));
        io.emit('onlineUser', Array.from(connectedUsers.keys()))
      })
      //-----------------------Disconnect functionlity end ------------------------//
    }
    // ==================== try catch 1 end ==================== //
  })
}

// Export the Socket.IO instance
export { io }

export const emitNotification = async ({
  senderId,
  receiverId,
  message,
  type,
}: {
  senderId: mongoose.Types.ObjectId
  receiverId: mongoose.Types.ObjectId
  message: string,
  type?: string
}): Promise<void> => {
  if (!io) {
    throw new Error('Socket.IO is not initialized')
  }

  // Get the socket ID of the specific user
  const userSocket = connectedUsers.get(receiverId.toString())

  // Fetch unread notifications count for the receiver before creating the new notification
  const unreadCount = await Notification.countDocuments({
    receiverId: receiverId,
    isRead: false, // Filter by unread notifications
  })

  // Notify the specific user
  if (message && userSocket) {
    io.to(userSocket.socketID).emit(`notification`, {
      // userId,
      // message: userMsg,
      statusCode: 200,
      success: true,
      unreadCount: unreadCount >= 0 ? unreadCount + 1 : 1,
    })
  }

  // Save notification to the database
  const newNotification = {
    senderId, // Ensure that userId is of type mongoose.Types.ObjectId
    receiverId, // Ensure that receiverId is of type mongoose.Types.ObjectId
    message,
    type,
    isRead: false, // Set to false since the notification is unread initially
    timestamp: new Date(), // Timestamp of when the notification is created
  }

  // Save notification to the database
  await Notification.create(newNotification)
}
