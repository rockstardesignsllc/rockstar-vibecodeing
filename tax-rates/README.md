# Tax Rates (ZIP5 sales tax tables, October 2026)

Sales tax rate tables by 5-digit ZIP code for all 50 states, DC and Puerto Rico (52 files, about 40,970 ZIP rows). Vintage: **October 2026** (the `202610` in each file name). These feed the powersports desking tool ("Rockstar Desk") tax engine.

Files are kept exactly as received. Do not edit them; drop in the next quarter's files as new versions instead.

- `TAXRATES_ZIP5_<ST>202610.csv`: one file per state, `<ST>` is the two-letter code.
- `TaxRates-UpdatedRateTablesExplained.pdf`: the publisher's notes on the rate tables.

## Columns

| Column | Meaning |
|---|---|
| `State` | Two-letter state code |
| `ZipCode` | 5-digit ZIP code |
| `TaxRegionName` | Name of the tax region for that ZIP |
| `EstimatedCombinedRate` | State + county + city + special, as a decimal (`0.082500` = 8.25%) |
| `StateRate` | State rate |
| `EstimatedCountyRate` | County rate |
| `EstimatedCityRate` | City rate |
| `EstimatedSpecialRate` | Special district rate(s) |
| `RiskLevel` | Publisher's confidence flag for the ZIP's estimate |

## Limits

- Rates are **estimates by ZIP**. A ZIP can cross city or district lines, so they are not rooftop-exact.
- They are general sales tax rates only. They do not cover vehicle-specific rules such as trade-in credit, caps on taxable amount, doc/title/registration fee taxability, or separate motor vehicle excise taxes. Those need a per-state rules table on top of this data.
