import TelegramBot from 'node-telegram-bot-api';
import { UserService } from '../services/UserService';
import { MessageService } from '../services/MessageService';
import { SmsService, SmsServer } from '../services/SmsService';
import { PhoneNumberDetector } from '../services/PhoneNumberDetector';
import { MessageType } from '../models/Message';
import { Logger } from '../utils/Logger';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { MessageFormatter } from '../utils/MessageFormatter';

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
      
      const response = MessageFormatter.formatMediaReceived(type);
      await this.bot.sendMessage(msg.chat.id, response, { parse_mode: 'Markdown' });

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
        const cancelMessage = MessageFormatter.formatSmsCancelled();
        await this.bot.editMessageText(cancelMessage, {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          parse_mode: 'Markdown'
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
        
        // Show server selection again using new formatter
        const { text, keyboard } = MessageFormatter.formatPhoneSelection(phoneNumber);

        await this.bot.editMessageText(text, {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          reply_markup: keyboard,
          parse_mode: 'Markdown'
        });
        
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
    const response = MessageFormatter.formatUnauthorized(user.isBanned, adminContact);
    await this.bot.sendMessage(msg.chat.id, response, { parse_mode: 'Markdown' });
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
      const response = MessageFormatter.formatInsufficientBalance('$0.50', adminContact);
      await this.bot.sendMessage(msg.chat.id, response, { parse_mode: 'Markdown' });
      return;
    }

    const { text, keyboard } = MessageFormatter.formatPhoneSelection(phoneNumber);
    await this.bot.sendMessage(msg.chat.id, text, { 
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  private async processMultiplePhoneNumbers(msg: any, user: any, phoneNumbers: string[]): Promise<void> {
    const response = MessageFormatter.formatMultiplePhoneNumbers(phoneNumbers);
    await this.bot.sendMessage(msg.chat.id, response, { parse_mode: 'Markdown' });
  }

  private async handleRegularMessage(msg: any, user: any): Promise<void> {
    const text = msg.text?.trim() || '';
    
    if (text.startsWith('/')) {
      return;
    }
    
    const response = MessageFormatter.formatMessageReceived();
    await this.bot.sendMessage(msg.chat.id, response, { parse_mode: 'Markdown' });
  }

  private async processPhoneNumberWithServer(callbackQuery: any, user: any, phoneNumber: string, server: SmsServer): Promise<void> {
    const msg = callbackQuery.message;
    const formattedNumber = PhoneNumberDetector.formatPhoneNumber(phoneNumber);
    
    const processingMessage = MessageFormatter.formatSmsProcessing(phoneNumber, server);
    await this.bot.editMessageText(processingMessage, {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode: 'Markdown'
    });

    await this.safeAnswerCallbackQuery(callbackQuery.id, { text: `Processing via ${server.toUpperCase()}...` });

    try {
      const smsRequest = await this.smsService.requestSmsWithServer(user.id, phoneNumber, server, msg.message_id);
      const result = await this.smsService.checkSmsViaApiWithServer(phoneNumber, server);
      
      // Reload user to get updated balance
      await user.reload();
      const userBalance = user.getFormattedBalance();
      
      const { text, keyboard } = MessageFormatter.formatSmsResults(phoneNumber, server, result, userBalance);

      try {
        await this.bot.editMessageText(text, {
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
      const errorMessage = MessageFormatter.formatError('Failed to process SMS request. Please try again.');
      await this.bot.editMessageText(errorMessage, {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: 'Markdown'
      });
    }
  }
}
