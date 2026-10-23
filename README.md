# Stats Column Panel for Grafana

**Stats Column Panel** (`asimzulfiqar-statscolumn-panel`) is a custom Grafana panel plugin designed to solve Grafana's responsive/smartphone layout problem for multi-column Stat, Heading, and Pie/Donut views.

## Why This Plugin Exists

On a standard Grafana dashboard, arranging native Stat and Text panels in thematic vertical columns (for example, `Subject 1`, `Subject 2`, `Subject 3` or `Single Well` vs. `Well Group`) breaks down on smartphone viewports because Grafana's grid flows left-to-right row-by-row, interleaving unrelated items (`1a → 2a → 3a → 1b → 2b...`):

```text
Desktop View (Desired & Preserved)        Smartphone View (With Stats Column Panel)
┌──────────────┐  ┌──────────────┐        ┌──────────────────────────┐
│  Subject 1   │  │  Subject 2   │        │        Subject 1         │
├──────────────┤  ├──────────────┤        ├──────────────────────────┤
│      1a      │  │      2a      │        │            1a            │
├──────────────┤  ├──────────────┤   ──►  ├──────────────────────────┤
│      1b      │  │      2b      │        │            1b            │
├──────────────┤  ├──────────────┤        ├──────────────────────────┤
│      1c      │  │      2c      │        │        Subject 2         │
└──────────────┘  └──────────────┘        ├──────────────────────────┤
                                          │            2a            │
                                          ├──────────────────────────┤
                                          │            2b            │
                                          └──────────────────────────┘
```

**Stats Column Panel** "staples" each vertical column together inside a single responsive container:
- **Desktop view (`> breakpoint`):** Displays columns side-by-side (`1..N` columns) with customizable column width ratios.
- **Smartphone / narrow view (`<= breakpoint`):** Stacks each entire column vertically from top to bottom (`Column 1` items in order, followed by `Column 2` items in order) so thematic groupings and section headings are never torn apart.

---

## Features

- **Stapled Vertical Columns:** Add any number of vertical columns, each containing an ordered stack of **Stat boxes**, **Section Headings**, and **Pie / Donut Charts**.
- **Interactive Drag-to-Resize & Exact Dimension Controls:**
  - Drag the **bottom edge**, **right edge**, or **bottom-right corner grip** directly on any card in the panel to resize its height (`px`) and width (`%`) with a live dimension badge.
  - Or enter exact numeric values in the editor for **Height (`px`)**, **Width (`%`)**, **Value/Heading Font (`px`)**, **Title Font (`px`)**, **Pie Chart Diameter (`px`)**, and **Column Width Ratio (flex weight)**.
- **4 Number Formatting Styles (Panel-Level & Per-Item Override):**
  - **German grouped (`de-grouped`):** `10.000,56` (and `5,62` for values below 1,000)
  - **English grouped (`en-grouped`):** `10,000.56` (and `5.62`)
  - **Plain dot (`en-plain`):** `10000.56` (no thousands separator, dot decimal)
  - **Plain comma (`de-plain`):** `10000,56` (no thousands separator, comma decimal)
- **Full Stat Box Capabilities:**
  - **Value Calculations:** `Last (not null)`, `Last`, `First (not null)`, `First`, `Min`, `Max`, `Mean`, `Sum`, `Count`, and `Selected row` (match row by `$variable` or fallback row index).
  - **Multi-Query Support:** Bind each Stat box or Pie slice to a specific query `refId` (`A`, `B`, `C`, etc.) and field name, or auto-select the first numeric/value column.
  - **Auto-Parse SQL Value + Unit Strings:** Automatically parses SQL strings like `'22000.00 m³'` into numeric `22000` (so thresholds and German/English number formatting work) while preserving the `m³` unit suffix.
  - **Thresholds & Color Modes:** Base color + ordered threshold rules (`>=`, `>`, `<=`, `<`, `=`) with `Value text`, `Solid background`, `Gradient background`, or `None` color modes.
  - **Value Mappings:** Exact value, numeric range (`from..to`), and special matches (`null`, `NaN`, `empty`, `true`, `false`) with custom display text and optional color override.
  - **Info Tooltips `(i)`:** Optional hover tooltip icon next to any card title.
