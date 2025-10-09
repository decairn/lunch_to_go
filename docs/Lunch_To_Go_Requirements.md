# Lunch To Go - An Alternative Lunch Money Accounts View

## 1. Project Goal

- Provide a view of Accounts from Lunch Money personal finance software that lists in alphabetical order instead of Lunch Money's balance descending approach
- Create a publically accesible GitHub repository to share the code to do this

## 2. Target Solution Overview

- Navigation centered around Accounts and Settings
- Uses Lunch Money's API to get data (reference docs: <https://lunchmoney.dev/>)
- Uses Lunch Money subscriber API key to authenticate access to data
- Unifies data from Lunch Money API to present Account and Settings data
- Provide non-technical users with an ability to download an executable application so they don't have to setup a development environment

## 3. Functional Requirements

### 3.1 User Workflow Experience

- User opens app
- When no API Key defined or API Key is defined and Not Connected, present the Settings page otherwise present the Accounts page
  - User sees the helpful link to the Lunch Money app, clicks it, creates a new API Key, copies it to clipboard
  - User returns to this app, enters the API Key, presses Connect
  - System authenticates user to Lunch Money, gets basic user data
  - System presents basic user data to confirm connectivity, shows API Key is Connected, and prompts user to navigate to Accounts
- Only when API Key is Connected, Accounts page presented
  - On first open system gets accounts data from Lunch Money
  - System presents account names and balances in a list, including any currency conversion indicators
  - System provides a net worth summary below the list which is asset minus liabilities of account balances
  - User can refresh data using Refresh
  - User can change order of accounts with a selectable option
  - User can change currency of account balances with a selectable option

#### 3.1.1 App Navigation Experience

- Title header - 'Lunch To Go' with app icon
- Two tabs - Accounts and Settings

#### 3.1.2 Settings Experience

- Helpful link provided to URL where user can create a new API key in Lunch Money
- Card for 'API Key Management'
  - Data entry box for 'API Key', no masking of data, allow paste from clipboard, clearly show Connected or Not Connected status of it, default Not Connected
  - Action button 'Connect' - call the Lunch Money API using the API Key and get the User object
    - On success, set Connection Status as Connected and securely persist API Key and Connection Status, User Name and Primary Currency
    - On error, report error to user
  - Action button 'Delete' - sets Connection Status to Not Connected and securely persists it. Also clears and persists the API Key, User Name and Primary Currency.

- Card for 'User Data'
  - Show User Name using Title Case
  - Show Primary Currency, using Pascal Case (all CAPITALIZED)
  - Refresh when User data changes

- Toggle switch for Light and Dark color scheme options, persist across restarts, update display to new theme when toggled
- Selector drop-down for color theme (black (default), blue, green, orange, red, rose, violet, yellow), persist across restarts, update display to new color theme when changed

#### 3.1.3 Accounts Experience

- When API Key Connection Status is Not Connected, do not show any accounts data. Show a button for 'Settings' which takes user to Settings when pressed. Show a button 'Show Demo Data' which shows example accounts list and net worth using mock data.
- Card for 'Accounts Overview'
  - Action button 'Refresh' - calls Lunch Money API using the API Key and get the Assets and Plaid Accounts objects
  - Sort option selectable - sort accounts list by alphanumeric ascending or account balance descending (using Primary Currency), default alphanumeric ascending, persist choice across restarts
  - Currency option selectable - display balances using Primary Currency of user, or in Account Currency, default Primary Currency, persist choice across restarts
  - List of Accounts - Account Display Name, Days Since Update, Balance one per row.
  - List is stacked and grouped by Assets then Liabilities, then by Account Type. Both always sorted alphanumeric ascending.
  - Sort order of list follows sort option
  - Balance amount follows currency option, display follows currency locale rules, if currency option is Account Currency then show icon to left of balance with hoverover text of the format 'Converted to [Primary Currency]$25.11 at [Account Currency]US$1.00 = [Primary Currency]$[Primary Currency Balance / Account Currency Balance]1.3919' and show the account balance in account currency
  - Do not display accounts in closed status
  - Iconography required for Asset, Liability, each Account Type title lines
- Card for 'Net Worth'
  - Shows totals for assets, liabilities, and net worth (assets minus liabilities) based on the account balances
  - Always calculate and present using Primary Currency
  - The Primary Currency needs to be the 'home currency' for any display purposes e.g. Primary Currency is CAD, show $ for CAD amounts and US$ for USD amounts
  - Iconography required for Net Worth title

### 3.2 Data Integration & Security

- Provide authenticated access to Lunch Money endpoints for user profile, assets, and Plaid-linked accounts before any data retrieval occurs
- Normalize and merge asset and Plaid account data into a unified account model with consistent naming, currency, balance, and type handling, treating liabilities as negative contributions without double inversion
- Override Plaid depository account type and treat it as cash
- Persist the API key securely, allow clipboard paste, display it unmasked in Settings, and immediately clear stored data if the key is removed or invalidated
- Surface authentication failures distinctly from network or parsing errors, prompting users to correct credentials before further access attempts

### 3.3 Platform Distribution & Operations

- Package the application for responsive web and Windows NSIS desktop distribution, each providing equivalent functionality, theming, and branding assets.
- Desktop application to use the NSIS installer with Windows Credential Locker integration for secure API key storage
- Enforce constraints: English language interface, CAD/USD currency focus

## 3.4 Quality Controls

- Lunch Money API access, data model, business logic, display frameworks all have logical and physical separation to allow isolated and automated testing. Follows SOLID principles.
- Apply a structured error taxonomy (authentication, HTTP, network, parse) and deterministic retry logic with exponential backoff to keep data loads reliable
- Hydrate user preferences (API Key and Connection Status, Currency Mode, Sorting Mode, Primary Currency, User Name) before initial display to ensure continuity across sessions

## 4. Development Environment

- Maintain deterministic build and deployment without automation requiring manual launch for CICD pipeline, ensuring linting, dependency auditing, and documentation remain current across platforms
- Process constraints: AI-led implementation/testing processes. Required creation and maintenance of spec, plan, tasks, coverage matrix documents for project tracability, with updates directly by AI as project progresses
- Enforce known tools to be Next.js, Tailwind CSS, Shadcn UI, Playwright
- Enforce use of Windows-based tools only - Powershell not bash
- Research and enforce use of tools appropriate for code formatting, unit testing, integration testing, static analysis, accessibility rules compliance, security analysis such as OWASP and CVE scanning
- Provide command line tools for each step of the manual CICD
- Provide command line tools for launch of application web and Windows packages direct from the build process

## 5. Success Criteria

- Financial data displayed in the Accounts view matches Lunch Money source-of-truth balances and currency representations, including liabilities and net worth calculation
- Authentication, network, and parsing errors surface with correct taxonomy, user messaging, and retry behavior, allowing users to resolve issues themselves
- Accounts and Settings tabs render consistently across web and Windows desktop builds, preserving theming, iconography, and interactive controls
- Debug tools, theming toggles, and configuration management operate without exposing sensitive information or degrading primary user flows
