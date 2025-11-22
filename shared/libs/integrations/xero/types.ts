/**
 * Xero API Types
 *
 * TypeScript interfaces for Xero API responses
 * Based on Xero API 2.0 specification
 */

export interface XeroOrganization {
  OrganisationID: string
  Name: string
  LegalName?: string
  Version: string
  OrganisationType?: string
  BaseCurrency?: string
  CountryCode?: string
  IsDemoCompany?: boolean
  OrganisationStatus?: string
  TaxNumber?: string
  FinancialYearEndDay?: number
  FinancialYearEndMonth?: number
  Timezone?: string
}

export interface XeroAccount {
  AccountID: string
  Code: string
  Name: string
  Type: AccountType
  Class?: AccountClass
  Status?: 'ACTIVE' | 'ARCHIVED' | 'DELETED'
  Description?: string
  TaxType?: string
  EnablePaymentsToAccount?: boolean
  ShowInExpenseClaims?: boolean
  BankAccountNumber?: string
  BankAccountType?: string
  CurrencyCode?: string
  ReportingCode?: string
  ReportingCodeName?: string
  HasAttachments?: boolean
  UpdatedDateUTC?: string
}

export type AccountType =
  | 'BANK'
  | 'CURRENT'
  | 'CURRLIAB'
  | 'DEPRECIATN'
  | 'DIRECTCOSTS'
  | 'EQUITY'
  | 'EXPENSE'
  | 'FIXED'
  | 'INVENTORY'
  | 'LIABILITY'
  | 'NONCURRENT'
  | 'OTHERINCOME'
  | 'OVERHEADS'
  | 'PREPAYMENT'
  | 'REVENUE'
  | 'SALES'
  | 'TERMLIAB'
  | 'PAYGLIABILITY'
  | 'SUPERANNUATIONEXPENSE'
  | 'SUPERANNUATIONLIABILITY'
  | 'WAGESEXPENSE'
  | 'WAGESPAYABLELIABILITY'

export type AccountClass =
  | 'ASSET'
  | 'EQUITY'
  | 'EXPENSE'
  | 'LIABILITY'
  | 'REVENUE'

export interface XeroContact {
  ContactID: string
  Name: string
  FirstName?: string
  LastName?: string
  EmailAddress?: string
  BankAccountDetails?: string
  TaxNumber?: string
  ContactStatus?: 'ACTIVE' | 'ARCHIVED' | 'GDPRREQUEST' | 'DELETED'
  IsSupplier?: boolean
  IsCustomer?: boolean
  DefaultCurrency?: string
}

export interface XeroJournal {
  JournalID: string
  JournalDate: string
  JournalNumber: number
  CreatedDateUTC: string
  Reference?: string
  SourceID: string
  SourceType: 'ACCREC' | 'ACCPAY' | 'ACCRECCREDIT' | 'ACCPAYCREDIT' | 'ACCRECPAYMENT' | 'ACCPAYPAYMENT' | 'ARCREDITPAYMENT' | 'APCREDITPAYMENT' | 'CASHREC' | 'CASHPAID' | 'TRANSFER' | 'ARPREPAYMENT' | 'APPREPAYMENT' | 'AROVERPAYMENT' | 'APOVERPAYMENT' | 'EXPCLAIM' | 'EXPPAYMENT' | 'MANJOURNAL' | 'PAYSLIP' | 'WAGEPAYABLE' | 'INTEGRATEDPAYROLLPE' | 'INTEGRATEDPAYROLLPT' | 'EXTERNALSPENDMONEY' | 'INTEGRATEDPAYROLLPTPAYMENT' | 'INTEGRATEDPAYROLLCN'
  JournalLines: XeroJournalLine[]
}

export interface XeroJournalLine {
  JournalLineID: string
  AccountID: string
  AccountCode: string
  AccountType: AccountType
  AccountName: string
  NetAmount: number
  GrossAmount: number
  TaxAmount: number
  TaxType?: string
  TaxName?: string
  Description?: string
  TrackingCategories?: XeroTrackingCategory[]
}

export interface XeroTrackingCategory {
  TrackingCategoryID: string
  TrackingCategoryName: string
  TrackingOptionID: string
  TrackingOptionName: string
}

