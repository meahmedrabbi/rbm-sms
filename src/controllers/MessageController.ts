import TelegramBot from 'node-telegram-bot-api';
import { UserService } from '../services/UserService';
import { MessageService } from '../services/MessageService';
import { SmsService, SmsServer } from '../services/SmsService';
import { PhoneNumberDetector } from '../services/PhoneNumberDetector';
import { MessageType } from '../models/Message';
import { Logger } from '../utils/Logger';
import { AuthMiddleware } from '../middleware/AuthMiddleware';

export class MessageController {
  private logger = Logger.getInstance();

  constructor(
    private bot: TelegramBot,
    private userService: UserService,
    private messageService: MessageService,
    private smsService: SmsService,
    private authMiddleware: AuthMiddleware
  ) {}

  public async handleTextMessage(msg: any): Promise<void> {
    try {
      const user = await this.userService.findOrCreateUser(msg.from);
      
      if (!user.isAuthorized) {
        await this.handleUnauthorizedMessage(msg, user);
        return;
      }

      await this.messageService.saveMessage({
        userId: user.id,
        telegramMessageId: msg.message_id,
        type: MessageType.TEXT,
        content: msg.text,
        metadata: {
          chatId: msg.chat.id,
          date: msg.date,
        },
      });

      this.logger.info(`Text message received from ${user.getDisplayName()}: ${msg.text?.substring(0, 50)}...`);

      const phoneNumbers = PhoneNumberDetector.detectPhoneNumbers(msg.text || '');
      
      if (phoneNumbers.length > 0) {
        await this.handlePhoneNumberDetected(msg, user, phoneNumbers);
      } else {
        await this.handleRegularMessage(msg, user);
      }

    } catch (error) {
      this.logger.error('Error handling text message:', error);
      await this.bot.sendMessage(msg.chat.id, 'Sorry, an error occurred while processing your message.');
    }
  }

  public async handleMediaMessage(msg: any, type: MessageType): Promise<void> {
    try {
      const user = await this.userService.findOrCreateUser(msg.from);
      
      await this.messageService.saveMessage({
        userId: user.id,
        telegramMessageId: msg.message_id,
        type: type,
        content: msg.caption || `${type} message`,
        metadata: {
          chatId: msg.chat.id,
          date: msg.date,
          fileId: msg.photo?.[0]?.file_id || msg.video?.file_id || msg.audio?.file_id || msg.document?.file_id || msg.sticker?.file_id,
          location: msg.location,
        },
      });

      this.logger.info(`${type} message received from ${user.getDisplayName()}`);
      
      const response = `✅ ${type.charAt(0).toUpperCase() + type.slice(1)} received. Send a phone number to check SMS.`;
      await this.bot.sendMessage(msg.chat.id, response);

    } catch (error) {
      this.logger.error(`Error handling ${type} message:`, error);
      await this.bot.sendMessage(msg.chat.id, 'Sorry, an error occurred.');
    }
  }

