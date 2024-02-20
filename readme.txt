GIT HUB Personal Access Token - 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 - use for password when pushing
Pallet for the buttons URL - https://coolors.co/191d32-6575a4-b6c8a9-ce273d-c8ead3


Observation - discount(percentage) after deposit 1 and deposit 2 have been taken out and balance due displayed gets taken out of the final total. Not reflected on the frontend. 
- Need to make it go out of balance due.

New after sitting with user:
3. Need a deposit (as per terms and conditions). Usually 50% - this should be applied by user next to discounts. 
1. Discount needs to go out from total amount column (without VAT). Needs to visualise it in the total ammount col not in final ammount. 
2. Total ammount needs to be renamed to subtotal

4. If deposit has been added need to have a discount due 
5. Need to be able to add discount on particular style  

6. In samples - need to be able to take hours as 5.5 2.3 1.2 
7. In invoice PDF - the totals etc need to be on the right hand side of the pdf 
8. In invoice PDF - Terms and conditions - at the bottom 
9. In invoice PDF - bank details - at the bottom 
10. In invoice pdf - invoice number - next to invoice:
12. In invoice pdf - invoice for From: put at top right of page - VAT reg number.
 - To: field 

11. Invoicess - Newest at the top 




Done items:
 - 2. Add discount - Add Discount: % Flat - DONE
 - 5. Add Color to the buttons - DO NOW - DONE
- 6. When adding new clients make sure you update select client dropdown in tab 3 - DONE
- 1. Invoice: Quantify Invoice Items - if you have more than one item display as x2, x3, x10 etc - done


To do:


3. Invoice: Decenter 
4. Invoice: Bold Discount 
7. Invoice: Discount - should accept anything but numbers
8. Invoice: Discount - Percentage - should display the ammount discounted too e.g. - 12% - £500 
9. Add archive to the invoicing tab - database table - invoice number foreign key client - cascade on delete
10. Allow user to email client 
11. Invoice name to appear in pdf - INVOICE - CLIENT NAME  
12. Visualize invoices in app allow user to reopen
13. Invoice Numbers for user displayed in app in table - as Invoice Number to: Client name Created At:  
14. When inputting hours worked in tab 3 it doesnt take in hours beyond the decimal 
    - <input type="number" class="hoursWorkedInput border border-gray-400 rounded pl-2 focus:border-neutral-300 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-sky-800" min="0" placeholder="Hours Worked">
    




    Clients functions summarised 
    1. Fetch client data 
    2. Table render
    3. Submit - insert/post
    4. Edit 
    5. delete
    6. Clear forms 
    7. Event Listeners

    Clients refactor
    1. Remove Jquery
