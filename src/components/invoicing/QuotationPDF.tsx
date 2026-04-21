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

interface QuotationPDFProps {
  quotation: {
    quotation_number: string;
    issue_date: string;
    expiry_date?: string;
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
      vat_number?: string;
    };
    business_profile?: {
      business_name: string;
      business_logo?: string;
      contact_phone?: string;
      website_address?: string;
      physical_address?: string;
      vat_number?: string;
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

export const QuotationPDF: React.FC<QuotationPDFProps> = ({ quotation, items = [] }) => {
  const styles = createSimpleTemplateStyles();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: quotation.currency || 'ZAR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const subtotal = items.length > 0 
    ? items.reduce((sum, item) => sum + item.total, 0)
    : quotation.amount;
  
  const taxAmount = quotation.tax_amount || 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          {quotation.business_profile?.business_logo ? (
            <Image 
              src={quotation.business_profile.business_logo} 
              style={{ maxWidth: 120, maxHeight: 60, objectFit: 'contain' }}
              cache={false}
            />
          ) : (
            <View />
          )}
          <Text style={styles.documentTitle}>Quotation</Text>
        </View>

        <Text style={styles.documentNumber}>Quotation #: {quotation.quotation_number}</Text>

        <View style={styles.headerRow}>
          <View style={styles.headerColumn}>
            <Text style={styles.columnLabel}>From</Text>
            <Text style={styles.businessName}>
              {quotation.business_profile?.business_name || 'Your Business Name'}
            </Text>
            {quotation.business_profile?.physical_address && (
              <Text style={styles.businessDetails}>{quotation.business_profile.physical_address}</Text>
            )}
            {quotation.business_profile?.vat_number && (
              <Text style={styles.businessDetails}>VAT No: {quotation.business_profile.vat_number}</Text>
            )}
          </View>

          <View style={styles.headerColumn}>
            <Text style={styles.columnLabel}>Date</Text>
            <Text style={styles.dateLabel}>Quote Date</Text>
            <Text style={styles.dateValue}>{formatDate(quotation.issue_date)}</Text>
            {quotation.expiry_date && (
              <>
                <Text style={styles.dateLabel}>Valid Until</Text>
                <Text style={styles.dateValue}>{formatDate(quotation.expiry_date)}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.billToSection}>
          <View style={styles.billToHeader}>
            <Text style={styles.billToTitle}>QUOTE TO</Text>
          </View>
          <View style={styles.billToContent}>
            <View style={styles.billToLeft}>
              <Text style={styles.clientName}>
                {quotation.client?.company || quotation.client?.name || 'Customer Name'}
              </Text>
              {quotation.client?.email && (
                <Text style={styles.clientDetails}>{quotation.client.email}</Text>
              )}
              {quotation.client?.address && (
                <Text style={styles.clientDetails}>{quotation.client.address}</Text>
              )}
              {quotation.client?.phone && (
                <Text style={styles.clientDetails}>{quotation.client.phone}</Text>
              )}
              {quotation.client?.vat_number && (
                <Text style={styles.clientDetails}>VAT No: {quotation.client.vat_number}</Text>
              )}
            </View>
            <View style={styles.billToRight}>
              <Text style={styles.balanceLabel}>TOTAL AMOUNT</Text>
              <Text style={styles.balanceValue}>{formatCurrency(quotation.total_amount)}</Text>
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
                {quotation.description || 'Service/Product'}
              </Text>
              <Text style={[styles.tableCell, styles.qtyColumn]}>1</Text>
              <Text style={[styles.tableCell, styles.priceColumn]}>{formatCurrency(quotation.amount)}</Text>
              <Text style={[styles.tableCell, styles.totalColumn]}>{formatCurrency(quotation.amount)}</Text>
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
            <Text style={styles.totalsValueBold}>{formatCurrency(quotation.total_amount)}</Text>
          </View>
        </View>

        <View style={styles.notesSection}>
          <View style={styles.notesHeader}>
            <Text style={styles.notesTitle}>Notes</Text>
          </View>
          <View style={styles.notesContent}>
            <Text style={styles.notesText}>
              {quotation.notes || quotation.business_profile?.terms_and_conditions || 'Thank you for your business.'}
            </Text>
          </View>
        </View>

        {(quotation.business_profile?.bank_name || quotation.business_profile?.account_number) && (
          <View style={styles.bankingSection}>
            <View style={styles.bankingHeader}>
              <Text style={styles.bankingTitle}>Banking Details</Text>
            </View>
            <View style={styles.bankingContent}>
              {quotation.business_profile?.bank_name && (
                <View style={styles.bankingRow}>
                  <Text style={styles.bankingLabel}>Bank:</Text>
                  <Text style={styles.bankingValue}>{quotation.business_profile.bank_name}</Text>
                </View>
              )}
              {quotation.business_profile?.account_holder_name && (
                <View style={styles.bankingRow}>
                  <Text style={styles.bankingLabel}>Account Holder:</Text>
                  <Text style={styles.bankingValue}>{quotation.business_profile.account_holder_name}</Text>
                </View>
              )}
              {quotation.business_profile?.account_number && (
                <View style={styles.bankingRow}>
                  <Text style={styles.bankingLabel}>Account Number:</Text>
                  <Text style={styles.bankingValue}>{quotation.business_profile.account_number}</Text>
                </View>
              )}
              {quotation.business_profile?.branch_code && (
                <View style={styles.bankingRow}>
                  <Text style={styles.bankingLabel}>Branch Code:</Text>
                  <Text style={styles.bankingValue}>{quotation.business_profile.branch_code}</Text>
                </View>
              )}
              <View style={styles.bankingRow}>
                <Text style={styles.bankingLabel}>Reference:</Text>
                <Text style={styles.bankingValue}>{quotation.quotation_number}</Text>
              </View>
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
};