import * as dotenv from 'dotenv';
import { EnhancedSmsService } from '../services/EnhancedSmsService';

// Load environment variables
dotenv.config();

/**
 * Test script with your actual SMS data
 */
async function testWithActualData() {
  console.log('🧪 TESTING WITH YOUR ACTUAL SMS DATA\n');
  console.log('=' .repeat(50));

  // Your actual SMS data
  const yourSmsData = {
    sender: 'TMDLT',
    text: '751567 est votre numéro pour vérifier ECKT',
    date: '2025.07.27 11:42:47',
    country: 'Togo',
    number: '+22890123456', // Assuming this is the phone number format
    valid: true
  };

  console.log('\n📋 Original SMS Content:');
  console.log('─'.repeat(30));
  console.log('From: TMDLT');
  console.log('Message: 751567 est votre numéro pour vérifier ECKT');
  console.log('Received: 2025.07.27 11:42:47');
  console.log('Country: Togo');

  console.log('\n✨ NEW FORMATTED VERSION:');
  console.log('─'.repeat(30));
  
  // Simulate the new formatting
  const formattedSms = `📱 **From:** ${yourSmsData.sender}\n` +
                      `💬 **Message:** ${yourSmsData.text}\n` +
                      `📅 **Received:** ${yourSmsData.date}\n` +
                      `🌍 **Country:** ${yourSmsData.country}`;
  
  console.log(formattedSms);

  console.log('\n🔧 How it appears in the bot:');
  console.log('─'.repeat(30));
  
  // Simulate the full bot message format
  const fullBotMessage = `✨ **SMS Results**
━━━━━━━━━━━━━━━━━━━━━

📱 **Phone:** \`+22890123456\`
🔗 **Server:** Real API

✅ **Status:** SMS Found!

📄 **Message Content:**
${formattedSms}

💎 **Charge:** $0.50

───────────────────
⏰ **Updated:** ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

  console.log(fullBotMessage);

  console.log('\n🎯 KEY IMPROVEMENTS:');
  console.log('• ❌ Removed code block quotes (```) around SMS content');
  console.log('• ✅ Added clear icons for each field');
  console.log('• ✅ Better visual hierarchy with bold labels');
  console.log('• ✅ Support for multiple SMS messages');
  console.log('• ✅ Consistent formatting throughout the app');
}

testWithActualData().catch(console.error);
