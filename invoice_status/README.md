# Invoice Status

## Problem Statement
I would like to send an email once a vehicle status is considered `shipped` by my staff inside an invoice
If someone selects `shipped` an email should be sent out: 
    - The sales representative
    - the customer with the tracking information

Currently there is confusion when something is labeled as packed/shipped, it marks the ship date as the same date the work order is created and this should not be the expected behavior. 

The person who is managing the invoice should not have to clear the inital date of ship date to enter a new one.

This should only apply to vehicle and not part because this is completed by a seperate department.
I will need to find a way to filter between what is a vehicle and what is a part.


## Additional Information
regarding the confusion when something is labeled as packed/shipped, marking ship date as the same date the work order creation
- The people who manage unpaid invoices have to manually check if the vehicle is actually built or not and then decide whether to call the customer to ask why they havent paid their bill.