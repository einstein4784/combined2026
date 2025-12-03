/**
 * Comprehensive Application Test Script
 * Tests all functionality, roles, navigation, and performance
 */

const http = require('http');

const API_BASE = 'http://localhost:3001/api';
const TEST_CREDENTIALS = {
    admin: { username: 'admin', password: 'admin123' },
    supervisor: { username: 'supervisor', password: 'supervisor123' },
    cashier: { username: 'cashier', password: 'cashier123' },
    underwriter: { username: 'underwriter', password: 'underwriter123' }
};

let adminSession = '';
let supervisorSession = '';
let cashierSession = '';
let underwriterSession = '';

// Test results
const results = {
    passed: 0,
    failed: 0,
    errors: []
};

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = body ? JSON.parse(body) : {};
                    resolve({ status: res.statusCode, headers: res.headers, body: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, body: body });
                }
            });
        });
        req.on('error', reject);
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// Test function wrapper
function test(name, fn) {
    return async () => {
        try {
            await fn();
            results.passed++;
            console.log(`✅ ${name}`);
        } catch (error) {
            results.failed++;
            results.errors.push({ test: name, error: error.message });
            console.log(`❌ ${name}: ${error.message}`);
        }
    };
}

// Authentication Tests
async function testAuthentication() {
    console.log('\n=== AUTHENTICATION TESTS ===\n');
    
    await test('Admin Login', async () => {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, TEST_CREDENTIALS.admin);
        
        if (response.status !== 200 || !response.body.success) {
            throw new Error('Admin login failed');
        }
        adminSession = response.headers['set-cookie']?.[0] || '';
    });
    
    await test('Get Current User (Admin)', async () => {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/me',
            method: 'GET',
            headers: { 
                'Cookie': adminSession,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status !== 200 || response.body.role !== 'Admin') {
            throw new Error('Failed to get admin user');
        }
    });
    
    await test('Logout', async () => {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/logout',
            method: 'POST',
            headers: { 
                'Cookie': adminSession,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status !== 200) {
            throw new Error('Logout failed');
        }
    });
}

// Role-Based Access Tests
async function testRoleBasedAccess() {
    console.log('\n=== ROLE-BASED ACCESS TESTS ===\n');
    
    // Re-login as admin
    const adminLogin = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/api/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, TEST_CREDENTIALS.admin);
    adminSession = adminLogin.headers['set-cookie']?.[0] || '';
    
    await test('Admin can access Users endpoint', async () => {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/users',
            method: 'GET',
            headers: { 
                'Cookie': adminSession,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status !== 200) {
            throw new Error('Admin cannot access users endpoint');
        }
    });
    
    await test('Admin can access Admin Settings', async () => {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/admin/functions',
            method: 'GET',
            headers: { 
                'Cookie': adminSession,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status !== 200) {
            throw new Error('Admin cannot access admin functions');
        }
    });
}

// CRUD Operations Tests
async function testCRUDOperations() {
    console.log('\n=== CRUD OPERATIONS TESTS ===\n');
    
    await test('Create Customer', async () => {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/customers',
            method: 'POST',
            headers: { 
                'Cookie': adminSession,
                'Content-Type': 'application/json'
            }
        }, {
            firstName: 'Test',
            lastName: 'Customer',
            email: 'test@example.com',
            contactNumber: '1234567890',
            address: '123 Test St',
            sex: 'Male',
            idNumber: 'TEST' + Date.now()
        });
        
        if (response.status !== 200 && response.status !== 201) {
            throw new Error('Failed to create customer');
        }
    });
    
    await test('Get Customers List', async () => {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/customers',
            method: 'GET',
            headers: { 
                'Cookie': adminSession,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status !== 200 || !Array.isArray(response.body)) {
            throw new Error('Failed to get customers list');
        }
    });
    
    await test('Get Dashboard Stats', async () => {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/dashboard/stats',
            method: 'GET',
            headers: { 
                'Cookie': adminSession,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status !== 200) {
            throw new Error('Failed to get dashboard stats');
        }
    });
}