  public async handleCallbackQuery(callbackQuery: any): Promise<void> {
    try {
      const data = callbackQuery.data;
      const msg = callbackQuery.message;
      const user = await this.userService.findOrCreateUser(callbackQuery.from);

      if (!user.isAuthorized) {
        await this.safeAnswerCallbackQuery(callbackQuery.id, { text: '❌ Unauthorized' });
        return;
      }

      if (data === 'sms_cancel') {
        await this.bot.editMessageText('❌ SMS check cancelled.', {
          chat_id: msg.chat.id,
          message_id: msg.message_id
        });
        await this.safeAnswerCallbackQuery(callbackQuery.id, { text: 'Cancelled' });
        return;
      }

      if (data.startsWith('sms_server1_') || data.startsWith('sms_server2_')) {
        const server = data.startsWith('sms_server1_') ? SmsServer.SERVER_1 : SmsServer.SERVER_2;
        const phoneNumber = data.replace(/^sms_server[12]_/, '');
        
        await this.processPhoneNumberWithServer(callbackQuery, user, phoneNumber, server);
      }

      if (data.startsWith('sms_refresh_')) {
        const parts = data.replace('sms_refresh_', '').split('_');
        const server = parts[0] === 'server1' ? SmsServer.SERVER_1 : SmsServer.SERVER_2;
        const phoneNumber = parts.slice(1).join('_');
        
        await this.processPhoneNumberWithServer(callbackQuery, user, phoneNumber, server);
      }

      if (data.startsWith('sms_back_')) {
        const phoneNumber = data.replace('sms_back_', '');
        
        // Show server selection again
        const keyboard = {
          inline_keyboard: [
            [
              { text: '⚡ Fast Server', callback_data: `sms_server1_${phoneNumber}` },
              { text: '🔗 Real SMS API', callback_data: `sms_server2_${phoneNumber}` }
            ],
            [
              { text: '❌ Cancel', callback_data: 'sms_cancel' }
            ]
          ]
        };

        await this.bot.editMessageText(
          `📱 Choose server for phone number: ${phoneNumber}\n\n` +
          '⚡ **Fast Server**: Quick mock responses\n' +
          '🔗 **Real SMS API**: Actual SMS data (slower)',
          {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            reply_markup: keyboard,
            parse_mode: 'Markdown'
          }
        );
        
        await this.safeAnswerCallbackQuery(callbackQuery.id, { text: '🔙 Back to server selection' });
        return;
      }

    } catch (error) {
      this.logger.error('Error handling callback query:', error);
      await this.safeAnswerCallbackQuery(callbackQuery.id, { text: 'Error occurred' });
    }
  }

  private async safeAnswerCallbackQuery(callbackQueryId: string, options: any): Promise<void> {
    try {
      await this.bot.answerCallbackQuery(callbackQueryId, options);
    } catch (error: any) {
      // Ignore timeout errors for old callback queries
      if (error.response?.body?.error_code === 400 && 
          error.response?.body?.description?.includes('query is too old')) {
        this.logger.info('Callback query too old, ignoring');
        return;
      }
      // Re-throw other errors
      throw error;
    }
  }

  private async handleUnauthorizedMessage(msg: any, user: any): Promise<void> {
    const adminContact = this.authMiddleware.getAdminContact();
    
    let response = '';
    if (user.isBanned) {
      response = `🚫 Your account is banned. Contact admin: ${adminContact}`;
    } else {
      response = `⚠️ You need authorization to use SMS services. Contact admin: ${adminContact}`;
    }
    
    await this.bot.sendMessage(msg.chat.id, response);
  }

  private async handlePhoneNumberDetected(msg: any, user: any, phoneNumbers: string[]): Promise<void> {
    if (phoneNumbers.length === 1) {
      await this.processSinglePhoneNumber(msg, user, phoneNumbers[0]);
    } else {
      await this.processMultiplePhoneNumbers(msg, user, phoneNumbers);
    }
  }

