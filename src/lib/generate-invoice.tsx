import { renderToBuffer } from '@react-pdf/renderer'
import { InvoiceDocument } from './invoice-pdf'

type LineItem = { description: string; quantity: number; unitPrice: number }

export async function generateInvoicePdf(params: {
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
}): Promise<Buffer> {
  return renderToBuffer(
    <InvoiceDocument {...params} />
  ) as Promise<Buffer>
}
