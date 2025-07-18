# Substitution Issue

Currently I have a problem that I may need to write a script for in NetSuite

## Tech Stack
- Shopify
- NetSuite Connector (Far App)
- NetSuite

## Problem Statement
Client Script that triggers when a user creates or enters a discontinued SKU (internal ID: 63374, SKU: 26001SWC) on the Sales Order item sublist. The script automatically replaces the discontinued SKU with the substitute SKU (MS-RA670, internal ID: 24844) immediately before the line is committed.

This approach ensures accurate SKU substitution occurs interactively during order entry, preserving the seamless user experience.


#### Why
- Immediate replacement of discontinued SKUs during line entry.

- Ensures fulfillment uses the correct, active SKU without changing user habits.

- Aligns with NetSuite’s scripting best practices.

- Tested and verified working in your sandbox environment.


## Resolution
Deploy this client script on the Sales Order record and retry adding the discontinued SKU. The script will automatically replace it upon entry. In the meantime, We will set the status of this case to pending customer review to give you time to consider the details mentioned above. 
 