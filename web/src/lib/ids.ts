export function generateReceiptNumber() {
  const now = new Date();
  const timestamp = now.getTime();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  const year = now.getFullYear();
  return `RCP-${timestamp}-${random}-${year}`;
}

export function generatePolicyNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `POL-${timestamp}-${random}`;
}

/**
 * Generate a unique customer ID
 * Format: CUST-YYYYMMDD-XXXX where XXXX is a random 4-digit number
 */
export async function generateCustomerId(Customer: any): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    const customerId = `CUST-${year}${month}${day}-${random}`;
    
    // Check if this ID already exists
    const existing = await Customer.findOne({ idNumber: customerId }).lean();
    if (!existing) {
      return customerId;
    }
    
    attempts++;
  }
  
  // Fallback if we couldn't generate a unique ID in maxAttempts
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000);
  return `CUST-${timestamp}-${random}`;
}


