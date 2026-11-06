import type { CaseType, Priority } from "../generated/prisma/enums";

export type SeedCase = {
  title: string;
  priority: Priority;
  type: CaseType;
  estimate: number;
  tags: string[];
  references?: string;
  preconditions?: string;
  steps: [action: string, expected: string][];
};

export type SeedSection = {
  name: string;
  cases?: SeedCase[];
  children?: SeedSection[];
};

export const commerceSections: SeedSection[] = [
  {
    name: "Authentication",
    children: [
      {
        name: "Login",
        cases: [
          {
            title: "Log in with a valid email and password",
            priority: "CRITICAL",
            type: "SMOKE",
            estimate: 3,
            tags: ["auth", "smoke"],
            references: "SHOP-101",
            preconditions: "A verified customer account exists.",
            steps: [
              ["Open /login", "The login form is displayed with email and password fields"],
              ["Enter valid credentials and press Sign in", "The customer lands on the account home page"],
              ["Reload the page", "The customer stays signed in"],
            ],
          },
          {
            title: "Reject a wrong password with a generic error",
            priority: "CRITICAL",
            type: "SECURITY",
            estimate: 3,
            tags: ["auth", "security"],
            references: "SHOP-102",
            steps: [
              ["Enter a registered email and a wrong password", "The form submits"],
              ["Read the error message", "It says the credentials don't match, without revealing that the email exists"],
            ],
          },
          {
            title: "Lock the account after five failed attempts",
            priority: "HIGH",
            type: "SECURITY",
            estimate: 5,
            tags: ["auth", "security"],
            references: "SHOP-118",
            steps: [
              ["Submit a wrong password five times", "The fifth attempt shows a lockout notice"],
              ["Submit the correct password", "Login is still refused during the lockout window"],
              ["Check the customer's inbox", "A security email explains the lockout and how to recover"],
            ],
          },
          {
            title: "Keep the customer signed in with Remember me",
            priority: "MEDIUM",
            type: "FUNCTIONAL",
            estimate: 4,
            tags: ["auth", "session"],
            steps: [
              ["Tick Remember me and sign in", "Login succeeds"],
              ["Close and reopen the browser", "The customer is still signed in"],
            ],
          },
          {
            title: "Log in with Google single sign-on",
            priority: "HIGH",
            type: "FUNCTIONAL",
            estimate: 4,
            tags: ["auth", "sso"],
            references: "SHOP-142",
            steps: [
              ["Press Continue with Google", "The Google consent screen opens"],
              ["Approve with a linked account", "The customer returns signed in to the same account"],
            ],
          },
          {
            title: "Login form is usable with keyboard only",
            priority: "MEDIUM",
            type: "UI",
            estimate: 3,
            tags: ["auth", "a11y"],
            steps: [
              ["Tab through the login form", "Focus order is email, password, Remember me, Sign in, with visible focus"],
              ["Press Enter in the password field", "The form submits"],
            ],
          },
        ],
      },
      {
        name: "Password Reset",
        cases: [
          {
            title: "Request a password reset link",
            priority: "HIGH",
            type: "FUNCTIONAL",
            estimate: 4,
            tags: ["auth", "email"],
            references: "SHOP-110",
            steps: [
              ["Open Forgot password and enter a registered email", "A neutral confirmation message appears"],
              ["Open the inbox", "A reset email arrives within a minute"],
            ],
          },
          {
            title: "Reset link expires after one hour",
            priority: "HIGH",
            type: "SECURITY",
            estimate: 5,
            tags: ["auth", "security"],
            preconditions: "A reset email older than one hour is available.",
            steps: [
              ["Open the expired link", "An expired-link page is shown with an option to request a new one"],
              ["Try to submit a new password through the expired token", "The server rejects it"],
            ],
          },
          {
            title: "New password must meet the strength policy",
            priority: "MEDIUM",
            type: "FUNCTIONAL",
            estimate: 3,
            tags: ["auth", "validation"],
            steps: [
              ["Enter 'abc' as the new password", "An inline error lists the policy"],
              ["Enter a compliant password and save", "The password updates and old sessions end"],
            ],
          },
        ],
      },
      {
        name: "Session",
        cases: [
          {
            title: "Log out ends the session on the server",
            priority: "HIGH",
            type: "SECURITY",
            estimate: 3,
            tags: ["auth", "session"],
            steps: [
              ["Press Log out", "The customer returns to the home page signed out"],
              ["Press the browser Back button", "Account pages redirect to login"],
            ],
          },
          {
            title: "Idle session times out after 30 minutes",
            priority: "LOW",
            type: "SECURITY",
            estimate: 35,
            tags: ["session"],
            steps: [
              ["Stay idle on the account page for 30 minutes", "No visible change until the next action"],
              ["Click any account link", "The customer is asked to sign in, then returned to that page"],
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Cart",
    children: [
      {
        name: "Line Items",
        cases: [
          {
            title: "Add a product to the cart from the product page",
            priority: "CRITICAL",
            type: "SMOKE",
            estimate: 2,
            tags: ["cart", "smoke"],
            references: "SHOP-201",
            steps: [
              ["Open an in-stock product and press Add to cart", "The mini cart opens with the product"],
              ["Check the cart badge in the header", "The count increases by one"],
            ],
          },
          {
            title: "Update line item quantity",
            priority: "HIGH",
            type: "FUNCTIONAL",
            estimate: 3,
            tags: ["cart"],
            steps: [
              ["Increase quantity to 3", "Line total and subtotal update without a full page reload"],
              ["Set quantity to 0", "The item is removed after a confirmation"],
            ],
          },
          {
            title: "Prevent quantity above available stock",
            priority: "HIGH",
            type: "FUNCTIONAL",
            estimate: 3,
            tags: ["cart", "inventory"],
            preconditions: "A product with exactly 2 units in stock.",
            steps: [
              ["Add the product and set quantity to 5", "Quantity is capped at 2 with an explanation"],
            ],
          },
          {
            title: "Remove an item and undo",
            priority: "MEDIUM",
            type: "UI",
            estimate: 2,
            tags: ["cart"],
            steps: [
              ["Press Remove on a line item", "The item disappears and an Undo toast shows"],
              ["Press Undo", "The item returns with the same quantity"],
            ],
          },
          {
            title: "Guest cart merges into the account at login",
            priority: "HIGH",
            type: "REGRESSION",
            estimate: 5,
            tags: ["cart", "auth"],
            references: "SHOP-233",
            steps: [
              ["As a guest add product A", "Product A is in the cart"],
              ["Log in to an account whose cart holds product B", "The cart contains both A and B"],
            ],
          },
          {
            title: "Cart persists across devices",
            priority: "MEDIUM",
            type: "FUNCTIONAL",
            estimate: 5,
            tags: ["cart"],
            steps: [
              ["Add a product on desktop", "The cart updates"],
              ["Sign in on a phone", "The same product shows in the cart"],
            ],
          },
          {
            title: "Show a notice when a cart item's price changes",
            priority: "MEDIUM",
            type: "FUNCTIONAL",
            estimate: 6,
            tags: ["cart", "pricing"],
            steps: [
              ["Add a product, then change its price in the admin", "The price is saved"],
              ["Reload the cart", "The new price shows with a price-changed notice"],
            ],
          },
          {
            title: "Cart API returns totals under 300 ms at p95",
            priority: "LOW",
            type: "PERFORMANCE",
            estimate: 20,
            tags: ["cart", "api"],
            steps: [
              ["Run the cart load profile at 200 requests per second", "The run finishes without errors"],
              ["Read p95 latency for GET /api/cart", "p95 stays under 300 ms"],
            ],
          },
        ],
      },
      {
        name: "Promotions",
        cases: [
          {
            title: "Apply a valid percentage coupon",
            priority: "HIGH",
            type: "FUNCTIONAL",
            estimate: 3,
            tags: ["cart", "promo"],
            references: "SHOP-250",
            steps: [
              ["Enter coupon SAVE10 and press Apply", "A 10% discount row appears"],
              ["Check the order total", "The total is reduced by the correct amount"],
            ],
          },
          {
            title: "Reject an expired coupon",
            priority: "MEDIUM",
            type: "FUNCTIONAL",
            estimate: 2,
            tags: ["cart", "promo"],
            steps: [["Enter an expired coupon", "An error explains that the coupon has expired, and totals don't change"]],
          },
          {
            title: "Coupons with a minimum spend are enforced",
            priority: "MEDIUM",
            type: "FUNCTIONAL",
            estimate: 4,
            tags: ["cart", "promo"],
            steps: [
              ["Apply a coupon below the minimum spend", "The error states the remaining amount"],
              ["Add items above the minimum and re-apply", "The discount applies"],
            ],
          },
          {
            title: "Discount is removed when the cart drops below the minimum",
            priority: "MEDIUM",
            type: "REGRESSION",
            estimate: 3,
            tags: ["cart", "promo"],
            steps: [
              ["Apply a minimum-spend coupon", "The discount applies"],
              ["Remove items so the subtotal is below the minimum", "The discount is removed with a notice"],
            ],
          },
          {
            title: "Free shipping threshold banner updates live",
            priority: "LOW",
            type: "UI",
            estimate: 2,
            tags: ["cart", "shipping"],
            steps: [["Change quantities around the threshold", "The banner's remaining amount updates each time"]],
          },
        ],
      },
    ],
  },
  {
    name: "Checkout",
    children: [
      {
        name: "Shipping",
        cases: [
          {
            title: "Complete checkout as a guest",
            priority: "CRITICAL",
            type: "SMOKE",
            estimate: 6,
            tags: ["checkout", "smoke"],
            references: "SHOP-301",
            steps: [
              ["From the cart press Checkout and choose Guest", "The shipping step opens"],
              ["Enter a valid address and continue", "Shipping methods load"],
              ["Pay with a test card", "The confirmation page shows an order number"],
            ],
          },
          {
            title: "Validate required address fields",
            priority: "HIGH",
            type: "FUNCTIONAL",
            estimate: 3,
            tags: ["checkout", "validation"],
            steps: [
              ["Press Continue with an empty form", "Each required field shows an inline error"],
              ["Fix the errors", "Errors clear as each field becomes valid"],
            ],
          },
          {
            title: "Saved address is prefilled for signed-in customers",
            priority: "MEDIUM",
            type: "FUNCTIONAL",
            estimate: 2,
            tags: ["checkout", "profile"],
            steps: [["Start checkout with a saved default address", "The address is preselected"]],
          },
          {
            title: "Shipping rates change with the destination country",
            priority: "HIGH",
            type: "FUNCTIONAL",
            estimate: 4,
            tags: ["checkout", "shipping"],
            references: "SHOP-318",
            steps: [
              ["Enter a domestic address", "Domestic methods and rates show"],
              ["Switch to an international address", "International rates replace them and totals update"],
            ],
          },
          {
            title: "Block shipping to unsupported regions",
            priority: "MEDIUM",
            type: "REGRESSION",
            estimate: 2,
            tags: ["checkout", "shipping"],
            steps: [["Enter an unsupported region", "A clear message appears and Continue stays disabled"]],
          },
        ],
      },
      {
        name: "Review and Place Order",
        cases: [
          {
            title: "Order summary matches the cart",
            priority: "CRITICAL",
            type: "FUNCTIONAL",
            estimate: 3,
            tags: ["checkout"],
            steps: [["Compare items, quantities, discounts and tax with the cart", "All values match"]],
          },
          {
            title: "Tax is calculated from the shipping address",
            priority: "HIGH",
            type: "FUNCTIONAL",
            estimate: 4,
            tags: ["checkout", "tax"],
            references: "SHOP-330",
            steps: [
              ["Use an address in a taxed state", "A tax row appears with the expected rate"],
              ["Change to a tax-free state", "The tax row updates to zero"],
            ],
          },
          {
            title: "Prevent duplicate orders on double click",
            priority: "CRITICAL",
            type: "REGRESSION",
            estimate: 3,
            tags: ["checkout", "payment"],
            references: "SHOP-344",
            steps: [
              ["Double click Place order", "The button disables after the first click"],
              ["Check the order list", "Exactly one order exists"],
            ],
          },
          {
            title: "Confirmation email contains the order details",
            priority: "HIGH",
            type: "FUNCTIONAL",
            estimate: 4,
            tags: ["checkout", "email"],
            steps: [["Place an order and open the email", "Number, items, totals and address are correct"]],
          },
          {
            title: "Handle an item selling out during checkout",
            priority: "HIGH",
            type: "FUNCTIONAL",
            estimate: 6,
            tags: ["checkout", "inventory"],
            steps: [
              ["Start checkout, then set the item's stock to zero in the admin", "Stock is updated"],
              ["Press Place order", "The order is stopped and the customer is sent back to the cart with a notice"],
            ],
          },
          {
            title: "Checkout works at mobile width",
            priority: "MEDIUM",
            type: "UI",
            estimate: 5,
            tags: ["checkout", "responsive"],
            steps: [["Complete checkout at 375 px wide", "No horizontal scrolling, and all controls are reachable"]],
          },
        ],
      },
    ],
  },
  {
    name: "Payment",
    children: [
      {
        name: "Cards",
        cases: [
          {
            title: "Pay with a valid Visa card",
            priority: "CRITICAL",
            type: "SMOKE",
            estimate: 3,
            tags: ["payment", "smoke"],
            references: "PAY-11",
            preconditions: "The payment provider is in test mode.",
            steps: [
              ["Enter test Visa details and pay", "The payment is authorized"],
              ["Check the order in the admin", "The status is Paid"],
            ],
          },
          {
            title: "Show a clear message for a declined card",
            priority: "CRITICAL",
            type: "FUNCTIONAL",
            estimate: 3,
            tags: ["payment"],
            references: "PAY-14",
            steps: [
              ["Pay with the provider's decline test card", "A decline message appears and no order is created"],
              ["Retry with a valid card", "The payment succeeds without re-entering the address"],
            ],
          },
          {
            title: "Complete 3-D Secure authentication",
            priority: "HIGH",
            type: "FUNCTIONAL",
            estimate: 4,
            tags: ["payment", "3ds"],
            references: "PAY-21",
            steps: [
              ["Pay with a 3DS test card", "The challenge opens"],
              ["Approve the challenge", "The order completes"],
              ["Repeat and fail the challenge", "The payment fails with a friendly message"],
            ],
          },
          {
            title: "Card fields never reach the merchant server",
            priority: "CRITICAL",
            type: "SECURITY",
            estimate: 8,
            tags: ["payment", "security", "pci"],
            steps: [
              ["Record network traffic during payment", "Card data goes only to the provider's domain"],
              ["Inspect application logs", "No card numbers or CVC values appear"],
            ],
          },
          {
            title: "Save a card for later",
            priority: "MEDIUM",
            type: "FUNCTIONAL",
            estimate: 4,
            tags: ["payment", "profile"],
            steps: [
              ["Tick Save this card and pay", "The payment succeeds"],
              ["Start another checkout", "The saved card shows its last four digits only"],
            ],
          },
          {
            title: "Payment webhook retries are idempotent",
            priority: "HIGH",
            type: "API",
            estimate: 10,
            tags: ["payment", "api"],
            references: "PAY-33",
            steps: [
              ["Send the same payment-succeeded webhook twice", "Both requests return 200"],
              ["Check the order", "It is marked paid once, with one email and one stock decrement"],
            ],
          },
        ],
      },
      {
        name: "Wallets and Refunds",
        cases: [
          {
            title: "Pay with Apple Pay in Safari",
            priority: "HIGH",
            type: "FUNCTIONAL",
            estimate: 4,
            tags: ["payment", "wallet"],
            steps: [["Choose Apple Pay and approve the sheet", "The order completes with the wallet's address"]],
          },
          {
            title: "Pay with PayPal and return to the store",
            priority: "HIGH",
            type: "FUNCTIONAL",
            estimate: 5,
            tags: ["payment", "wallet"],
            references: "PAY-40",
            steps: [
              ["Choose PayPal and approve in the popup", "The customer returns to the review step"],
              ["Place the order", "The order is paid through PayPal"],
            ],
          },
          {
            title: "Cancelling PayPal keeps the cart intact",
            priority: "MEDIUM",
            type: "REGRESSION",
            estimate: 3,
            tags: ["payment", "wallet"],
            steps: [["Open PayPal and cancel", "The customer returns to payment with the cart unchanged"]],
          },
          {
            title: "Issue a full refund from the admin",
            priority: "HIGH",
            type: "FUNCTIONAL",
            estimate: 5,
            tags: ["payment", "refund"],
            references: "PAY-52",
            steps: [
              ["Open a paid order and press Refund in full", "The order changes to Refunded"],
              ["Check the provider dashboard", "The refund is recorded for the full amount"],
            ],
          },
          {
            title: "Partial refund updates the order balance",
            priority: "MEDIUM",
            type: "FUNCTIONAL",
            estimate: 5,
            tags: ["payment", "refund"],
            steps: [["Refund one line item", "The refunded amount and remaining balance are correct"]],
          },
        ],
      },
    ],
  },
  {
    name: "Profile",
    children: [
      {
        name: "Account",
        cases: [
          {
            title: "Update name and phone number",
            priority: "MEDIUM",
            type: "FUNCTIONAL",
            estimate: 2,
            tags: ["profile"],
            steps: [
              ["Change the name and phone number, then save", "A success toast shows"],
              ["Reload the page", "The new values persist"],
            ],
          },
          {
            title: "Change email requires re-verification",
            priority: "HIGH",
            type: "SECURITY",
            estimate: 5,
            tags: ["profile", "security"],
            references: "SHOP-410",
            steps: [
              ["Change the email", "A verification email goes to the new address, and a notice to the old one"],
              ["Open the verification link", "The new email becomes active"],
            ],
          },
          {
            title: "Change password requires the current password",
            priority: "HIGH",
            type: "SECURITY",
            estimate: 3,
            tags: ["profile", "security"],
            steps: [
              ["Submit a wrong current password", "An error shows and nothing changes"],
              ["Submit the correct current password", "The password changes"],
            ],
          },
          {
            title: "Order history lists past orders newest first",
            priority: "MEDIUM",
            type: "FUNCTIONAL",
            estimate: 3,
            tags: ["profile", "orders"],
            steps: [
              ["Open Order history", "Orders are sorted newest first with status and total"],
              ["Open an order", "Its details and tracking link appear"],
            ],
          },
          {
            title: "A customer cannot view another customer's order",
            priority: "CRITICAL",
            type: "SECURITY",
            estimate: 4,
            tags: ["profile", "security", "api"],
            references: "SHOP-431",
            steps: [
              ["Request another customer's order by its ID", "The API returns 404"],
              ["Open the same order URL in the browser", "A not-found page appears"],
            ],
          },
          {
            title: "Delete account flow removes personal data",
            priority: "MEDIUM",
            type: "FUNCTIONAL",
            estimate: 6,
            tags: ["profile", "privacy"],
            steps: [
              ["Request deletion and confirm by email", "The account is scheduled for deletion"],
              ["Try to sign in afterward", "Login fails"],
            ],
          },
        ],
      },
      {
        name: "Addresses",
        cases: [
          {
            title: "Add a new shipping address",
            priority: "MEDIUM",
            type: "FUNCTIONAL",
            estimate: 2,
            tags: ["profile", "address"],
            steps: [["Add a valid address and save", "It appears in the address book"]],
          },
          {
            title: "Set a default shipping address",
            priority: "LOW",
            type: "FUNCTIONAL",
            estimate: 2,
            tags: ["profile", "address"],
            steps: [
              ["Mark an address as default", "A Default badge moves to it"],
              ["Start checkout", "That address is preselected"],
            ],
          },
          {
            title: "Deleting a used address keeps past orders intact",
            priority: "MEDIUM",
            type: "REGRESSION",
            estimate: 3,
            tags: ["profile", "address", "orders"],
            steps: [
              ["Delete an address used on a past order", "It leaves the address book"],
              ["Open that past order", "The original shipping address still shows"],
            ],
          },
        ],
      },
    ],
  },
];

export const mobileSections: SeedSection[] = [
  {
    name: "Onboarding",
    children: [
      {
        name: "First Launch",
        cases: [
          {
            title: "Sign in with biometrics after first login",
            priority: "HIGH",
            type: "FUNCTIONAL",
            estimate: 3,
            tags: ["mobile", "auth"],
            steps: [
              ["Log in and accept the Face ID prompt", "Biometric login is enabled"],
              ["Relaunch the app", "The app unlocks with Face ID"],
            ],
          },
          {
            title: "Push notification permission prompt timing",
            priority: "LOW",
            type: "UI",
            estimate: 2,
            tags: ["mobile", "push"],
            steps: [["Install the app and place a first order", "The prompt appears after the order, not on launch"]],
          },
          {
            title: "Deep link opens the product screen",
            priority: "MEDIUM",
            type: "FUNCTIONAL",
            estimate: 3,
            tags: ["mobile", "links"],
            steps: [["Tap a product link in an email", "The app opens on that product"]],
          },
        ],
      },
    ],
  },
  {
    name: "Shopping",
    children: [
      {
        name: "Browse",
        cases: [
          {
            title: "Home feed loads within two seconds on 4G",
            priority: "HIGH",
            type: "PERFORMANCE",
            estimate: 5,
            tags: ["mobile", "performance"],
            steps: [["Throttle to 4G and open the app", "The feed is interactive within two seconds"]],
          },
          {
            title: "Search returns results for partial product names",
            priority: "HIGH",
            type: "FUNCTIONAL",
            estimate: 2,
            tags: ["mobile", "search"],
            steps: [["Search for 'snea'", "Sneaker products appear first"]],
          },
        ],
      },
      {
        name: "Mobile Checkout",
        cases: [
          {
            title: "Pay with Google Pay on Android",
            priority: "CRITICAL",
            type: "SMOKE",
            estimate: 3,
            tags: ["mobile", "payment"],
            steps: [["Choose Google Pay and confirm", "The order completes and shows a confirmation"]],
          },
          {
            title: "Cart survives the app being killed",
            priority: "MEDIUM",
            type: "REGRESSION",
            estimate: 2,
            tags: ["mobile", "cart"],
            steps: [["Add an item and force close the app", "On relaunch the item is still in the cart"]],
          },
          {
            title: "Show a retry option when the connection drops at payment",
            priority: "HIGH",
            type: "FUNCTIONAL",
            estimate: 4,
            tags: ["mobile", "payment", "offline"],
            steps: [
              ["Enable airplane mode and press Pay", "A retry prompt appears and no charge is made"],
              ["Reconnect and retry", "The payment completes once"],
            ],
          },
        ],
      },
    ],
  },
];

/** Plausible failure details for seeded FAILED and BLOCKED results. */
export const failureNotes = [
  { comment: "Reproduced three times on the staging build.", actual: "Spinner never resolves and the request times out after 30 s.", defect: "SHOP-512" },
  { comment: "Only happens right after a fresh deploy.", actual: "A 500 error page appears instead of the expected screen.", defect: "SHOP-518" },
  { comment: "Regression from the latest pricing change.", actual: "The total is off by the tax amount.", defect: "PAY-77" },
  { comment: "Looks like a race between the two requests.", actual: "The second click created a duplicate record.", defect: "SHOP-527" },
  { comment: "Safari only. Chrome and Firefox are fine.", actual: "The form field loses focus after each keystroke.", defect: "SHOP-533" },
  { comment: "Copy doesn't match the design.", actual: "A raw error code is shown to the customer.", defect: "SHOP-540" },
];

export const blockedNotes = [
  "The payment sandbox is down, so this can't be executed yet.",
  "Waiting on test data from the platform team.",
  "Blocked by the staging email service outage.",
];
