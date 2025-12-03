// API Client for I&C Insurance Brokers
const API_BASE_URL = 'http://localhost:3001/api';

class APIClient {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include'
        };

        try {
            const response = await fetch(url, config);
            
            // Check if response is JSON
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                throw new Error(text || 'Request failed');
            }
            
            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            console.error('URL:', url);
            console.error('Options:', config);
            throw error;
        }
    }

    // Authentication
    async login(username, password) {
        return this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }

    async logout() {
        try {
            const response = await fetch(`${API_BASE_URL}/logout`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Logout error:', error);
            // Return success even if there's an error, so logout can proceed
            return { success: true };
        }
    }

    async getCurrentUser() {
        return this.request('/me');
    }

    // Customers
    async getCustomers() {
        return this.request('/customers');
    }

    async getCustomer(id) {
        return this.request(`/customers/${id}`);
    }

    async createCustomer(data) {
        return this.request('/customers', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateCustomer(id, data) {
        return this.request(`/customers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteCustomer(id) {
        return this.request(`/customers/${id}`, {
            method: 'DELETE'
        });
    }

    // Policies
    async getPolicies() {
        return this.request('/policies');
    }

    async getPolicy(id) {
        return this.request(`/policies/${id}`);
    }

    async createPolicy(data) {
        return this.request('/policies', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updatePolicy(id, data) {
        return this.request(`/policies/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // Payments
    async getPayments() {
        return this.request('/payments');
    }

    async getPaymentsByPolicy(policyId) {
        return this.request(`/payments/policy/${policyId}`);
    }

    async createPayment(data) {
        return this.request('/payments', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Receipts
    async getReceipt(receiptNumber) {
        return this.request(`/receipts/${receiptNumber}`);
    }

    // Reports
    async getDailyCashStatement(date) {
        const query = date ? `?date=${date}` : '';
        return this.request(`/reports/daily-cash-statement${query}`);
    }

    // Dashboard
    async getDashboardStats() {
        return this.request('/dashboard/stats');
    }

    // Users
    async getUsers() {
        return this.request('/users');
    }

    async createUser(data) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateUser(id, data) {
        return this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteUser(id) {
        return this.request(`/users/${id}`, {
            method: 'DELETE'
        });
    }
}

const api = new APIClient();

