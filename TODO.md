# TODO for Updating src/pages with New Folders

## Completed
- [x] Create AdminDashboard.jsx in src/pages/admin/ that imports AdminLegend.jsx and AdminTable.jsx

## Pending
- [ ] Update App.jsx to add new route "admin-dashboard" that renders AdminDashboard component
- [ ] Update Admin.jsx to navigate to "admin-dashboard" instead of "home" after login
- [ ] Refactor Results.jsx to replace inline RadarBlock and ThemeBarsBlock with ResultsRadar.jsx and ResultsRiasecBars.jsx, and add matches section using ResultsMatches.jsx (note: occupation matching logic may need integration)
- [ ] Update Test.jsx to replace inline QuestionPalette with PaletteOverlay.jsx from test/ folder
- [ ] Test routing (admin login to dashboard), results display, and test palette
- [ ] Ensure no import errors or broken functionality
- [ ] If occupation matching in ResultsMatches.jsx needs data/logic, add or confirm with user
