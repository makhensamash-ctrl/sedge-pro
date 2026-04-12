import React from 'react';
import { Document, Page, Text, View, Font, Image } from '@react-pdf/renderer';
import { createSimpleTemplateStyles } from '@/components/templates/simpleTemplateStyles';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ]
});

interface InvoicePDFProps {
  invoice: {
    invoice_number: string;
    issue_date: string;
    due_date?: string;
    amount: number;
    tax_amount?: number;
    total_amount: number;
    currency: string;
    description?: string;
    notes?: string;
    status: string;
    client?: {
      name: string;
      email?: string;
      phone?: string;
      address?: string;
      company?: string;
    };
    business_profile?: {
      business_name: string;
      business_logo?: string;
      contact_phone?: string;
      website_address?: string;
      physical_address?: string;
      bank_name?: string;
      account_holder_name?: string;
      account_number?: string;
      branch_code?: string;
      terms_and_conditions?: string;
    };
  };
  items?: Array<{
    name: string;
    description?: string;
    quantity: number;
    price: number;
    total: number;
  }>;
}

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice, items = [] }) => {
  const styles = createSimpleTemplateStyles();

  const bankingDetails = {
    bank_name: invoice.business_profile?.bank_name,
    account_holder_name: invoice.business_profile?.account_holder_name,
    account_number: invoice.business_profile?.account_number,
    branch_code: invoice.business_profile?.branch_code
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: invoice.currency || 'ZAR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const subtotal = items.length > 0 
    ? items.reduce((sum, item) => sum + item.total, 0)
    : invoice.amount;
  
  const taxAmount = invoice.tax_amount || 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {invoice.status === 'paid' && (
          <View style={{
            position: 'absolute',
            top: 250,
            left: -40,
            width: 600,
            transform: 'rotate(-30deg)',
            zIndex: 10,
            alignItems: 'center',
          }} fixed>
            <Text style={{
              fontSize: 80,
              fontWeight: 700,
              color: 'rgba(34, 197, 94, 0.18)',
              letterSpacing: 20,
              textAlign: 'center',
            }}>PAID</Text>
          </View>
        )}
        <Text style={styles.headerTitle}>YOUR INVOICE</Text>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          {invoice.business_profile?.business_logo ? (
            <Image 
              src={invoice.business_profile.business_logo} 
              style={{ maxWidth: 120, maxHeight: 60, objectFit: 'contain' }}
              cache={false}
            />
          ) : (
            <View />
          )}
          <Text style={styles.documentTitle}>Invoice</Text>
        </View>

        <Text style={styles.documentNumber}>Invoice #: {invoice.invoice_number}</Text>

        <View style={styles.headerRow}>
          <View style={styles.headerColumn}>
            <Text style={styles.columnLabel}>From</Text>
            <Text style={styles.businessName}>
              {invoice.business_profile?.business_name || 'Your Business Name'}
            </Text>
            {invoice.business_profile?.contact_phone && (
              <Text style={styles.businessDetails}>{invoice.business_profile.contact_phone}</Text>
            )}
            {invoice.business_profile?.physical_address && (
              <Text style={styles.businessDetails}>{invoice.business_profile.physical_address}</Text>
            )}
            {invoice.business_profile?.website_address && (
              <Text style={styles.businessDetails}>{invoice.business_profile.website_address}</Text>
            )}
          </View>

          <View style={styles.headerColumn}>
            <Text style={styles.columnLabel}>Date</Text>
            <Text style={styles.dateLabel}>Issue Date</Text>
            <Text style={styles.dateValue}>{formatDate(invoice.issue_date)}</Text>
            {invoice.due_date && (
              <>
                <Text style={styles.dateLabel}>Due On</Text>
                <Text style={styles.dateValue}>{formatDate(invoice.due_date)}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.billToSection}>
          <View style={styles.billToHeader}>
            <Text style={styles.billToTitle}>BILL TO</Text>
          </View>
          <View style={styles.billToContent}>
            <View style={styles.billToLeft}>
              <Text style={styles.clientName}>
                {invoice.client?.company || invoice.client?.name || 'Customer Name'}
              </Text>
              {invoice.client?.company && invoice.client?.name && (
                <Text style={styles.clientDetails}>{invoice.client.name}</Text>
              )}
              {invoice.client?.email && (
                <Text style={styles.clientDetails}>{invoice.client.email}</Text>
              )}
              {invoice.client?.address && (
                <Text style={styles.clientDetails}>{invoice.client.address}</Text>
              )}
              {invoice.client?.phone && (
                <Text style={styles.clientDetails}>{invoice.client.phone}</Text>
              )}
            </View>
            <View style={styles.billToRight}>
              <Text style={styles.balanceLabel}>BALANCE DUE</Text>
              <Text style={styles.balanceValue}>{formatCurrency(invoice.total_amount)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.descriptionHeader}>
          <Text style={styles.descriptionTitle}>DESCRIPTION</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.descColumn]}>DESCRIPTION</Text>
            <Text style={[styles.tableHeaderCell, styles.qtyColumn]}>QUANTITY</Text>
            <Text style={[styles.tableHeaderCell, styles.priceColumn]}>UNIT PRICE</Text>
            <Text style={[styles.tableHeaderCell, styles.totalColumn]}>TOTAL</Text>
          </View>

          {items && items.length > 0 ? (
            items.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <View style={[styles.descColumn]}>
                  <Text style={styles.tableCell}>{item.name}</Text>
                  {item.description && (
                    <Text style={{ fontSize: 8, color: '#999999', marginTop: 2 }}>{item.description}</Text>
                  )}
                </View>
                <Text style={[styles.tableCell, styles.qtyColumn]}>{item.quantity}</Text>
                <Text style={[styles.tableCell, styles.priceColumn]}>{formatCurrency(item.price)}</Text>
                <Text style={[styles.tableCell, styles.totalColumn]}>{formatCurrency(item.total)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.descColumn]}>
                {invoice.description || 'Service/Product'}
              </Text>
              <Text style={[styles.tableCell, styles.qtyColumn]}>1</Text>
              <Text style={[styles.tableCell, styles.priceColumn]}>{formatCurrency(invoice.amount)}</Text>
              <Text style={[styles.tableCell, styles.totalColumn]}>{formatCurrency(invoice.amount)}</Text>
            </View>
          )}
        </View>

        <View style={styles.totalsSection}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>SUBTOTAL</Text>
            <Text style={styles.totalsValue}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>TAX (15%)</Text>
            <Text style={styles.totalsValue}>{formatCurrency(taxAmount)}</Text>
          </View>
          <View style={styles.totalsRowLast}>
            <Text style={styles.totalsLabelBold}>TOTAL</Text>
            <Text style={styles.totalsValueBold}>{formatCurrency(invoice.total_amount)}</Text>
          </View>
        </View>

        <View style={styles.notesSection}>
          <View style={styles.notesHeader}>
            <Text style={styles.notesTitle}>Notes</Text>
          </View>
          <View style={styles.notesContent}>
            <Text style={styles.notesText}>
              {invoice.notes || invoice.business_profile?.terms_and_conditions || 'Thank you for your business.'}
            </Text>
          </View>
        </View>

        {(bankingDetails.bank_name || bankingDetails.account_number) && (
          <View style={styles.bankingSection}>
            <View style={styles.bankingHeader}>
              <Text style={styles.bankingTitle}>Banking Details</Text>
            </View>
            <View style={styles.bankingContent}>
              {bankingDetails.bank_name && (
                <View style={styles.bankingRow}>
                  <Text style={styles.bankingLabel}>Bank:</Text>
                  <Text style={styles.bankingValue}>{bankingDetails.bank_name}</Text>
                </View>
              )}
              {bankingDetails.account_holder_name && (
                <View style={styles.bankingRow}>
                  <Text style={styles.bankingLabel}>Account Holder:</Text>
                  <Text style={styles.bankingValue}>{bankingDetails.account_holder_name}</Text>
                </View>
              )}
              {bankingDetails.account_number && (
                <View style={styles.bankingRow}>
                  <Text style={styles.bankingLabel}>Account Number:</Text>
                  <Text style={styles.bankingValue}>{bankingDetails.account_number}</Text>
                </View>
              )}
              {bankingDetails.branch_code && (
                <View style={styles.bankingRow}>
                  <Text style={styles.bankingLabel}>Branch Code:</Text>
                  <Text style={styles.bankingValue}>{bankingDetails.branch_code}</Text>
                </View>
              )}
              <View style={styles.bankingRow}>
                <Text style={styles.bankingLabel}>Reference:</Text>
                <Text style={styles.bankingValue}>{invoice.invoice_number}</Text>
              </View>
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
};