- **Built-in Pie & Donut Charts:**
  - Add a **Pie / Donut Chart** block inside any column with multiple slices bound to different queries/fields, custom colors, `%` / `Value` / `Name` labels inside slices, and a bottom or right legend.
- **Conditional Visibility & Viewport Filtering:**
  - Show or hide entire **Columns** or individual **Stat boxes / Headings / Pie charts** based on **Grafana dashboard variables** (e.g. `$view_mode != 'single_only'`) or **query field values** (`=`, `!=`, `>`, `>=`, `<`, `<=`, `contains`, `regex`, `isEmpty`, `isNotEmpty`).
  - Set viewport visibility per column or item (`All screens`, `Desktop only`, or `Mobile only`).

---

## Quick Start: Run Locally with Docker

### Prerequisites
- **Node.js 22+** and **npm**
- **Docker Desktop**

### 1. Install Dependencies and Build

```powershell
npm install
npm run build
```

This compiles the production plugin bundle into the `dist/` directory.

### 2. Start Grafana with Docker Compose

```powershell
docker compose up -d
```

Or run the container directly using `docker run`:

```powershell
docker run -d --name asimzulfiqar-statscolumn-panel -p 3000:3000 `
  -e "GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=asimzulfiqar-statscolumn-panel" `
  -e "GF_AUTH_ANONYMOUS_ENABLED=true" `
  -e "GF_AUTH_ANONYMOUS_ORG_ROLE=Admin" `
  -e "GF_USERS_DEFAULT_THEME=dark" `
  -v "${PWD}/dist:/var/lib/grafana/plugins/asimzulfiqar-statscolumn-panel" `
  -v "${PWD}/provisioning:/etc/grafana/provisioning" `
  grafana/grafana-enterprise:12.4.0
```

### 3. Open the Provisioned Demo Dashboard

Open your browser at:

```text
http://localhost:3000/d/stats-column-panel-examples/stats-column-panel-examples
```

- Anonymous Admin access is enabled by default for local testing (or sign in with `admin` / `admin`).
- Resize your browser window below `768px` (or open DevTools Device Toolbar) to see the columns stack cleanly from top to bottom without interleaving.
- Switch the **` Number Style`** variable at the top of the demo dashboard to compare `10.000,56 (German)` vs `10,000.56 (English)` vs `10000.56` vs `10000,56`.

---

## How to Install & Use as a Plugin in Your Own Grafana Instance

### Option A: Mount into a Dockerized Grafana Instance

1. Build the plugin (`npm run build`) so the `dist/` folder is generated.
2. Copy or mount the `dist/` folder into your Grafana container's plugins directory as `/var/lib/grafana/plugins/asimzulfiqar-statscolumn-panel`.
3. Allow the unsigned plugin ID in your Grafana environment variables or `grafana.ini`:

```yaml
environment:
  - GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=asimzulfiqar-statscolumn-panel
volumes:
  - ./dist:/var/lib/grafana/plugins/asimzulfiqar-statscolumn-panel
