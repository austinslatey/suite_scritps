# Error Ticket

## Step 4. Which Feature does it relate to?
SuiteScript 2.0 - User Event Scripts

## Step 5. Provide a short summary of your problem/question
I am experiencing an issue in our NetSuite environment where SuiteScript 2.0 User Event scripts are not executing at all, even with proper setup and no visible errors.

Here is what I've validated:
- Script is valid and marked as Released
- Deployed to Sales Order with Before Submit enabled
- Administrator role is in the audience
- Log Level is set to Audit
- Execution Log shows nothing (no logs or errors) after Sales Order creation
- Tested with basic "log.debug" script
- Created new SO manually in UI to trigger it — still no logs appear

This behavior is consistent even after multiple deployments and testing. This strongly suggests an execution environment issue, not a script bug.

Please investigate and advise.

Thank you,  
Austin Slater  


## Who relies on this functionality and how does this disruption affect them?
(Are they able to continue working? Does it occur for every user/role or only intermittently?)

I'm the only user (Administrator role) currently testing this functionality in our sandbox environment. Since this is still in development, no other users are affected yet. However, the fact that the script doesn't execute at all prevents me from validating functionality and moving forward with implementation.

## How are your daily operations affected?
(What are you doing to lessen the impact of the problem? Is there any impact on processing or backlog volumes?)

This issue is currently delaying our ability to automate substitution of a discontinued SKU in Sales Orders. While it’s not impacting production yet, it’s blocking further development and testing that needs to be completed before a planned go-live.

## Are there any deadlines that could be impacted due to this disruption?
(Outline the potential impact after such a date.)

Yes — the longer this persists, the more it delays our internal timeline to deploy this logic to production. This script is part of a broader initiative to streamline order processing, so it has dependencies with other planned releases.

## When did you first notice this problem?
(Please specify date, time and time zone.)

7/11/2025 09:22 AM CST

## Have you used this feature without a problem before?
(Please tell us the affected and non-affected NetSuite Account IDs where you've tested/observed this.)

I previously wrote and deployed other User Event scripts in this same sandbox account, but both scripts have not executed properly. Neither script has logged anything in the Execution Log—not even simple log.audit tests—so I cannot verify if they are running at all.

## Have there been any changes to your account recently?
(For example, SuiteApp bundle update; NetSuite E-Fix/maintenance or customization changes.)

I am new to the company as of June 10, 2025, so I don’t have full historical context on prior changes to the account. However, I’ve confirmed that:

The Administrator role (which I’m using) has full privileges to run custom scripts.

Role > Setup > SuiteScript: Permissions = Full

To my knowledge, there have not been any recent SuiteApp updates, NetSuite E-Fixes, or customizations applied that would affect this script, but I cannot confirm this with certainty without access to a full change log.

## Tell us precisely how we can reproduce this problem?
(Please specify affected record IDs, detailed steps with click actions/values entered and actual vs expected result.)

Log into Sandbox;

Go to Transactions → Sales → Enter Sales Orders;

Create a brand new Sales Order using the UI;

Add the discontinued item (SKU: 26001SWC, internal ID 63374) to the line items;

Save the record;

Expected Result:
The script should automatically replace the discontinued item with the substitute item (SKU: MS-RA670, internal ID: 24844) before the record is saved.

Actual Result:
The Sales Order saves with the original item still in place. No logs appear in the Script Execution Log — not even a basic log.debug() statement. The script does not appear to be executing at all.

## Please provide the Script ID and Script Name.
Script ID: customscript_replace_sku
Script Name: replace-sku.js

## Was the script working before? Were there any changes to the script?
This is a new script being developed and tested for the first time. It has not worked at any point yet. I've simplified the logic to just basic logging to test execution — still no results.

## What is the error returned or found in the script execution log?
No error. Script does not appear at all in the execution log. No output, no trace of execution.

Additional Note:
While investigating this issue, I discovered a recurring error from a different scheduled script that may or may not be related. The error appears roughly 5 times per minute and was last recorded at 2:02 AM on 7/16/2025.

Script ID: customscript_qm_ss_trans_qtydata

Script Type: Scheduled

Error: SSS_INVALID_SRCH_OPERATOR

Message:
An nlobjSearchFilter contains an invalid operator, or is not in proper syntax: internalid.

Stack Trace Snippet:
```
at Object.getItemType (/qm_lib_item.js:26:22)  
at Object.generateQualityInvResults (/qm_lib_quality_inv_results.js:32:40)  
at evaluateQueueRecord (/qm_ss_transaction_qualityData.js:189:45)  
```

## Please provide the timestamp (with timezone) when the error occurred.
Lasted tested on July 16, 2025, at 1:11 PM CST — multiple times prior, with same result.

## What is the purpose of the script?
This script is intended to automatically replace a discontinued SKU (26001SWC, internal ID 63374) with the correct active SKU (F350, internal ID 67803) when a Sales Order is created. This helps sales users continue using the familiar SKU during entry, while ensuring that fulfillment uses the current product.

Because the production item (F350) does not exist in the sandbox, a placeholder SKU (internal ID 24844) is used for testing purposes.

The script is deployed and configured correctly, but it does not appear to trigger — no substitution occurs, and no logs are generated, even with basic log.debug() statements.

## Enter Contact Number (inc. country code)
+1 (612) 409-1450