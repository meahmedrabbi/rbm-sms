import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test script to demonstrate the new SMS formatting
 */

// Mock SMS data similar to what you provided
const mockSmsData = [
  {
    sender: 'TMDLT',
    text: '751567 est votre numéro pour vérifier ECKT',
    date: '2025.07.27 11:42:47',
    country: 'Togo',
    number: '+22890123456',
    valid: true
  },
  {
    sender: 'VERIFY',
    text: '892341 is your verification code for MyApp',
    date: '2025.07.27 11:40:12',
    country: 'Togo', 
    number: '+22890123456',
    valid: true
  }
];

// Simulate the new formatting functions
function formatSmsContent(sms: any): string {
  return `📱 **From:** ${sms.sender}\n` +
         `💬 **Message:** ${sms.text}\n` +
         `📅 **Received:** ${sms.date}\n` +
         `🌍 **Country:** ${sms.country}`;
}

function formatMultipleSmsContent(smsMessages: any[]): string {
  if (smsMessages.length === 1) {
    return formatSmsContent(smsMessages[0]);
  }

  let content = `📱 **Found ${smsMessages.length} SMS Messages:**\n\n`;
  
  smsMessages.forEach((sms, index) => {
    content += `**Message ${index + 1}:**\n`;
    content += `📱 **From:** ${sms.sender}\n`;
    content += `💬 **Message:** ${sms.text}\n`;
    content += `📅 **Received:** ${sms.date}\n`;
    content += `🌍 **Country:** ${sms.country}`;
    
    if (index < smsMessages.length - 1) {
      content += '\n\n─────────────────────\n\n';
    }
  });
  
  return content;
}

console.log('🎯 NEW SMS FORMATTING DEMO\n');
console.log('=' .repeat(50));

console.log('\n📱 SINGLE SMS FORMAT:');
console.log('─'.repeat(30));
console.log(formatSmsContent(mockSmsData[0]));

console.log('\n\n📱 MULTIPLE SMS FORMAT:');
console.log('─'.repeat(30));
console.log(formatMultipleSmsContent(mockSmsData));

console.log('\n\n🔍 COMPARISON:');
console.log('─'.repeat(30));
console.log('\n❌ OLD FORMAT (wrapped in code blocks):');
console.log('```');
console.log('From: TMDLT');
console.log('Message: 751567 est votre numéro pour vérifier ECKT');
console.log('Received: 2025.07.27 11:42:47');
console.log('Country: Togo');
console.log('```');

console.log('\n✅ NEW FORMAT (clean with icons):');
console.log(formatSmsContent(mockSmsData[0]));

console.log('\n🎉 Benefits of the new format:');
console.log('• No code block quotes around the message');
console.log('• Clean icons for better readability');
console.log('• Support for multiple SMS messages');
console.log('• Better visual separation between messages');
console.log('• Consistent formatting across the app');
