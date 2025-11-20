// Quick test script to verify login endpoint
import dotenv from 'dotenv';
dotenv.config();

const testLogin = async () => {
  const email = process.argv[2] || 'admin@test.com';
  const password = process.argv[3] || 'Admin123!';
  
  console.log('Testing login for:', email);
  console.log('Backend URL: http://localhost:4001');
  console.log('');
  
  try {
    const response = await fetch('http://localhost:4001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const text = await response.text();
    console.log('Response status:', response.status, response.statusText);
    console.log('Response body:', text);
    
    try {
      const json = JSON.parse(text);
      console.log('Parsed JSON:', JSON.stringify(json, null, 2));
      
      if (json.success) {
        console.log('\n✅ Login successful!');
        console.log('User:', json.user);
        console.log('Token present:', !!json.token);
      } else {
        console.log('\n❌ Login failed:', json.error);
      }
    } catch (e) {
      console.log('Response is not JSON:', text);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    console.error('Make sure backend is running on http://localhost:4001');
  }
};

testLogin();

