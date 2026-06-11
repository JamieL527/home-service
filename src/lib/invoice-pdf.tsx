import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const INK    = '#0f172a'
const MUTED  = '#64748b'
const SOFT   = '#94a3b8'
const LINE   = '#e7e8ef'
const BLUE   = '#2563eb'
const BLUE_D = '#1d4ed8'
const GREEN_BG = '#dcfce7'
const GREEN_FG = '#15803d'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: INK,
    paddingTop: 44,
    paddingBottom: 44,
    paddingHorizontal: 48,
    backgroundColor: '#ffffff',
  },

  // ── Header (.pvw .ph) ────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: GREEN_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoImg: {
    width: 44,
    height: 44,
    borderRadius: 10,
    objectFit: 'contain',
  },
  logoInitials: {
    color: GREEN_FG,
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
  },
  companyName: {                   // .co
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: INK,
  },
  companyMeta: {                   // .cred
    fontSize: 10,
    color: MUTED,
    marginTop: 3,
  },
  quoteWord: {                     // .word — gradient approximated with solid blue
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
    textAlign: 'right',
  },

  // ── Rule (.pvw .rule) ────────────────────────────────────────────────────────
  rule: {
    height: 2,
    backgroundColor: LINE,
    marginTop: 18,
    marginBottom: 20,
  },

  // ── Meta (.pvw .meta) ────────────────────────────────────────────────────────
  meta: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 20,
  },
  metaBlock: { flex: 1 },
  metaL: {                         // .pvw .meta .l
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: SOFT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  metaV: {                         // .pvw .meta .v
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: INK,
  },

  // ── Client & project (.pvw .cp) ──────────────────────────────────────────────
  cp: { marginBottom: 10 },
  cpL: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: SOFT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  cpP: {                           // .pvw .cp p
    fontSize: 11,
    color: INK,
    marginTop: 2,
  },

  // ── Table ────────────────────────────────────────────────────────────────────
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: LINE,
    paddingBottom: 8,
    marginTop: 16,
  },
  th: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: SOFT,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  colDesc:  { flex: 3 },
  colQty:   { width: 40, textAlign: 'right' },
  colUnit:  { width: 56, textAlign: 'right' },
  colPrice: { width: 76, textAlign: 'right' },
  colAmt:   { width: 76, textAlign: 'right' },
  tdDesc:   { fontSize: 10, color: INK },
  tdMuted:  { fontSize: 10, color: MUTED },
  tdNormal: { fontSize: 10, color: '#334155' },
  tdAmt:    { fontSize: 10, fontFamily: 'Helvetica-Bold', color: INK },

  // ── Totals (.pvw .tot / .tline) ──────────────────────────────────────────────
  totSection: { marginTop: 12, alignItems: 'flex-end' },
  totBox:     { width: 260 },
  tline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  tlineL: { fontSize: 12, color: MUTED },
  tlineV: { fontSize: 12, color: INK },
  tlineG: {                        // .tline.g
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
    paddingTop: 10,
    paddingHorizontal: 10,
    borderTopWidth: 2,
    borderTopColor: LINE,
  },
  tlineGL: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: INK },
  tlineGV: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: BLUE_D },

  // ── Terms / Notes (.pvw .terms) ──────────────────────────────────────────────
  terms: {
    marginTop: 20,
    fontSize: 10,
    color: MUTED,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 12,
    lineHeight: 1.5,
  },
})

const fmt = (n: number) =>
  '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type LineItem = { description: string; quantity: number; unitPrice: number; unit?: string }

