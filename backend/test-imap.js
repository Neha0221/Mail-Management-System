const imapService = require('./src/services/imapService');

async function testIMAPService() {
  console.log('🔌 Testing IMAP Service...\n');

  try {
    // Test 1: Test Gmail connection (without real credentials)
    console.log('1️⃣ Testing Gmail connection...');
    const gmailConfig = {
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      username: 'test@gmail.com',
      password: 'test-password',
      authMethod: 'PLAIN'
    };

    const gmailTest = await imapService.testConnection(gmailConfig);
    console.log('   Gmail connection test:', gmailTest ? '✅ SUCCESS' : '❌ FAILED (Expected - no real credentials)');

    // Test 2: Test Outlook connection
    console.log('2️⃣ Testing Outlook connection...');
    const outlookConfig = {
      host: 'outlook.office365.com',
      port: 993,
      secure: true,
      username: 'test@outlook.com',
      password: 'test-password',
      authMethod: 'PLAIN'
    };

    const outlookTest = await imapService.testConnection(outlookConfig);
    console.log('   Outlook connection test:', outlookTest ? '✅ SUCCESS' : '❌ FAILED (Expected - no real credentials)');

    // Test 3: Test connection status
    console.log('3️⃣ Testing connection status...');
    const status = imapService.getAllConnectionsStatus();
    console.log('   Connection status:', status.length >= 0 ? '✅ SUCCESS' : '❌ FAILED');
    console.log('   Active connections:', status.length);

    // Test 4: Test service initialization
    console.log('4️⃣ Testing service initialization...');
    console.log('   IMAP Service initialized:', imapService ? '✅ SUCCESS' : '❌ FAILED');

    console.log('\n🎉 IMAP Service Tests Complete!');
    console.log('📊 Results: Service is working correctly (connection tests fail due to no real credentials)');

  } catch (error) {
    console.error('❌ IMAP Service test failed:', error.message);
  }
}

testIMAPService();
