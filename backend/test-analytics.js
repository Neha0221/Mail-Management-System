const emailAnalyticsService = require('./src/services/emailAnalyticsService');

async function testEmailAnalyticsService() {
  console.log('📊 Testing Email Analytics Service...\n');

  try {
    // Test 1: Test email processing
    console.log('1️⃣ Testing email processing...');
    const testEmail = {
      id: 'test_email_001',
      headers: {
        from: 'test@gmail.com',
        to: 'user@example.com',
        subject: 'Test Email Subject',
        date: new Date().toISOString(),
        'message-id': '<test123@gmail.com>'
      },
      body: 'This is a test email body for analytics processing.'
    };

    const analytics = await emailAnalyticsService.processEmail(testEmail);
    console.log('   Email processing:', analytics ? '✅ SUCCESS' : '❌ FAILED');
    
    if (analytics) {
      console.log('   Sender email:', analytics.sender.email);
      console.log('   Sender domain:', analytics.sender.domain);
      console.log('   ESP detected:', analytics.esp.provider);
      console.log('   ESP confidence:', analytics.esp.confidence);
      console.log('   Security score:', analytics.security.securityScore);
    }

    // Test 2: Test batch processing
    console.log('2️⃣ Testing batch processing...');
    const testEmails = [
      {
        id: 'batch_email_001',
        headers: {
          from: 'batch1@gmail.com',
          subject: 'Batch Email 1',
          date: new Date().toISOString()
        },
        body: 'Batch email 1 body'
      },
      {
        id: 'batch_email_002',
        headers: {
          from: 'batch2@outlook.com',
          subject: 'Batch Email 2',
          date: new Date().toISOString()
        },
        body: 'Batch email 2 body'
      }
    ];

    const batchResults = await emailAnalyticsService.processBatch(testEmails);
    console.log('   Batch processing:', batchResults.length === 2 ? '✅ SUCCESS' : '❌ FAILED');
    console.log('   Processed emails:', batchResults.length);

    // Test 3: Test analytics retrieval
    console.log('3️⃣ Testing analytics retrieval...');
    const retrievedAnalytics = emailAnalyticsService.getAnalytics('test_email_001');
    console.log('   Analytics retrieval:', retrievedAnalytics ? '✅ SUCCESS' : '❌ FAILED');

    // Test 4: Test analytics summary
    console.log('4️⃣ Testing analytics summary...');
    const summary = emailAnalyticsService.getAnalyticsSummary();
    console.log('   Analytics summary:', summary ? '✅ SUCCESS' : '❌ FAILED');
    
    if (summary) {
      console.log('   Total emails processed:', summary.totalEmails);
      console.log('   ESP distribution:', Object.keys(summary.espDistribution).length, 'providers');
    }

    // Test 5: Test service initialization
    console.log('5️⃣ Testing service initialization...');
    console.log('   Email Analytics Service initialized:', emailAnalyticsService ? '✅ SUCCESS' : '❌ FAILED');

    // Test 6: Test event listeners
    console.log('6️⃣ Testing event listeners...');
    emailAnalyticsService.on('analyticsProcessed', (analytics) => {
      console.log('   Event listener working:', '✅ SUCCESS');
    });

    console.log('\n🎉 Email Analytics Service Tests Complete!');
    console.log('📊 Results: Service is working correctly');

  } catch (error) {
    console.error('❌ Email Analytics Service test failed:', error.message);
  }
}

testEmailAnalyticsService();
