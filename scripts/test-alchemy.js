#!/usr/bin/env node

/**
 * Test script to verify Alchemy API connection
 */

const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY;
const policyId = process.env.NEXT_PUBLIC_ALCHEMY_POLICY_ID || process.env.ALCHEMY_POLICY_ID;

if (!apiKey) {
  console.error('❌ Error: ALCHEMY_API_KEY not set');
  console.log('Set NEXT_PUBLIC_ALCHEMY_API_KEY or ALCHEMY_API_KEY in your .env file');
  process.exit(1);
}

const url = policyId
  ? `https://arb-sepolia.g.alchemy.com/v2/${apiKey}?policyId=${policyId}`
  : `https://arb-sepolia.g.alchemy.com/v2/${apiKey}`;

console.log('🔗 Testing Alchemy API connection...');
console.log(`📍 URL: ${url.replace(apiKey, '***')}`);
console.log('');

// Test 1: Get latest block number
async function testBlockNumber() {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
      }),
    });

    const data = await response.json();
    
    if (data.result) {
      const blockNumber = parseInt(data.result, 16);
      console.log('✅ Test 1: Get Block Number');
      console.log(`   Latest block: ${blockNumber}`);
      return true;
    } else {
      console.log('❌ Test 1: Failed');
      console.log('   Error:', data.error || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.log('❌ Test 1: Failed');
    console.log('   Error:', error.message);
    return false;
  }
}

// Test 2: Get chain ID
async function testChainId() {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        id: 2,
        jsonrpc: '2.0',
        method: 'eth_chainId',
      }),
    });

    const data = await response.json();
    
    if (data.result) {
      const chainId = parseInt(data.result, 16);
      console.log('✅ Test 2: Get Chain ID');
      console.log(`   Chain ID: ${chainId} ${chainId === 421614 ? '(Arbitrum Sepolia ✓)' : '(Wrong chain!)'}`);
      return chainId === 421614;
    } else {
      console.log('❌ Test 2: Failed');
      console.log('   Error:', data.error || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.log('❌ Test 2: Failed');
    console.log('   Error:', error.message);
    return false;
  }
}

// Test 3: Get gas price
async function testGasPrice() {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        id: 3,
        jsonrpc: '2.0',
        method: 'eth_gasPrice',
      }),
    });

    const data = await response.json();
    
    if (data.result) {
      const gasPrice = parseInt(data.result, 16);
      const gasPriceGwei = (gasPrice / 1e9).toFixed(2);
      console.log('✅ Test 3: Get Gas Price');
      console.log(`   Gas Price: ${gasPriceGwei} Gwei`);
      return true;
    } else {
      console.log('❌ Test 3: Failed');
      console.log('   Error:', data.error || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.log('❌ Test 3: Failed');
    console.log('   Error:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Running Alchemy API tests...\n');
  
  const results = await Promise.all([
    testBlockNumber(),
    testChainId(),
    testGasPrice(),
  ]);

  console.log('\n' + '='.repeat(50));
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  if (passed === total) {
    console.log(`✅ All tests passed! (${passed}/${total})`);
    console.log('\n🎉 Your Alchemy API is working correctly!');
    console.log('You can now proceed with deploying contracts and using the app.');
  } else {
    console.log(`⚠️  Some tests failed (${passed}/${total} passed)`);
    console.log('\nPlease check:');
    console.log('1. API key is correct');
    console.log('2. Network is set to Arbitrum Sepolia');
    console.log('3. Alchemy account is active');
  }
  
  process.exit(passed === total ? 0 : 1);
}

runTests();

