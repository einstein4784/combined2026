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