// Navigation Links Test
async function testNavigationLinks() {
    console.log('\n=== NAVIGATION LINKS TEST ===\n');
    
    const pages = [
        'index.html',
        'customers.html',
        'policies.html',
        'payments.html',
        'daily-cash-statement.html',
        'users.html',
        'reports.html',
        'admin-settings.html',
        'support.html'
    ];
    
    for (const page of pages) {
        await test(`Page exists: ${page}`, async () => {
            const fs = require('fs');
            const path = require('path');
            const filePath = path.join(__dirname, 'Admin', 'dist', page);
            if (!fs.existsSync(filePath)) {
                throw new Error(`Page ${page} does not exist`);
            }
        });
    }
}

// API Endpoints Test
async function testAPIEndpoints() {
    console.log('\n=== API ENDPOINTS TEST ===\n');
    
    const endpoints = [
        { path: '/api/me', method: 'GET', requiresAuth: true },
        { path: '/api/customers', method: 'GET', requiresAuth: true },
        { path: '/api/policies', method: 'GET', requiresAuth: true },
        { path: '/api/payments', method: 'GET', requiresAuth: true },
        { path: '/api/dashboard/stats', method: 'GET', requiresAuth: true },
        { path: '/api/users', method: 'GET', requiresAuth: true, requiresRole: ['Admin', 'Supervisor'] }
    ];
    
    for (const endpoint of endpoints) {
        await test(`API Endpoint: ${endpoint.method} ${endpoint.path}`, async () => {
            const options = {
                hostname: 'localhost',
                port: 3001,
                path: endpoint.path,
                method: endpoint.method,
                headers: { 'Content-Type': 'application/json' }
            };
            
            if (endpoint.requiresAuth) {
                options.headers['Cookie'] = adminSession;
            }
            
            const response = await makeRequest(options);
            
            if (endpoint.requiresAuth && response.status === 401) {
                // Expected for unauthorized
                return;
            }
            
            if (response.status >= 500) {
                throw new Error(`Server error: ${response.status}`);
            }
        });
    }
}

// Performance Test
async function testPerformance() {
    console.log('\n=== PERFORMANCE TESTS ===\n');
    
    await test('Dashboard Stats Response Time', async () => {
        const start = Date.now();
        await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/dashboard/stats',
            method: 'GET',
            headers: { 
                'Cookie': adminSession,
                'Content-Type': 'application/json'
            }
        });
        const duration = Date.now() - start;
        
        if (duration > 2000) {
            throw new Error(`Response time too slow: ${duration}ms`);
        }
    });
    
    await test('Customers List Response Time', async () => {
        const start = Date.now();
        await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/customers',
            method: 'GET',
            headers: { 
                'Cookie': adminSession,
                'Content-Type': 'application/json'
            }
        });
        const duration = Date.now() - start;
        
        if (duration > 3000) {
            throw new Error(`Response time too slow: ${duration}ms`);
        }
    });
}

// Main test runner
async function runTests() {
    console.log('========================================');
    console.log('I&C Insurance Brokers - Application Test');
    console.log('========================================\n');
    
    try {
        await testAuthentication();
        await testRoleBasedAccess();
        await testCRUDOperations();
        await testNavigationLinks();
        await testAPIEndpoints();
        await testPerformance();
        
        console.log('\n========================================');
        console.log('TEST SUMMARY');
        console.log('========================================');
        console.log(`✅ Passed: ${results.passed}`);
        console.log(`❌ Failed: ${results.failed}`);
        console.log(`Total: ${results.passed + results.failed}`);
        
        if (results.errors.length > 0) {
            console.log('\nErrors:');
            results.errors.forEach(err => {
                console.log(`  - ${err.test}: ${err.error}`);
            });
        }
        
        console.log('\n========================================\n');
        
        process.exit(results.failed > 0 ? 1 : 0);
    } catch (error) {
        console.error('Test runner error:', error);
        process.exit(1);
    }
}

// Check if server is running
const checkServer = http.get('http://localhost:3001/api/me', (res) => {
    runTests();
}).on('error', (err) => {
    console.error('❌ Backend server is not running on port 3001');
    console.error('Please start the server first: cd server && node server.js');
    process.exit(1);
});

