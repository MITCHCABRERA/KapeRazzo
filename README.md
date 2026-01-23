
# KapeRazzo Coffee House



## About

KapeRazzo Coffee House is a cozy neighborhood café serving specialty coffee, teas, and freshly baked pastries. We aim to create a warm, welcoming space where people can relax, order ahead, or reserve a table. Our goal is simple: good drinks, good food, good company.

- Note: Updated codebase for js implementation is on branch JS_IMPLEMENTATION. Review there for the latest changes.

---

## Table of Contents

- [About](#about)  
- [Features](#features)  
  - [Admin](#admin)  
  - [Menu](#menu)  
  - [Gallery](#gallery)  
  - [Order](#order)  
  - [Reservation](#reservation)  
- [Usage](#usage)  
- [Structure](#structure)  
- [Technologies Used](#technologies-used)  
- [Contributing](#contributing)  
- [License](#license)

---

---

## Features

Here are the main features of the website:

### Admin

- A backend/admin panel (or dummy/admin section) for managing items in the menu (drinks, pastries), specials, gallery images, and reservation slots.  
- Ability to add, edit, or remove menu items.  
- Ability to view reservations and orders.

### Menu

- Display categories (e.g. coffee, teas, pastries).  
- Each item: name, short description, price, image.  
- “Featured” items on homepage with a “See Full Menu” link.  

### Gallery

- Photos of the café atmosphere, products (drinks, pastries), interior décor.  
- Organized as a grid or gallery section.  
- Possibly “lightbox” view to enlarge images.

### Order

- Users can choose items from the menu and place an order.  
- Order form captures what items, quantity, perhaps modifications (e.g. sugar, milk).  
- Summary of order, total price.  
- (If live) integration with payment or pick‐up/delivery options.  
- Because this is a demo / school project, note that payments may not be processed.

### Reservation

- A system for users to reserve a table.  
- Form includes: date, time, name, contact info, number of people.  
- Confirmation (on screen; maybe email in a full version).

---

## Usage

You can explore the KapeRazzo Coffee House website by visiting:

➡️ **[KapeRazzo Coffee House Website](https://mitchcabrera.github.io/CoffeeShop/index.html)**  

Once the site is open in your browser, you can navigate using the **navigation bar** at the top of the page.  

Here’s how you can explore each section:

1. **Home (Index)**  
   - The landing page that welcomes you to KapeRazzo Coffee House.  
   - Displays featured promotions, top menu items, and a quick introduction to the café.  

2. **Menu**  
   - Shows the full list of available drinks, pastries, and other offerings.  
   - Each item includes its name, price, and image for easy browsing.  

3. **Order**  
   - Lets you select menu items and place an order.  
   - You can input quantity and details, then submit the form to simulate an order.  

4. **Reservation**  
   - Provides a reservation form where you can choose date, time, and number of guests.  
   - Ideal for booking a table ahead of time.  

5. **Gallery**  
   - Displays a collection of photos featuring drinks, food, and the café’s interior.  
   - You can click on images (if supported) to view them in a larger format.  

6. **About**  
   - Shares information about the café’s story, mission, and what makes it special.  

7. **Admin**  
   - Leads to the admin panel page (if implemented) where menu items, orders, and reservations can be managed.  
   - Typically used by café staff, not customers.

Use the navigation links to jump between pages, or use your browser's **Back** and **Forward** buttons to move through your history.  


---

## Structure

Here’s an outline of how the website is organized:

## Structure

| Section / Element          | Purpose / Content                                                                                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Navigation**             | Top menu with links to: Home, Menu, Order, Reserve, Gallery, About, Admin. This allows users to jump to different pages/sections. ([mitchcabrera.github.io][1])                                       |
| **Home / Hero Section**    | Welcomes visitors: “Welcome to KapeRazzo Coffee House … Order ahead or reserve a table.” Buttons for “Order Now” and “Reserve a Table.” ([mitchcabrera.github.io][1])                                 |
| **Special Offers**         | Highlights limited‐time or recurring promos: e.g. “Morning Duo”, “Matcha Wednesdays”, “Friends Bundle.” Each with images and prices. ([mitchcabrera.github.io][1])                                    |
| **Featured Menu Items**    | Shows a few highlighted items (Cappuccino, Matcha Latte, Butter Croissant) with images, descriptions, and prices. Gives a taste of what’s offered without overwhelming. ([mitchcabrera.github.io][1]) |
| **Footer or Contact Info** | Café address, hours (Mon–Sun 7:00 AM – 9:00 PM) → establishes legitimacy, gives visiting info. Also social media icons. ([mitchcabrera.github.io][1])                                                 |
| **Gallery / Images**       | Several images throughout: drinks, café scenes, pastries. These serve both for the specials and the menu preview. ([mitchcabrera.github.io][1])                                                       |
| **Admin page linked**      | There is a link “Admin” in navigation, suggesting there’s a page reserved for administrative functions (maybe for managing content). It might be a placeholder. ([mitchcabrera.github.io][1])         |

[1]: https://mitchcabrera.github.io/CoffeeShop/index.html "KapeRazzo Coffee House — Home"

---

## Technologies Used

- HTML5, CSS3 (+ any frameworks used, e.g. Bootstrap, or custom CSS)  
- JavaScript (for interactivity, forms)- Includes modular JS for Menu, Cart, Reservations, and Admin interactions
- Bootstrap 5 (via CDN or local assets) for responsive components and layout
- Optional backend (for Admin / data storage) – could be PHP, Node.js, or a static site with JSON.  
- Deployment via GitHub Pages

---

## Contributing

- Feel free to submit issues or pull requests.  
- If adding new menu items/images, follow existing naming/image‐size conventions.  
- For style/layout changes, keep consistent with current visual design (fonts, colors, spacing).

---

📘 **Project Plan:**  
You can view our detailed development and revision timeline here: https://docs.google.com/spreadsheets/d/1E4tAfxPUF5yBLNnu5sZLmQg42hFM-adwZJbKHZo_pVE/edit?usp=sharing 

---

## License

This project is for educational/school purposes. No commercial license included.  






