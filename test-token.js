// d:\mmbot\mmbot\test-token.js

// No need for node-fetch import in Node.js 18+ ✅
const SERVER_URL = 'https://api.gcbtoken.io';

// ============================================
// Test Token by Fetching Balance
// ============================================
async function testToken(token) {
  console.log('\n🧪 Testing Token...\n');
  console.log(`Token: ${token.substring(0, 20)}...${token.substring(token.length - 10)}\n`);
  
  try {
    // Test 1: Get User Balance
    console.log('📊 Test 1: Fetching User Balance...');
    const balanceResponse = await fetch(`${SERVER_URL}/api/users/balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ accountType: 1 }),
    });

    const balanceData = await balanceResponse.json();
    
    if (balanceData.code === '0') {
      console.log('✅ Token is VALID!\n');
      console.log('💰 Account Balance:');
      console.log('─────────────────────────────────');
      
      if (balanceData.data?.coinList) {
        balanceData.data.coinList.forEach(coin => {
          console.log(`  ${coin.coinName.padEnd(8)} | Available: ${coin.count.padEnd(15)} | Frozen: ${coin.frozenCount || '0'}`);
        });
      }
      console.log('─────────────────────────────────\n');
      
      return { valid: true, data: balanceData.data };
    } else {
      console.log('❌ Token is INVALID or EXPIRED\n');
      console.log(`Error Code: ${balanceData.code}`);
      console.log(`Error Message: ${balanceData.msg}\n`);
      
      return { valid: false, error: balanceData.msg };
    }
  } catch (error) {
    console.log('❌ Connection Error\n');
    console.log(`Error: ${error.message}\n`);
    return { valid: false, error: error.message };
  }
}

// ============================================
// Run Test
// ============================================
const TOKEN = process.argv[2];

if (!TOKEN) {
  console.log('\n❌ Error: No token provided\n');
  console.log('Usage: node test-token.js YOUR_TOKEN_HERE\n');
  console.log('Example: node test-token.js eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\n');
  process.exit(1);
}

// Make sure server is running
console.log(`\n⚠️  Make sure your server is running on ${SERVER_URL}\n`);

testToken(TOKEN).then(result => {
  if (result.valid) {
    console.log('✅ Test completed successfully!\n');
    process.exit(0);
  } else {
    console.log('❌ Test failed!\n');
    process.exit(1);
  }
});