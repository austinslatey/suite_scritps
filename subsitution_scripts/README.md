# Item Substitution Automation in NetSuite

## Overview
This project implements automated item substitution logic for Sales Orders in NetSuite, integrated with Shopify via the NetSuite Connector (Far App). It ensures discontinued SKUs are replaced with active substitutes during line entry, streamlining fulfillment and aligning with user workflows.

## Tech Stack
- **Shopify**: E-commerce platform for order creation.
- **NetSuite Connector (Far App)**: Syncs orders between Shopify and NetSuite.
- **NetSuite**: ERP system for inventory and sales order management.

## Problem Statement
When an item is added to a Sales Order, the system must check for substitute items defined in the `Item Substitute` custom record (`customrecord_scm_item_substitute`). Substitutes are classified as either `SUPERSEDED` or `REPLACEMENT`, with distinct behaviors:
- **SUPERSEDED**: Automatically replace the original item and alert the user with a message:  
  `"The part '[substituteItemName]' ([salesDescription]) supersedes this part and will be replaced in the sales order."`
- **REPLACEMENT**: Prompt the user to confirm replacement, showing the original item's stock levels:  
  `"The part '[substituteItemName]' can replace this part. The current item has [onHand] on hand and [available] available. Would you like to replace it?"`  
  - **Yes**: Replace the item.
  - **No**: Keep the original item.

The solution must enforce a mandatory `Substitute Type` field on the Item Substitute record and update all relevant Sales Order line fields (Item, Description, Rate, MPN, On Hand, Available) upon replacement.

## Solution
One script was developed to address the requirements:

**Substitute.js**: A Client Script that triggers on the `fieldChanged` event for the `item` field in Sales Orders, checks for substitutes, displays appropriate prompts, and updates the line with the substitute item and related fields.

### Implementation Details
- **Custom Record**: Utilizes the existing `customrecord_scm_item_substitute` (ID 67) with fields:
  - `custrecord_scm_itemsub_parent`: Links to the original item.
  - `custrecord_scm_itemsub_substitute`: Links to the substitute item.
  - `custrecord_substitute_type1`: Custom select field for `SUPERSEDED` or `REPLACEMENT`.
- **Substitute.js**:
  - Triggers on `fieldChanged` when the `item` field is set on a Sales Order line.
  - Searches `customrecord_scm_item_substitute` for active substitutes.
  - For `SUPERSEDED`, shows an alert with the substitute's item number and sales description, then replaces the item.
  - For `REPLACEMENT`, shows a confirmation dialog with the original item's `quantityonhand` and `quantityavailable` (filtered by Sales Order location if set), then replaces if confirmed.
  - Clears `description`, `rate`, and `custcol_custom_mpn` (MPN) fields and resets `quantity` to trigger NetSuite's re-sourcing of Description, Rate, MPN, On Hand, and Available.
  - Sets a fallback `rate` from the item's `baseprice` and calculates `amount` to avoid the "Please enter a value for amount" error.
- **Error Handling**:
  - Resolved issues with invalid record types and field IDs.
  - Added recursion prevention with an `isReplacing` flag.
  - Ensured `amount` is calculated to prevent form validation errors.
- **Logging**: Extensive console logs for debugging item IDs, search results, and field updates.

## Why
- **Efficiency**: Immediately replaces discontinued SKUs during line entry, reducing manual errors.
- **User Experience**: Preserves user workflows by automating checks and providing clear prompts.
- **Accuracy**: Ensures fulfillment uses active SKUs, aligning inventory and sales data.
- **Compliance**: Follows NetSuite scripting best practices for robust integration.

## Installation and Setup
1. **Deploy Substitute.js**:
   - Upload `Substitute.js` as a Client Script.
   - Deploy to Sales Order record.
   - Assign to roles entering Sales Orders.
2. **Verify Custom Fields**:
   - Ensure `custrecord_substitute_type1` exists on `customrecord_scm_item_substitute` with options `SUPERSEDED` and `REPLACEMENT`.
   - Confirm field IDs: `custrecord_scm_itemsub_parent`, `custrecord_scm_itemsub_substitute`, and `custcol_custom_mpn` (MPN on Sales Order lines).
3. **Test**:
   - Add a substitute to an item (e.g., 62080 -> 30804) in the Item Substitute subtab.
   - Create a Sales Order, add the item, and verify prompts and field updates.
   - Check browser console (F12) for logs if issues occur.

## Usage
- **Adding Substitutes**:
  - Navigate to an item's record (e.g., Lists > Accounting > Items).
  - Go to the Item Substitute subtab.
  - Add a substitute item, select `SUPERSEDED` or `REPLACEMENT` in the mandatory Substitute Type field, and save.
- **Sales Order Entry**:
  - Create/edit a Sales Order.
  - Add an item with a substitute.
  - For `SUPERSEDED`, expect an alert and automatic replacement.
  - For `REPLACEMENT`, confirm or decline replacement based on the original item's stock levels.
  - Verify the line updates with the new item's Description, Rate, MPN, On Hand, and Available.

## Future Development
- **Multiple Substitutes**: Enhance `Substitute.js` to handle cases where an item has multiple replacement parts. Display a dialog listing all options (Initial Part, Replacement Part 1, Replacement Part 2, etc.) and allow the user to select one.
- **Advanced Inventory Checks**: Add checks for substitute item stock levels in the `REPLACEMENT` prompt to aid decision-making.
- **Batch Processing**: Support bulk item entry scenarios (e.g., from Shopify imports) by extending the script to a User Event Script (`beforeSubmit`) for server-side processing.
- **Custom Prompts**: Allow customization of alert/confirm messages via script parameters or a custom form field.

## Known Issues and Resolutions
- **Fields Not Updating**: Fixed by clearing `description`, `rate`, and `custcol_custom_mpn` and resetting `quantity` to trigger NetSuite's field sourcing.
- **Extra Lines**: Addressed by using `fieldChanged` entry point and synchronous prompts (`window.alert`, `window.confirm`) to replace items before line commit.

## Support
- **Debugging**: Check browser console logs for item IDs, search results, and errors.
- **Field ID Verification**: Use **Customization > Lists, Records & Fields > Record Types > Item Substitute > Fields** to confirm field IDs.
- **NetSuite Help**: Contact your NetSuite administrator or refer to SuiteAnswers for scripting and form configuration issues.