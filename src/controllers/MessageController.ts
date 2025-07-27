import TelegramBot from 'node-telegram-bot-api';
import fetch from 'node-fetch';
import { UserService } from '../services/UserService';
import { MessageService } from '../services/MessageService';
import { SmsService, SmsServer } from '../services/SmsService';
import { PhoneNumberDetector } from '../services/PhoneNumberDetector';
import { MessageType } from '../models/Message';
import { Logger } from '../utils/Logger';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { MessageFormatter } from '../utils/MessageFormatter';
import { NumberRequestService } from '../services/NumberRequestService';
import { CountryIconMapper } from '../utils/CountryIconMapper';

export class MessageController {
  private logger = Logger.getInstance();
  private numberRequestService: NumberRequestService;

  constructor(
    private bot: TelegramBot,
    private userService: UserService,
    private messageService: MessageService,
    private smsService: SmsService,
    private authMiddleware: AuthMiddleware
  ) {
    this.numberRequestService = new NumberRequestService();
  }

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

      // Handle "Get Number" button - start country selection
      if (data === 'get_number' || data === 'get_numbers' || data === 'request_number') {
        await this.handleGetNumberButton(callbackQuery, user, msg);
        return;
      }

      // Handle "My Numbers" button
      if (data === 'my_numbers') {
        await this.handleMyNumbersButton(callbackQuery, user, msg);
        return;
      }

      // Handle "Account Info" button
      if (data === 'account_info') {
        await this.handleAccountInfoButton(callbackQuery, user, msg);
        return;
      }

      // Handle "Check Balance" button
      if (data === 'check_balance') {
        await this.handleCheckBalanceButton(callbackQuery, user, msg);
        return;
      }

      // Handle back to countries navigation
      if (data === 'back_to_countries') {
        await this.handleGetNumberButton(callbackQuery, user, msg);
        return;
      }

      // Handle country selection for number requests
      if (data.startsWith('country_')) {
        await this.handleCountrySelection(callbackQuery, user, msg, data);
        return;
      }

      // Handle clean range button selection
      if (data.startsWith('range_')) {
        await this.handleRangeSelection(callbackQuery, user, msg, data);
        return;
      }

      // Handle quantity selection for number requests
      if (data.startsWith('quantity_')) {
        await this.handleQuantitySelection(callbackQuery, user, msg, data);
        return;
      }

      // Handle number selection from range (DEPRECATED - now uses quantity selection)
      if (data.startsWith('number_')) {
        // Redirect to range selection instead
        const parts = data.replace('number_', '').split('_');
        const countryId = parts[0];
        const rangeNumber = parts[1];
        await this.handleRangeSelection(callbackQuery, user, msg, `range_${countryId}_${rangeNumber}`);
        return;
      }

      // Handle country pagination
      if (data.startsWith('countries_')) {
        await this.handleCountryPagination(callbackQuery, user, msg, data);
        return;
      }

      // Handle range pagination
      if (data.startsWith('ranges_')) {
        await this.handleRangePagination(callbackQuery, user, msg, data);
        return;
      }

      // Handle show all numbers from range
      if (data.startsWith('all_numbers_')) {
        await this.handleShowAllNumbers(callbackQuery, user, msg, data);
        return;
      }