```

### Option B: Package as a Release ZIP Archive

1. Build the plugin:
   ```powershell
   npm run build
   ```
2. Create a ZIP archive containing the top-level directory `asimzulfiqar-statscolumn-panel`:
   ```powershell
   $releaseDir = Join-Path (Get-Location) 'release'
   New-Item -ItemType Directory -Force $releaseDir | Out-Null
   $staging = Join-Path $releaseDir 'asimzulfiqar-statscolumn-panel'
   if (Test-Path $staging) { Remove-Item -LiteralPath $staging -Recurse -Force }
   Copy-Item -Path dist -Destination $staging -Recurse
   $zip = Join-Path $releaseDir 'asimzulfiqar-statscolumn-panel-1.0.0.zip'
   if (Test-Path $zip) { Remove-Item -LiteralPath $zip -Force }
   Compress-Archive -Path $staging -DestinationPath $zip
   ```
3. Extract `asimzulfiqar-statscolumn-panel-1.0.0.zip` into your Grafana server's `data/plugins/` directory, add `allow_loading_unsigned_plugins = asimzulfiqar-statscolumn-panel` under `[plugins]` in `grafana.ini`, and restart Grafana.

---

## How to Configure & Use the Plugin in a Dashboard

### 1. Add Queries (Multiple Queries Supported)
In the Grafana panel query tab, add all the queries you need (`A`, `B`, `C`, `D`, etc.)—whether from InfluxDB, PostgreSQL/TimescaleDB, Prometheus, or TestData. Unlike standard Stat panels where each box is a separate panel on the dashboard grid, **Stats Column Panel** lets you bind each individual card inside a column to its own `Query RefId` (`A`, `B`, `C`, etc.) and `Field / column`.

### 2. Configure Layout & Number Formatting
In the right-hand panel options sidebar:
- **Layout:**
  - **Mobile stack breakpoint (`px`):** Width below which columns stack vertically one after another (default `768px`).
  - **Column gap (`px`)** & **Vertical item gap (`px`):** Spacing between columns and between cards inside a column.
  - **Default stat card min height (`px`):** Default height for Stat cards that don't have an individual height override.
  - **Enable interactive drag-to-resize on cards:** Enables drag handles on the bottom edge, right edge, and bottom-right corner of every card.
- **Number Formatting:**
  - **Default number format:** Choose between `German grouped (10.000,56)`, `English grouped (10,000.56)`, `Plain dot (10000.56)`, or `Plain comma (10000,56)`.
  - **Default decimals:** Default decimal places (`0`–`6`).

### 3. Build Columns and Items (`Columns & Items` Section)
- Click **Load Water Well Template** to populate a complete two-column water monitoring layout, or click **Add Column** to start from scratch.
- For each **Column**, you can configure:
  - **Optional top column header** and alignment (`Left`, `Center`, `Right`).
  - **Column width ratio (flex weight):** e.g. `1` for equal columns, or `1.5` to make a column wider on desktop.
  - **Show on viewport** (`All screens`, `Desktop only`, `Mobile only`) and **Visibility Rule** (by `$variable` or field value).
- Inside any column, use the bottom toolbar to add:
  - **`+ Stat Box`**:
    - Set **Title**, **Info tooltip `(i)`**, **Query RefId (`A`, `B`, ...)**, **Field / column** (leave empty for automatic first numeric/value column), and **Calculation** (`Last (not null)`, `Mean`, `Sum`, `Selected row`, etc.).
    - Set **Unit** (e.g. `m³`, `m ü. NHN`, `%`), **Number format override**, **Decimals override**, **No value text** (e.g. `0 m³`), **Color mode**, **Thresholds**, and **Value Mappings**.
  - **`+ Heading`**:
    - Adds an inline section header anywhere in the column (e.g. `Single Well` or `Well Group`) with customizable alignment, color, font size, and optional divider line.
  - **`+ Pie Chart`**:
    - Adds a **Pie** or **Donut** chart card inside the column. Add slices and bind each slice to a `Query RefId` + `Field` (such as `LB02`, `Remaining Quota`, `LB01`), pick slice colors, choose label content (`%`, `Value`, `Name`, `% + Value`, `Name + %`), and select legend placement (`Bottom`, `Right`, `Hidden`).

### 4. Resize Individual Elements
You can resize any card in two ways:
1. **Drag directly on the card:** Hover over a card and drag the **bottom edge** (height in `px`), **right edge** (width in `%`), or **bottom-right corner grip** (both width and height).
2. **Numeric inputs in the editor:** Expand the item in **Columns & Items** and set **Height (`px`)**, **Width (`%`)**, **Value / Heading font (`px`)**, **Title font (`px`)**, or **Chart diameter (`px`)** under **Size & Dimensions**. Click **Reset size** to return to `Auto`.

---

## Development & Verification

Run the full verification suite before packaging or committing:

```powershell
npm run typecheck   # TypeScript compiler check
npm run lint        # ESLint static analysis
npm run test:ci     # Jest unit tests (number formatting, calculations, thresholds, mappings, pie slices, visibility)
npm run build       # Production Webpack bundle in dist/
```

---

## Compatibility

- **Grafana:** `10.4.0` and later (tested with Grafana `12.4.0`).
- **Plugin Type:** Frontend-only panel plugin (`asimzulfiqar-statscolumn-panel`).

## License

Apache License 2.0. See [LICENSE](LICENSE).
