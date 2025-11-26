const resultsPrintStyles = `
  .card {
    border: 1px solid #d1d5db;
    border-radius: 16px;
    background: #ffffff;
    margin-bottom: 18px;
  }

  @media print {
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .no-print {
      display: none !important;
    }
    .candidate-first-page {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      /* A3 page height minus margins; keeps details anchored to bottom of first page */
      min-height: calc(420mm - 60mm);
      page-break-after: always;
      padding-bottom: 24px;
    }
    .candidate-first-page .candidate-card {
      margin-top: auto;
    }
  }
`;

export default resultsPrintStyles;
