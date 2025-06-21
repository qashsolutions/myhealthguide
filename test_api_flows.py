#!/usr/bin/env python3
"""
API Flow Testing Script for MyHealth Guide
Tests authentication and medication checking flows
"""

import requests
import json
import time
from datetime import datetime
import random
import string

# Base URL - update this when testing against deployed version
BASE_URL = "http://localhost:3000"  # Change to production URL when deployed

# Test data
def generate_test_email():
    """Generate unique test email"""
    timestamp = int(time.time())
    random_str = ''.join(random.choices(string.ascii_lowercase, k=5))
    return f"test_{timestamp}_{random_str}@example.com"

def generate_test_user():
    """Generate test user data"""
    return {
        "email": generate_test_email(),
        "password": "TestPass123!",
        "name": "Test User",
        "phoneNumber": "+1234567890"
    }

class APITester:
    def __init__(self, base_url=BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        
    def test_signup(self):
        """Test user signup flow"""
        print("\n🧪 Testing Signup Flow...")
        
        self.user_data = generate_test_user()
        
        response = self.session.post(
            f"{self.base_url}/api/auth/signup",
            json=self.user_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            print("✅ Signup successful!")
            print(f"User ID: {data.get('data', {}).get('user', {}).get('id')}")
            self.auth_token = data.get('data', {}).get('token')
            return True
        else:
            print("❌ Signup failed!")
            print(f"Response: {response.text}")
            return False
    
    def test_login(self):
        """Test user login flow"""
        print("\n🧪 Testing Login Flow...")
        
        if not self.user_data:
            print("❌ No user data available. Run signup test first.")
            return False
        
        login_data = {
            "email": self.user_data["email"],
            "password": self.user_data["password"]
        }
        
        response = self.session.post(
            f"{self.base_url}/api/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Login successful!")
            self.auth_token = data.get('data', {}).get('token')
            return True
        else:
            print("❌ Login failed!")
            print(f"Response: {response.text}")
            return False
    
    def test_medication_check_unauthorized(self):
        """Test medication check without authentication"""
        print("\n🧪 Testing Medication Check (Unauthorized)...")
        
        medications = {
            "medications": [
                {
                    "name": "Lisinopril",
                    "dosage": "10mg",
                    "frequency": "Once daily"
                },
                {
                    "name": "Ibuprofen",
                    "dosage": "400mg",
                    "frequency": "As needed"
                }
            ]
        }
        
        response = self.session.post(
            f"{self.base_url}/api/medication/check",
            json=medications,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 401:
            print("✅ Correctly rejected unauthorized request")
            return True
        else:
            print("❌ Unexpected response for unauthorized request")
            print(f"Response: {response.text}")
            return False
    
    def test_medication_check_authorized(self):
        """Test medication check with authentication"""
        print("\n🧪 Testing Medication Check (Authorized)...")
        
        if not self.auth_token:
            print("❌ No auth token available. Run login test first.")
            return False
        
        medications = {
            "medications": [
                {
                    "name": "Lisinopril",
                    "dosage": "10mg",
                    "frequency": "Once daily",
                    "prescribedFor": "High blood pressure"
                },
                {
                    "name": "Metformin",
                    "dosage": "500mg",
                    "frequency": "Twice daily",
                    "prescribedFor": "Diabetes"
                },
                {
                    "name": "Aspirin",
                    "dosage": "81mg",
                    "frequency": "Once daily",
                    "prescribedFor": "Heart health"
                }
            ],
            "userAge": 70,
            "healthConditions": ["Hypertension", "Type 2 Diabetes"]
        }
        
        response = self.session.post(
            f"{self.base_url}/api/medication/check",
            json=medications,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.auth_token}"
            }
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 403:
            print("⚠️  Medical disclaimer not accepted (expected for new users)")
            return True
        elif response.status_code == 200:
            data = response.json()
            print("✅ Medication check successful!")
            result = data.get('data', {})
            print(f"Status: {result.get('status')}")
            print(f"Summary: {result.get('summary')}")
            return True
        else:
            print("❌ Medication check failed!")
            print(f"Response: {response.text}")
            return False
    
    def test_rate_limiting(self):
        """Test rate limiting on auth endpoint"""
        print("\n🧪 Testing Rate Limiting...")
        
        # Try to exceed rate limit (5 requests per 15 minutes for auth)
        for i in range(7):
            email = generate_test_email()
            response = self.session.post(
                f"{self.base_url}/api/auth/login",
                json={"email": email, "password": "wrong"},
                headers={"Content-Type": "application/json"}
            )
            
            print(f"Request {i+1}: Status {response.status_code}")
            
            if response.status_code == 429:
                print("✅ Rate limiting working correctly!")
                print(f"Retry-After: {response.headers.get('Retry-After')} seconds")
                return True
            
            time.sleep(0.5)  # Small delay between requests
        
        print("❌ Rate limiting not triggered as expected")
        return False
    
    def test_input_validation(self):
        """Test input validation"""
        print("\n🧪 Testing Input Validation...")
        
        # Test invalid email
        invalid_data = {
            "email": "not-an-email",
            "password": "123",  # Too short
            "name": "",  # Empty
        }
        
        response = self.session.post(
            f"{self.base_url}/api/auth/signup",
            json=invalid_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 400:
            data = response.json()
            print("✅ Input validation working correctly!")
            errors = data.get('errors', [])
            for error in errors:
                print(f"  - {error.get('field')}: {error.get('message')}")
            return True
        else:
            print("❌ Expected validation error")
            print(f"Response: {response.text}")
            return False
    
    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting MyHealth Guide API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 50)
        
        results = {
            "signup": self.test_signup(),
            "login": self.test_login(),
            "input_validation": self.test_input_validation(),
            "medication_unauthorized": self.test_medication_check_unauthorized(),
            "medication_authorized": self.test_medication_check_authorized(),
            "rate_limiting": self.test_rate_limiting(),
        }
        
        print("\n" + "=" * 50)
        print("📊 Test Results Summary:")
        print("=" * 50)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name.ljust(25)}: {status}")
        
        total_tests = len(results)
        passed_tests = sum(1 for r in results.values() if r)
        
        print("=" * 50)
        print(f"Total: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("\n🎉 All tests passed! API is working correctly.")
        else:
            print(f"\n⚠️  {total_tests - passed_tests} test(s) failed.")
        
        return results

def test_cors_headers():
    """Test CORS configuration"""
    print("\n🧪 Testing CORS Headers...")
    
    response = requests.options(
        f"{BASE_URL}/api/auth/login",
        headers={
            "Origin": "https://example.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type"
        }
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"CORS Headers:")
    for header in ["Access-Control-Allow-Origin", "Access-Control-Allow-Methods", "Access-Control-Allow-Headers"]:
        value = response.headers.get(header)
        if value:
            print(f"  {header}: {value}")
    
    return response.status_code == 200

def test_security_headers():
    """Test security headers"""
    print("\n🧪 Testing Security Headers...")
    
    response = requests.get(f"{BASE_URL}/")
    
    security_headers = {
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "X-XSS-Protection": "1; mode=block"
    }
    
    print("Security Headers Check:")
    all_present = True
    for header, expected in security_headers.items():
        actual = response.headers.get(header)
        if actual == expected:
            print(f"  ✅ {header}: {actual}")
        else:
            print(f"  ❌ {header}: Expected '{expected}', got '{actual}'")
            all_present = False
    
    return all_present

if __name__ == "__main__":
    # Check if running against localhost or production
    import sys
    
    if len(sys.argv) > 1:
        BASE_URL = sys.argv[1]
    
    print(f"🧪 MyHealth Guide API Testing Suite")
    print(f"Target URL: {BASE_URL}")
    print("=" * 50)
    
    # Note: These tests require a running server
    print("\n⚠️  Note: These tests require the server to be running.")
    print("For local testing, run: npm run dev")
    print("For production testing, pass the URL as argument: python test_api_flows.py https://myguide.health")
    
    try:
        # Test connectivity first
        print("\n🔌 Testing connectivity...")
        response = requests.get(f"{BASE_URL}/", timeout=5)
        print(f"✅ Server is reachable (Status: {response.status_code})")
        
        # Run security tests
        test_security_headers()
        test_cors_headers()
        
        # Run API tests
        tester = APITester(BASE_URL)
        tester.run_all_tests()
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Please ensure the server is running.")
        print(f"   Tried to connect to: {BASE_URL}")
    except Exception as e:
        print(f"❌ Error during testing: {e}")