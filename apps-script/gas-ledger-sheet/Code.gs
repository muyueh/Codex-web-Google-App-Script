const LEDGER_SHEET_NAME = 'Ledger';
const CONFIG_SHEET_NAME = 'Config';
const LEDGER_HEADERS = [
  'Date',
  'Category',
  'Description',
  'Payment Method',
  'Amount',
  'Tags',
  'Notes',
  'Running Balance'
];
const LEDGER_ROW_LIMIT = 1000;
const CATEGORY_OPTIONS = [
  'Salary / Income',
  'Side Project',
  'Rent',
  'Utilities',
  'Groceries',
  'Dining Out',
  'Transportation',
  'Health',
  'Education',
  'Entertainment',
  'Gifts & Charity',
  'Investments',
  'Savings Transfer'
];
const PAYMENT_METHOD_OPTIONS = [
  'Bank Transfer',
  'Cash',
  'Credit Card',
  'Debit Card',
  'Mobile Payment'
];

/**
 * Creates a brand-new spreadsheet that already contains the ledger layout.
 * @return {string} The URL of the newly created spreadsheet.
 */
function createLedgerSpreadsheet() {
  const spreadsheet = SpreadsheetApp.create('Household Ledger');
  configureLedgerSpreadsheet_(spreadsheet);
  return spreadsheet.getUrl();
}

/**
 * Applies (or reapplies) the ledger layout inside the active spreadsheet.
 */
function applyLedgerTemplate() {
  const spreadsheet = SpreadsheetApp.getActive();
  configureLedgerSpreadsheet_(spreadsheet);
}

/**
 * Adds a Ledger helper menu whenever the spreadsheet opens.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Ledger Tools')
    .addItem('Reset layout', 'applyLedgerTemplate')
    .addItem('Insert sample transactions', 'insertExampleTransactions')
    .addToUi();
}

/**
 * Appends a few example rows so users can see the formulas in action.
 */
function insertExampleTransactions() {
  const sheet = getLedgerSheet_(SpreadsheetApp.getActive());
  const nextRow = Math.max(sheet.getLastRow() + 1, 2);
  const rows = [
    [new Date(), 'Salary / Income', 'Monthly salary', 'Bank Transfer', 75000, 'payroll', 'Base salary + bonus'],
    [new Date(), 'Rent', 'Apartment rent', 'Bank Transfer', -22000, 'housing', 'Paid landlord via transfer'],
    [new Date(), 'Groceries', 'Weekend market', 'Debit Card', -1800, 'food', 'Fruits and vegetables'],
    [new Date(), 'Transportation', 'Metro top-up', 'Mobile Payment', -1200, 'commute', 'EasyCard reload'],
    [new Date(), 'Investments', 'ETF purchase', 'Credit Card', -5000, 'wealth', 'Dollar-cost averaging']
  ];
  sheet.getRange(nextRow, 1, rows.length, 7).setValues(rows);
}

/**
 * Configures the ledger sheet, validation lists, summary block, and formulas.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet
 */
function configureLedgerSpreadsheet_(spreadsheet) {
  const ledgerSheet = getLedgerSheet_(spreadsheet);
  ledgerSheet.clear();
  ledgerSheet.activate();
  ensureLedgerGrid_(ledgerSheet);

  ledgerSheet.getRange(1, 1, 1, LEDGER_HEADERS.length).setValues([LEDGER_HEADERS]);
  styleHeader_(ledgerSheet);
  ledgerSheet.setFrozenRows(1);
  ledgerSheet.setColumnWidth(1, 110);
  ledgerSheet.setColumnWidth(2, 140);
  ledgerSheet.setColumnWidth(3, 220);
  ledgerSheet.setColumnWidth(4, 140);
  ledgerSheet.setColumnWidth(5, 120);
  ledgerSheet.setColumnWidth(6, 160);
  ledgerSheet.setColumnWidth(7, 220);
  ledgerSheet.setColumnWidth(8, 150);
  ledgerSheet.setRowHeights(2, LEDGER_ROW_LIMIT, 24);

  ledgerSheet.getRange(2, 1, LEDGER_ROW_LIMIT, LEDGER_HEADERS.length).clear({ contentsOnly: true });
  ledgerSheet.getRange(2, 1, LEDGER_ROW_LIMIT, LEDGER_HEADERS.length).setHorizontalAlignment('left');

  const configSheet = upsertConfigSheet_(spreadsheet);
  applyDataValidation_(ledgerSheet, configSheet);
  applyFormatsAndFormulas_(ledgerSheet);
  buildSummaryBlock_(ledgerSheet);
  ledgerSheet.getRange('A2').activate();
}

function getLedgerSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(LEDGER_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(LEDGER_SHEET_NAME);
  }
  return sheet;
}

function ensureLedgerGrid_(sheet) {
  const minRows = LEDGER_ROW_LIMIT + 20;
  const minColumns = 11; // Columns A–K used for data + summary block
  if (sheet.getMaxRows() < minRows) {
    sheet.insertRowsAfter(sheet.getMaxRows(), minRows - sheet.getMaxRows());
  }
  if (sheet.getMaxColumns() < minColumns) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), minColumns - sheet.getMaxColumns());
  }
}

function upsertConfigSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(CONFIG_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG_SHEET_NAME);
  }
  sheet.clear();
  sheet.getRange(1, 1).setValue('Categories');
  sheet.getRange(2, 1, CATEGORY_OPTIONS.length, 1).setValues(CATEGORY_OPTIONS.map((item) => [item]));
  sheet.getRange(1, 3).setValue('Payment Methods');
  sheet.getRange(2, 3, PAYMENT_METHOD_OPTIONS.length, 1).setValues(PAYMENT_METHOD_OPTIONS.map((item) => [item]));
  sheet.hideSheet();
  return sheet;
}

function applyDataValidation_(ledgerSheet, configSheet) {
  const categoryRange = configSheet.getRange(2, 1, CATEGORY_OPTIONS.length, 1);
  const paymentRange = configSheet.getRange(2, 3, PAYMENT_METHOD_OPTIONS.length, 1);
  const categoryValidation = SpreadsheetApp.newDataValidation()
    .requireValueInRange(categoryRange, true)
    .setAllowInvalid(false)
    .setHelpText('選擇支出或收入分類（可於 Config 工作表調整）')
    .build();
  const paymentValidation = SpreadsheetApp.newDataValidation()
    .requireValueInRange(paymentRange, true)
    .setAllowInvalid(false)
    .setHelpText('選擇付款方式（可於 Config 工作表調整）')
    .build();
  ledgerSheet.getRange(2, 2, LEDGER_ROW_LIMIT, 1).setDataValidation(categoryValidation);
  ledgerSheet.getRange(2, 4, LEDGER_ROW_LIMIT, 1).setDataValidation(paymentValidation);
}

function applyFormatsAndFormulas_(ledgerSheet) {
  ledgerSheet.getRange(2, 1, LEDGER_ROW_LIMIT, 1).setNumberFormat('yyyy-mm-dd');
  ledgerSheet.getRange(2, 5, LEDGER_ROW_LIMIT, 1)
    .setNumberFormat('[\$-409]#,##0.00;[RED]-[\$-409]#,##0.00')
    .setHorizontalAlignment('right');
  ledgerSheet.getRange(2, 8, LEDGER_ROW_LIMIT, 1)
    .setNumberFormat('[\$-409]#,##0.00;[RED]-[\$-409]#,##0.00')
    .setHorizontalAlignment('right')
    .setFormulaR1C1('=IF(RC[-3]="", "", SUM(R2C5:RC5))');
  ledgerSheet.getRange(2, 6, LEDGER_ROW_LIMIT, 2).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  ledgerSheet.getRange(1, 1, LEDGER_ROW_LIMIT + 1, LEDGER_HEADERS.length)
    .applyRowBanding(SpreadsheetApp.BandingTheme.TEAL, true, false);
}

function buildSummaryBlock_(ledgerSheet) {
  const summaryRange = ledgerSheet.getRange('J2:K9');
  summaryRange.clear({ contentsOnly: true });
  ledgerSheet.getRange('J2:K2').merge().setValue('Monthly Snapshot').setFontWeight('bold').setBackground('#fde68a');
  ledgerSheet.getRange('J3').setValue('Total Income');
  ledgerSheet.getRange('K3').setFormula('=IFERROR(SUMIF($E$2:$E,">0",$E$2:$E),0)');
  ledgerSheet.getRange('J4').setValue('Total Expense');
  ledgerSheet.getRange('K4').setFormula('=IFERROR(-SUMIF($E$2:$E,"<0",$E$2:$E),0)');
  ledgerSheet.getRange('J5').setValue('Net');
  ledgerSheet.getRange('K5').setFormula('=K3-K4');
  ledgerSheet.getRange('J6').setValue('Last 30 days spend');
  ledgerSheet.getRange('K6').setFormula('=IFERROR(-SUMIFS($E$2:$E,$E$2:$E,"<0",$A$2:$A,">="&TODAY()-30,$A$2:$A,"<="&TODAY()),0)');
  ledgerSheet.getRange('J7').setValue('Monthly budget');
  ledgerSheet.getRange('K7').setNumberFormat('[\$-409]#,##0.00;[RED]-[\$-409]#,##0.00').setValue(30000);
  ledgerSheet.getRange('J8').setValue('Budget remaining');
  ledgerSheet.getRange('K8').setFormula('=K7-K6');
  ledgerSheet.getRange('J3:K8').setBackground('#f8fafc').setBorder(true, true, true, true, true, true);
  ledgerSheet.getRange('K3:K8').setNumberFormat('[\$-409]#,##0.00;[RED]-[\$-409]#,##0.00');
  ledgerSheet.getRange('J9:K9').merge().setValue('調整 Config 工作表即可更換選單選項').setFontSize(9).setFontColor('#6b7280');
}

function styleHeader_(sheet) {
  sheet.getRange(1, 1, 1, LEDGER_HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#1d4ed8')
    .setFontColor('#ffffff')
    .setHorizontalAlignment('center');
}
