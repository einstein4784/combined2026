$(document).ready(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const receiptNumber = urlParams.get('receiptNumber');
    
    if (receiptNumber) {
        loadReceipt(receiptNumber);
    } else {
        document.getElementById('receiptDetails').innerHTML = '<div class="alert alert-danger">Receipt number not provided</div>';
    }
});

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount || 0);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

async function loadReceipt(receiptNumber) {
    try {
        const receipt = await api.getReceipt(receiptNumber);
        
        const customerName = `${receipt.first_name} ${receipt.middle_name || ''} ${receipt.last_name}`.trim();
        
        const receiptHTML = `
            <div class="row mb-4">
                <div class="col-md-6">
                    <p><strong>Receipt Number:</strong> ${receipt.receipt_number}</p>
                    <p><strong>Date:</strong> ${formatDate(receipt.payment_date)}</p>
                </div>
                <div class="col-md-6 text-end">
                    <p><strong>Policy Number:</strong> ${receipt.policy_number}</p>
                </div>
            </div>
            
            <hr>
            
            <div class="mb-4">
                <h5>Customer Information</h5>
                <p><strong>Name:</strong> ${customerName}</p>
                <p><strong>ID Number:</strong> ${receipt.id_number}</p>
                <p><strong>Address:</strong> ${receipt.address}</p>
                <p><strong>Email:</strong> ${receipt.email}</p>
                <p><strong>Contact:</strong> ${receipt.contact_number}</p>
            </div>
            
            <hr>
            
            <div class="mb-4">
                <h5>Payment Details</h5>
                <table class="table table-bordered">
                    <tr>
                        <th width="50%">Amount Paid</th>
                        <td class="text-end"><strong>${formatCurrency(receipt.amount)}</strong></td>
                    </tr>
                    <tr>
                        <th>Payment Date</th>
                        <td class="text-end">${formatDate(receipt.payment_date)}</td>
                    </tr>
                    <tr>
                        <th>Received By</th>
                        <td class="text-end">${receipt.generated_by_name || 'N/A'}</td>
                    </tr>
                </table>
            </div>
            
            <div class="text-center mt-5">
                <p class="text-muted">Thank you for your payment!</p>
                <p class="text-muted small">This is a computer-generated receipt.</p>
            </div>
        `;
        
        document.getElementById('receiptDetails').innerHTML = receiptHTML;
    } catch (error) {
        document.getElementById('receiptDetails').innerHTML = `
            <div class="alert alert-danger">
                <h5>Error</h5>
                <p>${error.message}</p>
            </div>
        `;
    }
}



