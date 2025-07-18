# Substitution Issue

Currently I have a problem that I may need to write a script for in NetSuite

## Tech Stack
- Shopify
- NetSuite Connector (Far App)
- NetSuite

## Problem Statement
- When a part is added to a sales order, I need the system to check whether that part has a substitute item or not.
    - If that part has a substitute item, I need to check whether or not that substitute item is superceeding or a replacement part for the inital inputted item on the sales order. 
    - Once that happens, I need to alert the User that there is either a superceeded part or a replacement part. Seperate prompts should be listed for each use case:
        1. If the part superceeds the inital inputted part, alert the user:
        
        `The part "partName" superceeds this part and is being replaced inside the sales order`.

        2. If the part replaces the inital inputted part, get confirmation from the user:
        
        `The part "partName" can replace this part would you like to replace it?`. 
        | Yes | ... | No |
        |----------|----------|----------|
        | Replace part    | ...   | Remain the same   |


## What I need done to complete this
- Inside the `Item Substitute` page for every part, a custom field needs to be added and should be assigned to the item substitute.   
    - Superceeded part
    - Replacement part

    If the item has a substitute this should be a required input before having the ability to save the item substitute.

- When a item has either `Superceeded` or `Replacement` 
    - Add additional logic to the `Sales Order` to check for both conditions for each inputted part specified above
    


## Why
- Immediate replacement of discontinued SKUs during line entry.

- Ensures fulfillment uses the correct, active SKU without changing user habits.

- Aligns with NetSuite’s scripting best practices.

## Future Development
Once this script is fully implemented these feature should be considered

- If the inputted part has multiple replacement parts, alert the user and allow them to choose which part they would like to use.
    - Inital part
    - Replacement Part 1
    - Replacement Part 2
    - Replacement Part 3