export function InvoiceDocument({
  invoiceNumber,
  contractorName,
  contractorLogoUrl,
  projectAddress,
  trade,
  lineItems,
  subtotal,
  tax,
  total,
  taxRate = 13,
  notes,
  issueDate,
  validUntil,
}: {
  invoiceNumber: string
  contractorName: string
  contractorLogoUrl?: string | null
  projectAddress: string
  trade?: string | null
  lineItems: LineItem[]
  subtotal: number
  tax: number
  total: number
  taxRate?: number
  notes?: string | null
  issueDate: string
  validUntil: string
}) {
  const initials = contractorName
    .split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>

        {/* Header — .pvw .ph */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {contractorLogoUrl ? (
              <Image src={contractorLogoUrl} style={styles.logoImg} />
            ) : (
              <View style={styles.logoBox}>
                <Text style={styles.logoInitials}>{initials}</Text>
              </View>
            )}
            <View>
              <Text style={styles.companyName}>{contractorName}</Text>
              <Text style={styles.companyMeta}>Issued through Construction Market · constructionmarket.ca</Text>
            </View>
          </View>
          <Text style={styles.quoteWord}>QUOTE</Text>
        </View>

        {/* Rule */}
        <View style={styles.rule} />

        {/* Meta — Quote number / Issue date / Valid until */}
        <View style={styles.meta}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaL}>Quote number</Text>
            <Text style={styles.metaV}>{invoiceNumber}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaL}>Issue date</Text>
            <Text style={styles.metaV}>{issueDate}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaL}>Valid until</Text>
            <Text style={styles.metaV}>{validUntil}</Text>
          </View>
        </View>

        {/* Client & project — .pvw .cp */}
        <View style={styles.cp}>
          <Text style={styles.cpL}>Client &amp; project</Text>
          <Text style={styles.cpP}><Text style={{ fontFamily: 'Helvetica-Bold' }}>Prepared for:</Text> Project owner — via Construction Market</Text>
          <Text style={styles.cpP}><Text style={{ fontFamily: 'Helvetica-Bold' }}>Project address:</Text> {projectAddress}</Text>
          <Text style={styles.cpP}><Text style={{ fontFamily: 'Helvetica-Bold' }}>Trade:</Text> {trade || '—'}</Text>
        </View>

        {/* Table */}
        <View style={styles.tableHead}>
          <Text style={[styles.th, styles.colDesc]}>Description</Text>
          <Text style={[styles.th, styles.colQty]}>Qty</Text>
          <Text style={[styles.th, styles.colUnit]}>Unit</Text>
          <Text style={[styles.th, styles.colPrice]}>Unit price</Text>
          <Text style={[styles.th, styles.colAmt]}>Amount</Text>
        </View>
        {lineItems.map((item, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.tdDesc, styles.colDesc]}>{item.description}</Text>
            <Text style={[styles.tdNormal, styles.colQty]}>{item.quantity}</Text>
            <Text style={[styles.tdMuted, styles.colUnit]}>{item.unit || 'ea'}</Text>
            <Text style={[styles.tdNormal, styles.colPrice]}>{fmt(item.unitPrice)}</Text>
            <Text style={[styles.tdAmt, styles.colAmt]}>{fmt(item.quantity * item.unitPrice)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totSection}>
          <View style={styles.totBox}>
            <View style={styles.tline}>
              <Text style={styles.tlineL}>Subtotal</Text>
              <Text style={styles.tlineV}>{fmt(subtotal)}</Text>
            </View>
            <View style={styles.tline}>
              <Text style={styles.tlineL}>HST ({taxRate}%)</Text>
              <Text style={styles.tlineV}>{fmt(tax)}</Text>
            </View>
            <View style={styles.tlineG}>
              <Text style={styles.tlineGL}>Total</Text>
              <Text style={styles.tlineGV}>{fmt(total)}</Text>
            </View>
          </View>
        </View>

        {/* Notes + Terms — .pvw .terms */}
        {notes && (
          <View style={styles.terms}>
            <Text><Text style={{ fontFamily: 'Helvetica-Bold' }}>Notes: </Text>{notes}</Text>
          </View>
        )}
        <View style={[styles.terms, notes ? { borderTopWidth: 0, marginTop: 8 } : {}]}>
          <Text>This quote is valid for 30 days from the issue date. Payment terms: Net 30 days upon completion. All work performed in accordance with industry standards and applicable building codes.</Text>
        </View>

      </Page>
    </Document>
  )
}
