import { StyleSheet } from '@react-pdf/renderer';

export const createSimpleTemplateStyles = () => {
  return StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      padding: 40,
      fontFamily: 'Roboto',
    },
    headerTitle: {
      fontSize: 14,
      fontWeight: 400,
      color: '#666666',
      marginBottom: 5,
    },
    documentTitle: {
      fontSize: 32,
      fontWeight: 700,
      color: '#000000',
      marginBottom: 20,
    },
    documentNumber: {
      fontSize: 12,
      color: '#666666',
      marginBottom: 25,
    },
    headerRow: {
      flexDirection: 'row',
      marginBottom: 25,
      gap: 20,
    },
    headerColumn: {
      flex: 1,
    },
    columnLabel: {
      fontSize: 10,
      fontWeight: 700,
      color: '#000000',
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    businessName: {
      fontSize: 12,
      fontWeight: 600,
      color: '#000000',
      marginBottom: 3,
    },
    businessDetails: {
      fontSize: 10,
      color: '#666666',
      marginBottom: 2,
    },
    dateLabel: {
      fontSize: 10,
      fontWeight: 600,
      color: '#000000',
      marginBottom: 2,
    },
    dateValue: {
      fontSize: 10,
      color: '#666666',
      marginBottom: 8,
    },
    billToSection: {
      marginBottom: 25,
    },
    billToHeader: {
      backgroundColor: '#f5f5f5',
      padding: 10,
      marginBottom: 0,
    },
    billToTitle: {
      fontSize: 12,
      fontWeight: 700,
      color: '#000000',
    },
    billToContent: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: '#e5e5e5',
      borderTopWidth: 0,
    },
    billToLeft: {
      flex: 1,
      padding: 12,
    },
    billToRight: {
      width: 150,
      padding: 12,
      backgroundColor: '#fafafa',
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    clientName: {
      fontSize: 11,
      fontWeight: 600,
      color: '#000000',
      marginBottom: 3,
    },
    clientDetails: {
      fontSize: 10,
      color: '#666666',
      marginBottom: 2,
    },
    balanceLabel: {
      fontSize: 10,
      fontWeight: 700,
      color: '#000000',
      marginBottom: 4,
    },
    balanceValue: {
      fontSize: 16,
      fontWeight: 700,
      color: '#000000',
    },
    descriptionHeader: {
      backgroundColor: '#f5f5f5',
      padding: 10,
      marginBottom: 0,
    },
    descriptionTitle: {
      fontSize: 12,
      fontWeight: 700,
      color: '#000000',
    },
    table: {
      marginBottom: 0,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: '#ffffff',
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: '#e5e5e5',
      borderTopWidth: 0,
    },
    tableHeaderCell: {
      fontSize: 9,
      fontWeight: 700,
      color: '#000000',
      textTransform: 'uppercase',
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: '#e5e5e5',
      borderTopWidth: 0,
      backgroundColor: '#ffffff',
    },
    tableCell: {
      fontSize: 10,
      color: '#333333',
    },
    descColumn: { width: '40%', textAlign: 'left' as const },
    qtyColumn: { width: '20%', textAlign: 'center' as const },
    priceColumn: { width: '20%', textAlign: 'right' as const },
    totalColumn: { width: '20%', textAlign: 'right' as const },
    totalsSection: {
      borderWidth: 1,
      borderColor: '#e5e5e5',
      borderTopWidth: 0,
      marginBottom: 25,
    },
    totalsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#e5e5e5',
    },
    totalsRowLast: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: '#f5f5f5',
    },
    totalsLabel: {
      fontSize: 10,
      color: '#666666',
      width: 100,
      textAlign: 'right' as const,
    },
    totalsValue: {
      fontSize: 10,
      color: '#333333',
      width: 100,
      textAlign: 'right' as const,
    },
    totalsLabelBold: {
      fontSize: 11,
      fontWeight: 700,
      color: '#000000',
      width: 100,
      textAlign: 'right' as const,
    },
    totalsValueBold: {
      fontSize: 11,
      fontWeight: 700,
      color: '#000000',
      width: 100,
      textAlign: 'right' as const,
    },
    notesSection: {
      marginBottom: 20,
    },
    notesHeader: {
      backgroundColor: '#f5f5f5',
      padding: 10,
      marginBottom: 0,
    },
    notesTitle: {
      fontSize: 12,
      fontWeight: 700,
      color: '#000000',
    },
    notesContent: {
      padding: 12,
      borderWidth: 1,
      borderColor: '#e5e5e5',
      borderTopWidth: 0,
    },
    notesText: {
      fontSize: 10,
      color: '#666666',
      lineHeight: 1.5,
    },
    bankingSection: {
      marginBottom: 20,
    },
    bankingHeader: {
      backgroundColor: '#f5f5f5',
      padding: 10,
      marginBottom: 0,
    },
    bankingTitle: {
      fontSize: 12,
      fontWeight: 700,
      color: '#000000',
    },
    bankingContent: {
      padding: 12,
      borderWidth: 1,
      borderColor: '#e5e5e5',
      borderTopWidth: 0,
    },
    bankingRow: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    bankingLabel: {
      fontSize: 10,
      fontWeight: 600,
      color: '#000000',
      width: 120,
    },
    bankingValue: {
      fontSize: 10,
      color: '#666666',
      flex: 1,
    },
  });
};