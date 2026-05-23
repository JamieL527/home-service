import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'

Font.register({
  family: 'Helvetica',
  fonts: [],
})

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
    padding: 48,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 36,
  },
  logo: {
    width: 120,
    height: 48,
    objectFit: 'contain',
  },
  companyNameText: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  invoiceLabel: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#4f46e5',
    textAlign: 'right',
  },
  invoiceMeta: {
    textAlign: 'right',
    color: '#666',
    marginTop: 4,
    lineHeight: 1.5,
  },
  divider: {
    borderBottomWidth: 2,
    borderBottomColor: '#4f46e5',
    marginBottom: 24,
  },
  thinDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 16,
    marginTop: 16,
  },
  billSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  billBlock: {
    flex: 1,
  },
  billLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  billValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  billSub: {
    fontSize: 10,
    color: '#666',
    lineHeight: 1.4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f3ff',
    borderRadius: 4,
    padding: '8 12',
    marginBottom: 4,
  },
  tableHeaderText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#4f46e5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    padding: '8 12',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: 'center' },
  colUnit: { flex: 1.5, textAlign: 'right' },
  colAmount: { flex: 1.5, textAlign: 'right' },
  cellText: { fontSize: 10, color: '#374151' },
  totalsSection: {
    marginTop: 24,
    alignItems: 'flex-end',
  },
  totalsBox: {
    width: 220,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: { fontSize: 10, color: '#666' },
  totalValue: { fontSize: 10, color: '#1a1a1a' },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: '#4f46e5',
    marginTop: 4,
  },
  grandTotalLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#4f46e5' },
  grandTotalValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#4f46e5' },
  notes: {
    marginTop: 32,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  notesLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  notesText: { fontSize: 10, color: '#555', lineHeight: 1.5 },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 9, color: '#aaa' },
})

const fmt = (n: number) =>
  '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type LineItem = { description: string; quantity: number; unitPrice: number }

export function InvoiceDocument({
  invoiceNumber,
  contractorName,
  contractorLogoUrl,
  clientName,
  projectName,
  projectAddress,
  lineItems,
  subtotal,
  tax,
  total,
  notes,
  date,
}: {
  invoiceNumber: string
  contractorName: string
  contractorLogoUrl?: string | null
  clientName: string
  projectName: string
  projectAddress: string
  lineItems: LineItem[]
  subtotal: number
  tax: number
  total: number
  notes?: string | null
  date: string
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {contractorLogoUrl ? (
              <Image src={contractorLogoUrl} style={styles.logo} />
            ) : (
              <Text style={styles.companyNameText}>{contractorName}</Text>
            )}
          </View>
          <View>
            <Text style={styles.invoiceLabel}>INVOICE</Text>
            <Text style={styles.invoiceMeta}>#{invoiceNumber}</Text>
            <Text style={styles.invoiceMeta}>{date}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bill To / Project */}
        <View style={styles.billSection}>
          <View style={styles.billBlock}>
            <Text style={styles.billLabel}>Bill To</Text>
            <Text style={styles.billValue}>{clientName}</Text>
          </View>
          <View style={styles.billBlock}>
            <Text style={styles.billLabel}>Project</Text>
            <Text style={styles.billValue}>{projectName}</Text>
            <Text style={styles.billSub}>{projectAddress}</Text>
          </View>
          <View style={styles.billBlock}>
            <Text style={styles.billLabel}>From</Text>
            <Text style={styles.billValue}>{contractorName}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colDesc]}>Description</Text>
          <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
          <Text style={[styles.tableHeaderText, styles.colUnit]}>Unit Price</Text>
          <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
        </View>

        {lineItems.map((item, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.cellText, styles.colDesc]}>{item.description}</Text>
            <Text style={[styles.cellText, styles.colQty]}>{item.quantity}</Text>
            <Text style={[styles.cellText, styles.colUnit]}>{fmt(item.unitPrice)}</Text>
            <Text style={[styles.cellText, styles.colAmount]}>{fmt(item.quantity * item.unitPrice)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{fmt(subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax (HST)</Text>
              <Text style={styles.totalValue}>{fmt(tax)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>{fmt(total)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {notes && (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{contractorName}</Text>
          <Text style={styles.footerText}>Thank you for your business.</Text>
        </View>
      </Page>
    </Document>
  )
}
