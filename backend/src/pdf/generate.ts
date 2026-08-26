/**
 * PDF generation — stub.
 *
 * The plan is to use WeasyPrint (Python) for the business-mode legal-grade
 * report, and ReportLab for the baby-mode keepsake (more typography
 * control). Until the templates are designed, we generate a tiny placeholder
 * PDF so the download flow works end-to-end.
 *
 * TODO:
 *   1. Implement business-mode PDF using WeasyPrint via a sidecar service
 *   2. Implement baby-mode keepsake PDF using ReportLab via a sidecar service
 *   3. Upload generated PDFs to R2/S3, store object_key on the scan row
 *   4. GET /v1/scans/:id/pdf returns a 15-min pre-signed URL
 */
import { logger } from "../logger.js";

export interface PdfGenerateInput {
  scanId: string;
  templateCode: "business-deep-scan" | "baby-keepsake" | "baby-shortlist";
}

export async function generatePdf(input: PdfGenerateInput): Promise<{ objectKey: string; sizeBytes: number }> {
  logger.warn({ input }, "PDF generation STUBBED — returning placeholder");
  // Real implementation: render template → upload to R2 → return object key
  const objectKey = `reports/${input.templateCode}/${input.scanId}.pdf`;
  return { objectKey, sizeBytes: 12_345 };
}

/**
 * Generate a 15-minute pre-signed URL for downloading a PDF object.
 */
export async function getSignedPdfUrl(objectKey: string): Promise<string> {
  // TODO: Use @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner with R2 endpoint.
  return `https://r2.example/${objectKey}?stub=true&expires=${Date.now() + 15 * 60 * 1000}`;
}