  private async processSinglePhoneNumber(msg: any, user: any, phoneNumber: string): Promise<void> {
    const formattedNumber = PhoneNumberDetector.formatPhoneNumber(phoneNumber);
    
    if (user.balance < 0.50) {
      const adminContact = this.authMiddleware.getAdminContact();
      await this.bot.sendMessage(msg.chat.id, `💰 Insufficient balance. Required: $0.50. Contact admin: ${adminContact}`);
      return;
    }

    const response = `📱 **SMS Check for ${formattedNumber}**\n\n` +
      `**Select Server:**\n\n` +
      `🚀 **Server 1 (Fast)** - Mock/Demo service\n` +
      `⚡ **Server 2 (Real API)** - Live SMS retrieval\n\n` +
      `Choose your preferred server option:`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🚀 Server 1 (Fast)', callback_data: `sms_server1_${phoneNumber}` },
          { text: '⚡ Server 2 (Real API)', callback_data: `sms_server2_${phoneNumber}` }
        ],
        [
          { text: '❌ Cancel', callback_data: 'sms_cancel' }
        ]
      ]
    };

    await this.bot.sendMessage(msg.chat.id, response, { 
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  private async processMultiplePhoneNumbers(msg: any, user: any, phoneNumbers: string[]): Promise<void> {
    let response = `📱 **Multiple Phone Numbers Detected**\n\n`;
    
    response += `Found ${phoneNumbers.length} phone numbers:\n`;
    phoneNumbers.forEach((phone, index) => {
      const formatted = PhoneNumberDetector.formatPhoneNumber(phone);
      response += `${index + 1}. \`${formatted}\`\n`;
    });
    
    response += `\n💡 **Tip:** Send one phone number at a time.`;
    
    await this.bot.sendMessage(msg.chat.id, response, { parse_mode: 'Markdown' });
  }

  private async handleRegularMessage(msg: any, user: any): Promise<void> {
    const text = msg.text?.trim() || '';
    
    if (text.startsWith('/')) {
      return;
    }
    
    const response = `✅ Message received. Send a phone number to check SMS.`;
    await this.bot.sendMessage(msg.chat.id, response);
  }

  private async processPhoneNumberWithServer(callbackQuery: any, user: any, phoneNumber: string, server: SmsServer): Promise<void> {
    const msg = callbackQuery.message;
    const formattedNumber = PhoneNumberDetector.formatPhoneNumber(phoneNumber);
    
    await this.bot.editMessageText(`🔄 Processing SMS check for ${formattedNumber} via ${server.toUpperCase()}...`, {
      chat_id: msg.chat.id,
      message_id: msg.message_id
    });

    await this.safeAnswerCallbackQuery(callbackQuery.id, { text: `Processing via ${server.toUpperCase()}...` });

    try {
      const smsRequest = await this.smsService.requestSmsWithServer(user.id, phoneNumber, server, msg.message_id);
      const result = await this.smsService.checkSmsViaApiWithServer(phoneNumber, server);
      
      let response = `🔍 **SMS Check Results**\n\n`;
      response += `📱 **Phone:** ${formattedNumber}\n`;
      response += `🏢 **Server:** ${server.toUpperCase()}\n\n`;
      response += result.message;
      
      if (result.success && result.smsContent) {
        response += `\n\n📨 **SMS Content:**\n\`${result.smsContent}\``;
        response += `\n\n💰 **Charged:** $0.50`;
        
        await user.reload();
        response += `\n**New Balance:** ${user.getFormattedBalance()}`;
      } else if (result.charged === false) {
        response += `\n\n💡 **No charges applied**.`;
      }

      response += `\n\n📱 Use buttons below to refresh or try different server.`;

      // Create navigation buttons
      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔄 Refresh', callback_data: `sms_refresh_${server}_${phoneNumber}` },
            { text: ' Back', callback_data: `sms_back_${phoneNumber}` }
          ]
        ]
      };

      // Add timestamp to avoid identical message content
      const timestamp = new Date().toLocaleTimeString();
      response += `\n\n⏰ **Last updated:** ${timestamp}`;

      try {
        await this.bot.editMessageText(response, {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } catch (editError: any) {
        // If message content is identical, just answer the callback
        if (editError.response?.body?.error_code === 400 && 
            editError.response?.body?.description?.includes('message is not modified')) {
          this.logger.info('Message content identical, skipping edit');
          await this.safeAnswerCallbackQuery(callbackQuery.id, { text: 'Results refreshed' });
        } else {
          throw editError;
        }
      }
      
      this.logger.info(`SMS checked by ${user.getDisplayName()} for ${formattedNumber} via ${server} - Result: ${result.success ? 'Found' : 'Not found'}`);

    } catch (error) {
      this.logger.error('Error processing SMS with server:', error);
      await this.bot.editMessageText('❌ Failed to process SMS request. Please try again.', {
        chat_id: msg.chat.id,
        message_id: msg.message_id
      });
    }
  }
}
