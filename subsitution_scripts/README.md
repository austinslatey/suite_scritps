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
There is much more traffic on one part number than the other but the one that has more traffic is not provided by that specific manufacturer anymore... I would like to keep the 'not provided by the specific manufacturer anymore' so I don't delete the SEO that is tied to it.  

The other part-number is the same it's just made by a different manufacturer.
This is the reason I dont want to remove the first number all together, but re-route it to the other part-number that recieves less traffic in NetSuite.

simplified: two part numbers in Shopify, rerouted to the same part number in netsuite.

## Resolution
Let me know how to resolve this