      // Handle copy numbers action
      if (data.startsWith('copy_numbers_')) {
        await this.safeAnswerCallbackQuery(callbackQuery.id, { 
          text: '📋 Numbers are displayed above - copy them manually!' 
        });
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

  // ===============================================
  // 📊 CLEAN RANGE BUTTON SYSTEM
  // ===============================================

  /**
   * Handle "Get Number" button - show country selection
   */
  private async handleGetNumberButton(callbackQuery: any, user: any, msg: any): Promise<void> {
    try {
      this.logger.info(`User ${user.getDisplayName()} clicked Get Number button`);
      
      // Get all available countries
      const countries = await this.numberRequestService.getAvailableCountries();
      
      if (!countries || countries.length === 0) {
        await this.bot.editMessageText(
          `❌ No countries available at the moment.\n\n` +
          `Please try again later or contact support.`,
          {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            parse_mode: 'Markdown'
          }
        );
        await this.safeAnswerCallbackQuery(callbackQuery.id, { text: '❌ No countries available' });
        return;
      }

      // Create country buttons (16 per page)
      const keyboard: any[][] = [];
      const itemsPerPage = 16;
      const page = 1; // Start with page 1
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, countries.length);
      const totalPages = Math.ceil(countries.length / itemsPerPage);

      // Add country buttons (2 per row for better readability)
      for (let i = startIndex; i < endIndex; i += 2) {
        const row = [];
        
        for (let j = i; j < Math.min(i + 2, endIndex); j++) {
          const country = countries[j];
          const countryDisplayName = CountryIconMapper.getCompactCountryName(country.country);
          
          row.push({
            text: countryDisplayName, // Already includes flag icon
            callback_data: `country_${country.id}`
          });
        }
        
        keyboard.push(row);
      }

      // Navigation buttons
      const navButtons = [];
      if (page > 1) {
        navButtons.push({
          text: '⬅️ Previous',
          callback_data: `countries_${page - 1}`
        });
      }
      if (page < totalPages) {
        navButtons.push({
          text: 'Next ➡️',
          callback_data: `countries_${page + 1}`
        });
      }
      if (navButtons.length > 0) {
        keyboard.push(navButtons);
      }

      // Cancel button
      keyboard.push([
        { text: '❌ Cancel', callback_data: 'sms_cancel' }
      ]);

      const text = 
        `🌍 **Select Country** (Page ${page}/${totalPages})\n` +
        `📊 **${countries.length}** countries available\n\n` +
        `💡 Choose a country to see available number ranges\n\n` +
        `🎯 **Professional SMS Numbers** - Get yours now!`;

      await this.bot.editMessageText(text, {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

      await this.safeAnswerCallbackQuery(callbackQuery.id, { 
        text: `🌍 ${countries.length} countries available` 
      });

    } catch (error) {
      this.logger.error('Error handling get number button:', error);
      await this.safeAnswerCallbackQuery(callbackQuery.id, { text: '❌ Error loading countries' });
    }
  }

  /**
   * Handle "My Numbers" button - show user's active numbers
   */
  private async handleMyNumbersButton(callbackQuery: any, user: any, msg: any): Promise<void> {
    try {
      this.logger.info(`User ${user.getDisplayName()} clicked My Numbers button`);
      
      // For now, show a placeholder message
      // TODO: Implement actual number history/management
      const text = 
        `📋 **My Numbers**\n\n` +
        `👤 **User**: ${user.getDisplayName()}\n` +
        `📊 **Active Numbers**: Coming soon...\n\n` +
        `🚧 **Under Development**\n` +
        `This feature will show your active phone numbers, their status, and allow you to manage them.\n\n` +
        `💡 For now, use **"📱 Get Number"** to request new numbers.`;

      const keyboard = [
        [
          { text: '📱 Get Number', callback_data: 'get_number' },
          { text: '🔄 Refresh', callback_data: 'my_numbers' }
        ],
        [
          { text: '❌ Close', callback_data: 'sms_cancel' }
        ]
      ];

      await this.bot.editMessageText(text, {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

      await this.safeAnswerCallbackQuery(callbackQuery.id, { 
        text: '📋 My Numbers (Coming Soon)' 
      });

    } catch (error) {
      this.logger.error('Error handling my numbers button:', error);
      await this.safeAnswerCallbackQuery(callbackQuery.id, { text: '❌ Error loading numbers' });
    }
  }

  /**
   * Handle "Account Info" button - show user account details
   */
  private async handleAccountInfoButton(callbackQuery: any, user: any, msg: any): Promise<void> {
    try {
      this.logger.info(`User ${user.getDisplayName()} clicked Account Info button`);
      
      // Get user account information
      const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const text = 
        `📊 **Account Information**\n\n` +
        `👤 **User**: ${user.getDisplayName()}\n` +
        `🆔 **ID**: \`${user.telegramId}\`\n` +
        `📅 **Joined**: ${joinDate}\n` +
        `✅ **Status**: ${user.isAuthorized ? '✅ Authorized' : '❌ Unauthorized'}\n` +
        `🚫 **Banned**: ${user.isBanned ? '❌ Yes' : '✅ No'}\n` +
        `💰 **Balance**: ${user.getFormattedBalance()}\n` +
        `📱 **Total Requests**: Coming soon...\n\n` +
        `🎯 **Account Type**: ${user.isAuthorized ? 'Premium User' : 'Limited Access'}\n\n` +
        `💡 **Account Features**:\n` +
        `${user.isAuthorized ? '✅' : '❌'} Access to 111+ countries\n` +
        `${user.isAuthorized ? '✅' : '❌'} SMS number requests\n` +
        `${user.isAuthorized ? '✅' : '❌'} Real-time SMS retrieval\n` +
        `${user.isAuthorized ? '✅' : '❌'} Balance management`;

      const keyboard = [
        [
          { text: '💎 Check Balance', callback_data: 'check_balance' },
          { text: '📱 Get Number', callback_data: 'get_number' }
        ],
        [
          { text: '📋 My Numbers', callback_data: 'my_numbers' },
          { text: '🔄 Refresh Info', callback_data: 'account_info' }
        ],
        [
          { text: '❌ Close', callback_data: 'sms_cancel' }
        ]
      ];

      await this.bot.editMessageText(text, {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

      await this.safeAnswerCallbackQuery(callbackQuery.id, { 
        text: '📊 Account information loaded' 
      });

    } catch (error) {
      this.logger.error('Error handling account info button:', error);
      await this.safeAnswerCallbackQuery(callbackQuery.id, { text: '❌ Error loading account info' });
    }
  }

  /**
   * Handle "Check Balance" button - show user balance details
   */
  private async handleCheckBalanceButton(callbackQuery: any, user: any, msg: any): Promise<void> {
    try {
      this.logger.info(`User ${user.getDisplayName()} clicked Check Balance button`);
      
      const text = 
        `💎 **Balance Information**\n\n` +
        `👤 **User**: ${user.getDisplayName()}\n` +
        `💰 **Current Balance**: ${user.getFormattedBalance()}\n` +
        `📊 **Balance Status**: ${parseFloat(user.balance) > 0 ? '✅ Positive' : '⚠️ Zero/Negative'}\n\n` +
        `📈 **Recent Activity**:\n` +
        `• Last updated: Just now\n` +
        `• Recent transactions: Coming soon...\n` +
        `• Spending history: Coming soon...\n\n` +
        `💡 **Balance Usage**:\n` +
        `• SMS number requests: Varies by country\n` +
        `• Message retrieval: Included with numbers\n` +
        `• Premium features: Contact admin\n\n` +
        `🎯 **Need more balance?** Contact the administrator for top-up options.`;

      const keyboard = [
        [
          { text: '📊 Account Info', callback_data: 'account_info' },
          { text: '📱 Get Number', callback_data: 'get_number' }
        ],
        [
          { text: '📋 My Numbers', callback_data: 'my_numbers' },
          { text: '🔄 Refresh Balance', callback_data: 'check_balance' }
        ],
        [
          { text: '❌ Close', callback_data: 'sms_cancel' }
        ]
      ];

      await this.bot.editMessageText(text, {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

      await this.safeAnswerCallbackQuery(callbackQuery.id, { 
        text: `💎 Balance: ${user.getFormattedBalance()}` 
      });

    } catch (error) {
      this.logger.error('Error handling check balance button:', error);
      await this.safeAnswerCallbackQuery(callbackQuery.id, { text: '❌ Error loading balance' });
    }
  }

  /**
   * Handle country selection - show clean range buttons
   */
  private async handleCountrySelection(callbackQuery: any, user: any, msg: any, data: string): Promise<void> {
    try {
      const countryId = data.replace('country_', '');
      
      this.logger.info(`Fetching ranges for country: ${countryId}`);
      
      // Get available ranges for this country
      const ranges = await this.numberRequestService.getNumberRanges(countryId);
      
      if (!ranges || ranges.length === 0) {
        await this.bot.editMessageText(
          `❌ No ranges available for the selected country.\n\n` +
          `Please try another country or contact support.`,
          {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            parse_mode: 'Markdown'
          }
        );
        await this.safeAnswerCallbackQuery(callbackQuery.id, { text: '❌ No ranges available' });
        return;
      }

      // Get country info by looking up the countryId
      const allCountries = await this.numberRequestService.getAvailableCountries();
      const selectedCountry = allCountries.find(c => c.id === countryId);
      
      let countryIcon = '🌍';
      let countryName = 'Unknown Country';
      
      if (selectedCountry) {
        countryIcon = CountryIconMapper.getCountryIcon(selectedCountry.country);
        countryName = CountryIconMapper.getCompactCountryName(selectedCountry.country);
      }

      // Create clean range buttons (16 per page)
      const keyboard: any[][] = [];
      const itemsPerPage = 16;
      const page = 1; // Start with page 1
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, ranges.length);
      const totalPages = Math.ceil(ranges.length / itemsPerPage);

      // Add clean range buttons - NO EXTRA TEXT!
      for (let i = startIndex; i < endIndex; i += 2) {
        const row = [];
        
        // First range button
        const range1 = ranges[i];
        row.push({
          text: `📊 Range ${range1.numberRange}`, // CLEAN - no "(20 numbers)" text!
          callback_data: `range_${countryId}_${range1.numberRange}`
        });
        
        // Second range button (if exists)
        if (i + 1 < endIndex) {
          const range2 = ranges[i + 1];
          row.push({
            text: `📊 Range ${range2.numberRange}`, // CLEAN - no extra text!
            callback_data: `range_${countryId}_${range2.numberRange}`
          });
        }
        
        keyboard.push(row);
      }

      // Navigation buttons
      const navButtons = [];
      if (page > 1) {
        navButtons.push({
          text: '⬅️ Previous',
          callback_data: `ranges_${countryId}_${page - 1}`
        });
      }
      if (page < totalPages) {
        navButtons.push({
          text: 'Next ➡️',
          callback_data: `ranges_${countryId}_${page + 1}`
        });
      }
      if (navButtons.length > 0) {
        keyboard.push(navButtons);
      }

      // Back buttons
      keyboard.push([
        { text: '🌍 Back to Countries', callback_data: 'back_to_countries' },
        { text: '❌ Cancel', callback_data: 'sms_cancel' }
      ]);

      const text = 
        `📊 **Available Ranges** - ${countryIcon} ${countryName}\n\n` +
        `📋 **${ranges.length}** ranges available\n` +
        `💡 Click a range to see all numbers in that range\n\n` +
        (totalPages > 1 ? `📄 Page ${page}/${totalPages}\n\n` : '') +
        `🎯 **Clean range buttons** - no clutter!`;

      await this.bot.editMessageText(text, {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

      await this.safeAnswerCallbackQuery(callbackQuery.id, { 
        text: `📊 ${ranges.length} ranges available` 
      });

    } catch (error) {
      this.logger.error('Error handling country selection:', error);
      await this.safeAnswerCallbackQuery(callbackQuery.id, { text: '❌ Error loading ranges' });
    }
  }

  /**
   * Handle range selection - show quantity buttons for number requests
   */
  private async handleRangeSelection(callbackQuery: any, user: any, msg: any, data: string): Promise<void> {
    try {
      // Parse: range_countryId_rangeNumber
      const parts = data.replace('range_', '').split('_');
      const countryId = parts[0];
      const rangeNumber = parts.slice(1).join('_'); // Handle ranges with underscores
      
      this.logger.info(`User ${user.getDisplayName()} selected range: ${rangeNumber} in country: ${countryId}`);
      
      // Get country info by looking up the countryId  
      const allCountries = await this.numberRequestService.getAvailableCountries();
      const selectedCountry = allCountries.find(c => c.id === countryId);
      
      let countryIcon = '🌍';
      let countryName = 'Unknown Country';
      
      if (selectedCountry) {
        countryIcon = CountryIconMapper.getCountryIcon(selectedCountry.country);
        countryName = CountryIconMapper.getCompactCountryName(selectedCountry.country);
      }

      // Create quantity selection buttons
      const keyboard: any[][] = [];
      
      // Quantity options: 1, 2, 5, 10, 20
      const quantities = [1, 2, 5, 10, 20];
      
      // Add quantity buttons (2 per row)
      for (let i = 0; i < quantities.length; i += 2) {
        const row = [];
        
        for (let j = i; j < Math.min(i + 2, quantities.length); j++) {
          const qty = quantities[j];
          row.push({
            text: `📱 ${qty} Number${qty > 1 ? 's' : ''}`,
            callback_data: `quantity_${countryId}_${rangeNumber}_${qty}`
          });
        }
        
        keyboard.push(row);
      }

      // Back buttons
      keyboard.push([
        { text: '📊 Back to Ranges', callback_data: `country_${countryId}` },
        { text: '🌍 Back to Countries', callback_data: 'back_to_countries' }
      ]);

      keyboard.push([
        { text: '❌ Cancel', callback_data: 'sms_cancel' }
      ]);

      const text = 
        `📱 **Range ${rangeNumber}** - ${countryIcon} ${countryName}\n\n` +
        `🎯 **Select Quantity**\n` +
        `Choose how many numbers you want to request from this range:\n\n` +
        `🔢 **Available Quantities**:`;

      await this.bot.editMessageText(text, {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

      await this.safeAnswerCallbackQuery(callbackQuery.id, { 
        text: `� Range ${rangeNumber} - Select quantity` 
      });

    } catch (error) {
      this.logger.error('Error handling range selection:', error);
      await this.safeAnswerCallbackQuery(callbackQuery.id, { text: '❌ Error loading range' });
    }
  }

  /**
   * Handle number selection from range - assign the number
   */
  private async handleNumberSelection(callbackQuery: any, user: any, msg: any, data: string): Promise<void> {
    try {
      // Parse: number_countryId_rangeNumber_phoneNumber
      const parts = data.replace('number_', '').split('_');
      const countryId = parts[0];
      const rangeNumber = parts[1];
      const phoneNumber = parts.slice(2).join('_'); // Handle numbers with underscores
      
      this.logger.info(`Assigning number: ${phoneNumber} from range: ${rangeNumber} to user: ${user.getDisplayName()}`);
      
      // Get country info by looking up the countryId
      const allCountries = await this.numberRequestService.getAvailableCountries();
      const selectedCountry = allCountries.find(c => c.id === countryId);
      
      let countryIcon = '🌍';
      let countryName = 'Unknown Country';
      
      if (selectedCountry) {
        countryIcon = CountryIconMapper.getCountryIcon(selectedCountry.country);
        countryName = CountryIconMapper.getCompactCountryName(selectedCountry.country);
      }

      // Success message
      const text = 
        `✅ **Phone Number Assigned!**\n\n` +
        `📱 **Your Number**: \`${phoneNumber}\`\n` +
        `🌍 **Country**: ${countryIcon} ${countryName}\n` +
        `📊 **Range**: ${rangeNumber}\n` +
        `⏰ **Status**: ✅ Active\n` +
        `⚡ **Ready**: Yes - can receive SMS immediately\n\n` +
        `🎉 **Ready to receive SMS!**\n\n` +
        `💡 Use this number for verification codes, OTP, etc.`;

      const keyboard = [
        [
          { text: '📨 Check SMS', callback_data: `sms_server1_${phoneNumber}` },
          { text: '🔄 Get Another', callback_data: `country_${countryId}` }
        ],
        [
          { text: '🌍 Back to Countries', callback_data: 'back_to_countries' },
          { text: '❌ Done', callback_data: 'sms_cancel' }
        ]
      ];

      await this.bot.editMessageText(text, {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

      await this.safeAnswerCallbackQuery(callbackQuery.id, { 
        text: `✅ Number ${phoneNumber} assigned!` 
      });

      // Log successful assignment
      this.logger.info(`✅ Successfully assigned number ${phoneNumber} from range ${rangeNumber} to user ${user.getDisplayName()}`);

    } catch (error) {
      this.logger.error('Error handling number selection:', error);
      await this.safeAnswerCallbackQuery(callbackQuery.id, { text: '❌ Error assigning number' });
    }
  }

  // ===============================================
  // 📄 PAGINATION HANDLERS
  // ===============================================

  /**
   * Handle country pagination - navigate between country pages
   */
  private async handleCountryPagination(callbackQuery: any, user: any, msg: any, data: string): Promise<void> {
    try {
      const page = parseInt(data.replace('countries_', ''));
      
      this.logger.info(`User ${user.getDisplayName()} navigating to country page: ${page}`);
      
      // Get all available countries
      const countries = await this.numberRequestService.getAvailableCountries();
      
      if (!countries || countries.length === 0) {
        await this.safeAnswerCallbackQuery(callbackQuery.id, { text: '❌ No countries available' });
        return;
      }

      // Create country buttons for this page
      const keyboard: any[][] = [];
      const itemsPerPage = 16;
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, countries.length);
      const totalPages = Math.ceil(countries.length / itemsPerPage);

      // Validate page number
      if (page < 1 || page > totalPages) {
        await this.safeAnswerCallbackQuery(callbackQuery.id, { text: '❌ Invalid page number' });
        return;
      }

      // Add country buttons (2 per row)
      for (let i = startIndex; i < endIndex; i += 2) {
        const row = [];
        
        for (let j = i; j < Math.min(i + 2, endIndex); j++) {
          const country = countries[j];
          const countryDisplayName = CountryIconMapper.getCompactCountryName(country.country);
          
          row.push({
            text: countryDisplayName,
            callback_data: `country_${country.id}`
          });
        }
        
        keyboard.push(row);
      }

      // Navigation buttons
      const navButtons = [];
      if (page > 1) {
        navButtons.push({
          text: '⬅️ Previous',
          callback_data: `countries_${page - 1}`
        });
      }
      if (page < totalPages) {
        navButtons.push({
          text: 'Next ➡️',
          callback_data: `countries_${page + 1}`
        });
      }
      if (navButtons.length > 0) {
        keyboard.push(navButtons);
      }

      // Cancel button
      keyboard.push([
        { text: '❌ Cancel', callback_data: 'sms_cancel' }
      ]);

      const text = 
        `🌍 **Select Country** (Page ${page}/${totalPages})\n` +
        `📊 **${countries.length}** countries available\n\n` +
        `💡 Choose a country to see available number ranges\n\n` +
        `🎯 **Professional SMS Numbers** - Get yours now!`;

      await this.bot.editMessageText(text, {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

      await this.safeAnswerCallbackQuery(callbackQuery.id, { 
        text: `📄 Page ${page}/${totalPages}` 
      });

    } catch (error) {
      this.logger.error('Error handling country pagination:', error);
      await this.safeAnswerCallbackQuery(callbackQuery.id, { text: '❌ Error loading page' });
    }
  }

  /**
   * Handle range pagination - navigate between range pages for a country
   */
  private async handleRangePagination(callbackQuery: any, user: any, msg: any, data: string): Promise<void> {
    try {
      // Parse: ranges_countryId_pageNumber
      const parts = data.replace('ranges_', '').split('_');
      const countryId = parts[0];
      const page = parseInt(parts[1]);
      
      this.logger.info(`User ${user.getDisplayName()} navigating to range page: ${page} for country: ${countryId}`);
      
      // Get available ranges for this country
      const ranges = await this.numberRequestService.getNumberRanges(countryId);
      
      if (!ranges || ranges.length === 0) {
        await this.safeAnswerCallbackQuery(callbackQuery.id, { text: '❌ No ranges available' });
        return;
      }

      // Get country info
      const allCountries = await this.numberRequestService.getAvailableCountries();
      const selectedCountry = allCountries.find(c => c.id === countryId);
      
      let countryIcon = '🌍';
      let countryName = 'Unknown Country';
      
      if (selectedCountry) {
        countryIcon = CountryIconMapper.getCountryIcon(selectedCountry.country);
        countryName = CountryIconMapper.getCompactCountryName(selectedCountry.country);
      }

      // Create range buttons for this page
      const keyboard: any[][] = [];
      const itemsPerPage = 16;
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, ranges.length);
      const totalPages = Math.ceil(ranges.length / itemsPerPage);

      // Validate page number
      if (page < 1 || page > totalPages) {
        await this.safeAnswerCallbackQuery(callbackQuery.id, { text: '❌ Invalid page number' });
        return;
      }

      // Add clean range buttons - NO EXTRA TEXT! (2 per row)
      for (let i = startIndex; i < endIndex; i += 2) {
        const row = [];
        
        // First range button
        const range1 = ranges[i];
        row.push({
          text: `📊 Range ${range1.numberRange}`,
          callback_data: `range_${countryId}_${range1.numberRange}`
        });
        
        // Second range button (if exists)
        if (i + 1 < endIndex) {
          const range2 = ranges[i + 1];
          row.push({
            text: `📊 Range ${range2.numberRange}`,
            callback_data: `range_${countryId}_${range2.numberRange}`
          });
        }
        
        keyboard.push(row);
      }

      // Navigation buttons
      const navButtons = [];
      if (page > 1) {
        navButtons.push({
          text: '⬅️ Previous',
          callback_data: `ranges_${countryId}_${page - 1}`
        });
      }
      if (page < totalPages) {
        navButtons.push({
          text: 'Next ➡️',
          callback_data: `ranges_${countryId}_${page + 1}`
        });
      }
      if (navButtons.length > 0) {
        keyboard.push(navButtons);
      }

      // Back buttons
      keyboard.push([
        { text: '🌍 Back to Countries', callback_data: 'back_to_countries' },
        { text: '❌ Cancel', callback_data: 'sms_cancel' }
      ]);

      const text = 
        `📊 **Available Ranges** - ${countryIcon} ${countryName}\n\n` +
        `📋 **${ranges.length}** ranges available\n` +
        `💡 Click a range to see all numbers in that range\n\n` +
        (totalPages > 1 ? `📄 Page ${page}/${totalPages}\n\n` : '') +
        `🎯 **Clean range buttons** - no clutter!`;

      await this.bot.editMessageText(text, {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

      await this.safeAnswerCallbackQuery(callbackQuery.id, { 
        text: `📄 Range page ${page}/${totalPages}` 
      });

    } catch (error) {
      this.logger.error('Error handling range pagination:', error);
      await this.safeAnswerCallbackQuery(callbackQuery.id, { text: '❌ Error loading page' });
    }
  }

  /**
   * Handle show all numbers - display all numbers from a specific range
   */
  private async handleShowAllNumbers(callbackQuery: any, user: any, msg: any, data: string): Promise<void> {
    try {
      // Parse: all_numbers_countryId_rangeNumber
      const parts = data.replace('all_numbers_', '').split('_');
      const countryId = parts[0];
      const rangeNumber = parts.slice(1).join('_');
      
      this.logger.info(`User ${user.getDisplayName()} requesting all numbers for range: ${rangeNumber}`);
      
      // Generate all numbers from this range
      const allNumbers = await this.numberRequestService.getAvailablePhoneNumbers(countryId);
      
      // Filter numbers that belong to this specific range
      const numbers = allNumbers
        .filter(num => num.range === rangeNumber)
        .map(num => num.number);
      
      if (!numbers || numbers.length === 0) {
        await this.bot.editMessageText(
          `❌ No numbers available in range ${rangeNumber}.\n\n` +
          `This range might be fully occupied or expired.`,
          {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            parse_mode: 'Markdown'
          }
        );
        await this.safeAnswerCallbackQuery(callbackQuery.id, { text: '❌ No numbers in range' });
        return;
      }

      // Get country info
      const allCountries = await this.numberRequestService.getAvailableCountries();
      const selectedCountry = allCountries.find(c => c.id === countryId);
      
      let countryIcon = '🌍';
      let countryName = 'Unknown Country';
      
      if (selectedCountry) {
        countryIcon = CountryIconMapper.getCountryIcon(selectedCountry.country);
        countryName = CountryIconMapper.getCompactCountryName(selectedCountry.country);
      }

      // Create number selection buttons (4 per row, all numbers)
      const keyboard: any[][] = [];
      
      for (let i = 0; i < numbers.length; i += 4) {
        const row = [];
        
        for (let j = i; j < Math.min(i + 4, numbers.length); j++) {
          const number = numbers[j];
          row.push({
            text: `📱 ${number}`,
            callback_data: `number_${countryId}_${rangeNumber}_${number}`
          });
        }
        
        keyboard.push(row);
      }

      // Back buttons
      keyboard.push([
        { text: '📊 Back to Ranges', callback_data: `country_${countryId}` },
        { text: '🌍 Back to Countries', callback_data: 'back_to_countries' }
      ]);

      keyboard.push([
        { text: '❌ Cancel', callback_data: 'sms_cancel' }
      ]);

      const text = 
        `📱 **All Numbers in Range ${rangeNumber}** - ${countryIcon} ${countryName}\n\n` +
        `📊 **Total Numbers**: ${numbers.length}\n` +
        `💡 **Status**: ✅ Active\n\n` +
        `📋 **Complete List**:\n` +
        `_All ${numbers.length} numbers are shown below. Click any number to assign it._\n\n` +
        `🎮 **Select Your Number**:`;

      await this.bot.editMessageText(text, {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

      await this.safeAnswerCallbackQuery(callbackQuery.id, { 
        text: `📋 Showing all ${numbers.length} numbers` 
      });

    } catch (error) {
      this.logger.error('Error handling show all numbers:', error);
      await this.safeAnswerCallbackQuery(callbackQuery.id, { text: '❌ Error loading numbers' });
    }
  }

  /**
   * Handle quantity selection - request numbers from API
   */
  private async handleQuantitySelection(callbackQuery: any, user: any, msg: any, data: string): Promise<void> {
    // Parse: quantity_countryId_rangeNumber_quantity
    const parts = data.replace('quantity_', '').split('_');
    const countryId = parts[0];
    const rangeNumber = parts[1];
    const quantity = parseInt(parts[2]);
    
    try {
      this.logger.info(`User ${user.getDisplayName()} requesting ${quantity} numbers from range ${rangeNumber} in country ${countryId}`);
      
      // Show loading message
      await this.bot.editMessageText(
        `⏳ **Requesting Numbers...**\n\n` +
        `📊 Range: ${rangeNumber}\n` +
        `📱 Quantity: ${quantity}\n` +
        `💰 Estimated cost: $${(quantity * 0.00622).toFixed(4)}\n\n` +
        `Please wait while we process your request...`,
        {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          parse_mode: 'Markdown'
        }
      );

      // Make API call to request numbers using the service
      const purchasedNumbers = await this.numberRequestService.requestPhoneNumbersByQuantity(
        countryId, // Use the country's destination ID, not the user's telegram ID
        quantity,
        rangeNumber
      );

      // Get country info for display
      const allCountries = await this.numberRequestService.getAvailableCountries();
      const selectedCountry = allCountries.find(c => c.id === countryId);
      
      let countryIcon = '🌍';
      let countryName = 'Unknown Country';
      
      if (selectedCountry) {
        countryIcon = CountryIconMapper.getCountryIcon(selectedCountry.country);
        countryName = CountryIconMapper.getCompactCountryName(selectedCountry.country);
      }

      // Format the purchased numbers for display - simple list only
      const numbersOnly = purchasedNumbers.map(n => n.number).join('\n');
      
      const keyboard = [
        [{
          text: '📋 Copy All Numbers',
          callback_data: `copy_numbers_${Date.now()}` // Unique ID to prevent conflicts
        }],
        [{
          text: '🔄 Request More Numbers',
          callback_data: `country_${countryId}`
        }],
        [{
          text: '🏠 Main Menu',
          callback_data: 'get_number'
        }]
      ];

      const successText = 
        `🎉 **Numbers Successfully Purchased!**\n\n` +
        `${countryIcon} **Country**: ${countryName}\n` +
        `📊 **Range**: ${rangeNumber}\n` +
        `📱 **Quantity**: ${purchasedNumbers.length}\n\n` +
        `⚠️ **IMPORTANT WARNING**:\n` +
        `• These numbers will **NOT be shown again**!\n` +
        `• Valid for **24 hours** only\n` +
        `• Copy them NOW or lose access forever!\n\n` +
        `� **Your Numbers**:\n` +
        `\`\`\`\n${numbersOnly}\n\`\`\`\n\n` +
        `🔥 **Save these numbers immediately!**`;

      await this.bot.editMessageText(successText, {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

      await this.safeAnswerCallbackQuery(callbackQuery.id, { 
        text: `🎉 ${purchasedNumbers.length} numbers purchased successfully!` 
      });

    } catch (error) {
      this.logger.error('Error requesting numbers:', error);
      
      let errorMessage = '';
      let errorButtons = [];
      
      if (error instanceof Error && error.message.includes('Authentication failed')) {
        errorMessage = 
          `🔐 **Authentication Required**\n\n` +
          `❌ Your session has expired or is invalid.\n\n` +
          `**Please try the following**:\n` +
          `1. Go to the main menu\n` +
          `2. Use "Get Number" to refresh your session\n` +
          `3. Try your request again\n\n` +
          `If the problem persists, please contact support.`;
          
        errorButtons = [
          [{ text: '🔄 Refresh Session', callback_data: 'get_number' }],
          [{ text: '🏠 Main Menu', callback_data: 'get_number' }]
        ];
      } else {
        errorMessage = 
          `❌ **Failed to Request Numbers**\n\n` +
          `😞 Sorry, there was an error processing your request.\n\n` +
          `**Possible reasons**:\n` +
          `• Numbers in this range are sold out\n` +
          `• Insufficient account balance\n` +
          `• API service temporarily unavailable\n` +
          `• Authentication issues\n\n` +
          `Please try again later or contact support.`;
          
        errorButtons = [
          [{ text: '🔄 Try Again', callback_data: `range_${countryId}_${rangeNumber}` }],
          [{ text: '🏠 Main Menu', callback_data: 'get_number' }]
        ];
      }

      await this.bot.editMessageText(errorMessage, {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: errorButtons }
      });

      await this.safeAnswerCallbackQuery(callbackQuery.id, { text: '❌ Request failed' });
    }
  }
}
