// Common styles and utilities for email templates
// Using inline CSS for maximum email client compatibility

export const emailStyles = {
  container: `
    font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    color: #333333;
    line-height: 1.6;
  `,
  
  header: `
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    color: white;
    padding: 30px 20px;
    text-align: center;
    border-radius: 8px 8px 0 0;
  `,
  
  title: `
    margin: 0;
    font-size: 24px;
    font-weight: bold;
    text-shadow: 0 1px 2px rgba(0,0,0,0.1);
  `,
  
  content: `
    padding: 30px 20px;
    background-color: #ffffff;
  `,
  
  detailsBox: `
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 20px;
    margin: 20px 0;
  `,
  
  detailsTitle: `
    color: #1f2937;
    font-weight: bold;
    font-size: 16px;
    margin: 0 0 15px 0;
  `,
  
  detailItem: `
    margin: 8px 0;
    padding: 4px 0;
    border-bottom: 1px solid #f1f5f9;
  `,
  
  button: `
    display: inline-block;
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    color: white;
    text-decoration: none;
    padding: 12px 24px;
    border-radius: 6px;
    font-weight: bold;
    text-align: center;
    margin: 20px auto;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  `,
  
  footer: `
    background-color: #f8fafc;
    padding: 20px;
    text-align: center;
    border-top: 1px solid #e2e8f0;
    font-size: 14px;
    color: #64748b;
  `,
  
  divider: `
    height: 1px;
    background: linear-gradient(to right, transparent, #e2e8f0, transparent);
    margin: 30px 0;
    border: none;
  `,
  
  highlight: `
    color: #2563eb;
    font-weight: bold;
  `,
  
  success: `
    color: #059669;
    background-color: #ecfdf5;
    padding: 12px 16px;
    border-radius: 6px;
    border-left: 4px solid #10b981;
    margin: 15px 0;
  `,
  
  warning: `
    color: #d97706;
    background-color: #fffbeb;
    padding: 12px 16px;
    border-radius: 6px;
    border-left: 4px solid #f59e0b;
    margin: 15px 0;
  `,
  
  error: `
    color: #dc2626;
    background-color: #fef2f2;
    padding: 12px 16px;
    border-radius: 6px;
    border-left: 4px solid #ef4444;
    margin: 15px 0;
  `
};

export const companyInfo = {
  name: 'Cascais Premium Fishing',
  address: 'Marina de Cascais, Portugal',
  phone: '+351 934 027 852',
  email: 'info@cascaisfishing.com',
  website: 'www.cascaisfishing.com'
};

// Utility function to format currency
export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

// Utility function to format date
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-PT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Base email template wrapper
export const baseEmailTemplate = (content: string, title: string = 'Cascais Fishing'): string => `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      ${emailStyles.container.replace(/\s+/g, ' ').trim()}
    }
    .email-container {
      ${emailStyles.container}
    }
    .email-header {
      ${emailStyles.header}
    }
    .email-title {
      ${emailStyles.title}
    }
    .email-content {
      ${emailStyles.content}
    }
    .details-box {
      ${emailStyles.detailsBox}
    }
    .details-title {
      ${emailStyles.detailsTitle}
    }
    .detail-item {
      ${emailStyles.detailItem}
    }
    .email-button {
      ${emailStyles.button}
    }
    .email-footer {
      ${emailStyles.footer}
    }
    .divider {
      ${emailStyles.divider}
    }
    .highlight {
      ${emailStyles.highlight}
    }
    .success {
      ${emailStyles.success}
    }
    .warning {
      ${emailStyles.warning}
    }
    .error {
      ${emailStyles.error}
    }
  </style>
</head>
<body>
  <div class="email-container">
    ${content}
  </div>
</body>
</html>
`;