export interface XeroInvoice {
  InvoiceID: string
  Type: 'ACCREC' | 'ACCPAY'
  InvoiceNumber?: string
  Reference?: string
  Contact: XeroContact
  Date: string
  DueDate?: string
  Status: 'DRAFT' | 'SUBMITTED' | 'DELETED' | 'AUTHORISED' | 'PAID' | 'VOIDED'
  LineAmountTypes: 'Exclusive' | 'Inclusive' | 'NoTax'
  LineItems: XeroLineItem[]
  SubTotal: number
  TotalTax: number
  Total: number
  UpdatedDateUTC?: string
  CurrencyCode?: string
  AmountDue: number
  AmountPaid: number
  AmountCredited: number
}

export interface XeroLineItem {
  LineItemID?: string
  Description?: string
  Quantity?: number
  UnitAmount?: number
  ItemCode?: string
  AccountCode?: string
  TaxType?: string
  TaxAmount?: number
  LineAmount?: number
  TrackingCategories?: XeroTrackingCategory[]
}

export interface XeroReport {
  ReportID: string
  ReportName: string
  ReportType: string
  ReportTitles: string[]
  ReportDate: string
  UpdatedDateUTC: string
  Rows?: XeroReportRow[]
}

export interface XeroReportRow {
  RowType: 'Header' | 'Section' | 'Row' | 'SummaryRow'
  Cells?: XeroReportCell[]
  Title?: string
  Rows?: XeroReportRow[]
}

export interface XeroReportCell {
  Value: string
  Attributes?: Array<{ Value: string; Id: string }>
}

export interface XeroTrialBalance extends XeroReport {
  ReportName: 'TrialBalance'
}

export interface XeroProfitAndLoss extends XeroReport {
  ReportName: 'ProfitAndLoss'
}

export interface XeroBalanceSheet extends XeroReport {
  ReportName: 'BalanceSheet'
}

export interface XeroBankTransaction {
  BankTransactionID: string
  Type: 'RECEIVE' | 'SPEND' | 'RECEIVE-OVERPAYMENT' | 'RECEIVE-PREPAYMENT' | 'SPEND-OVERPAYMENT' | 'SPEND-PREPAYMENT' | 'RECEIVE-TRANSFER' | 'SPEND-TRANSFER'
  Contact: XeroContact
  LineItems: XeroLineItem[]
  BankAccount: XeroAccount
  IsReconciled: boolean
  Date: string
  Reference?: string
  Status: 'AUTHORISED' | 'DELETED'
  LineAmountTypes: 'Exclusive' | 'Inclusive' | 'NoTax'
  SubTotal: number
  TotalTax: number
  Total: number
  UpdatedDateUTC?: string
  CurrencyCode?: string
}

export interface XeroOAuthToken {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  refresh_token: string
  scope: string
}

export interface XeroConnection {
  id: string
  tenantId: string
  tenantType: string
  tenantName?: string
  createdDateUtc: string
  updatedDateUtc: string
}

// API Response Wrappers
export interface XeroAPIResponse<T> {
  Id?: string
  Status?: string
  ProviderName?: string
  DateTimeUTC?: string
  [key: string]: T[] | string | undefined
}

export interface XeroAccountsResponse extends XeroAPIResponse<XeroAccount> {
  Accounts: XeroAccount[]
}

export interface XeroJournalsResponse extends XeroAPIResponse<XeroJournal> {
  Journals: XeroJournal[]
}

export interface XeroInvoicesResponse extends XeroAPIResponse<XeroInvoice> {
  Invoices: XeroInvoice[]
}

export interface XeroReportsResponse extends XeroAPIResponse<XeroReport> {
  Reports: XeroReport[]
}

export interface XeroBankTransactionsResponse extends XeroAPIResponse<XeroBankTransaction> {
  BankTransactions: XeroBankTransaction[]
}

export interface XeroContactsResponse extends XeroAPIResponse<XeroContact> {
  Contacts: XeroContact[]
}

// Query Options
export interface XeroQueryOptions {
  page?: number
  offset?: number
  where?: string
  order?: string
  includeArchived?: boolean
  IDs?: string[]
  ContactIDs?: string[]
  statuses?: string[]
  fromDate?: string
  toDate?: string
}

export interface XeroReportOptions {
  date?: string
  fromDate?: string
  toDate?: string
  periods?: number
  timeframe?: 'MONTH' | 'QUARTER' | 'YEAR'
  trackingCategoryID?: string
  trackingOptionID?: string
  standardLayout?: boolean
  paymentsOnly?: boolean
}
