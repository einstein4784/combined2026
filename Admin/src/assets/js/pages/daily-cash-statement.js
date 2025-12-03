$(document).ready(function() {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    $('#statementDate').val(today);
    loadStatement();
});

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount || 0);
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

async function loadStatement() {
    const date = $('#statementDate').val();
    
    if (!date) {
        Swal.fire('Error', 'Please select a date', 'error');
        return;
    }

    try {
        const statement = await api.getDailyCashStatement(date);
        
        let tableRows = '';
        if (statement.payments && statement.payments.length > 0) {
            statement.payments.forEach((payment, index) => {
                tableRows += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${payment.receipt_number}</td>
                        <td>${payment.policy_number}</td>
                        <td>${payment.customer_name}</td>
                        <td class="text-end">${formatCurrency(payment.amount)}</td>
                        <td>${payment.payment_method}</td>
                        <td>${formatDateTime(payment.payment_date)}</td>
                        <td>${payment.received_by_name || 'N/A'}</td>
                    </tr>
                `;
            });
        } else {
            tableRows = '<tr><td colspan="8" class="text-center text-muted">No payments recorded for this date</td></tr>';
        }
        
        const statementHTML = `
            <div class="text-center mb-4">
                <h3>I&C Insurance Brokers</h3>
                <h4>Daily Cash Statement</h4>
                <p class="text-muted">Date: ${formatDate(statement.date)}</p>
            </div>
            
            <div class="table-responsive">
                <table class="table table-bordered table-striped">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Receipt Number</th>
                            <th>Policy Number</th>
                            <th>Customer</th>
                            <th class="text-end">Amount</th>
                            <th>Payment Method</th>
                            <th>Payment Date</th>
                            <th>Received By</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                    <tfoot>
                        <tr class="table-info">
                            <th colspan="4" class="text-end">Total:</th>
                            <th class="text-end">${formatCurrency(statement.total)}</th>
                            <th colspan="3">Total Transactions: ${statement.count}</th>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="mt-4">
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Prepared By:</strong> _______________________</p>
                    </div>
                    <div class="col-md-6 text-end">
                        <p><strong>Date:</strong> ${formatDate(new Date().toISOString())}</p>
                    </div>
                </div>
            </div>
        `;
        
        $('#statementContent').html(statementHTML);
        lucide.createIcons();
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
        $('#statementContent').html(`
            <div class="alert alert-danger">
                <h5>Error</h5>
                <p>${error.message}</p>
            </div>
        `);
    }
}


