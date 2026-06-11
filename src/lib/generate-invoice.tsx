import { renderToBuffer } from '@react-pdf/renderer'
import { InvoiceDocument } from './invoice-pdf'

type LineItem = { description: string; quantity: number; unitPrice: number; unit?: string }

export async function generateInvoicePdf(params: {
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
}): Promise<Buffer> {
  return renderToBuffer(
    <InvoiceDocument {...params} />
  ) as Promise<Buffer>
}
