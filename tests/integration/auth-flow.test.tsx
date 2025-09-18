// tests/integration/auth-flow.test.tsx
// This tests:
// * Invalid creds → error message
// * Valid creds → redirect to dashboard
// * Session persists across reloads
// * Redirect to intended page (or dashboard fallback)
// * Logout clears session


 FAIL  tests/integration/auth-flow.test.tsx > Authentication flow (integration) > redirects to dashboard on successful login
 FAIL  tests/integration/auth-flow.test.tsx > Authentication flow (integration) > persists session across reloads (simulated)
AssertionError: expected false to be true // Object.is equality

Ignored nodes: comments, script, style
<html>
  <head />
  <body>
    <div>
      <div
        class="min-h-screen bg-background"
      >
        <div
          class="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6"
        >
          <div
            class="container mx-auto flex items-center gap-4"
          >
            <img
              alt="NHS Logo"
              class="h-12 w-auto"
              src="/src/assets/nhs-logo.png"
            />
            <h1
              class="text-2xl font-bold"
            >
              CliniScribe
            </h1>
          </div>
        </div>
        <div
          class="flex items-center justify-center min-h-[calc(100vh-120px)] p-6"
        >
          <div
            class="rounded-lg border bg-card text-card-foreground shadow-sm w-full max-w-md"
          >
            <div
              class="flex flex-col p-6 space-y-1"
            >
              <h3
                class="font-semibold tracking-tight text-2xl text-center"
              >
                Sign In
              </h3>
              <p
                class="text-sm text-muted-foreground text-center"
              >
                Enter your credentials to access CliniScribe
              </p>
            </div>
            <div
              class="p-6 pt-0"
            >
              <form
                class="space-y-4"
              >
                <div
                  class="space-y-2"
                >
                  <label
                    class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    for="email"
                  >
                    Email
                  </label>
                  <input
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    id="email"
                    placeholder="firstname@email.com"
                    required=""
                    type="email"
                    value="alice@email.com"
                  />
                </div>
                <div
                  class="space-y-2"
                >
                  <label
                    class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    for="password"
                  >
                    Password
                  </label>
                  <input
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    id="password"
                    placeholder="Enter your password"
                    required=""
                    type="password"
                    value="password"
                  />
                </div>
                <button
                  class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
                  type="submit"
                >
                  Sign In
                </button>
              </form>
              <div
                class="mt-4 text-sm text-muted-foreground text-center"
              >
                <p>
                  Demo credentials:
                </p>
                <p>
                  Email: alice@email.com
                </p>
                <p>
                  Password: password
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>

- Expected
+ Received

- true
+ false

 ❯ tests/integration/auth-flow.test.tsx:79:7
     77|     expect(
     78|       patterns.some((p) => screen.queryByText(p, { exact: false }))
     79|     ).toBe(true);
       |       ^
     80|   });
     81| };
 ❯ runWithExpensiveErrorDiagnosticsDisabled node_modules/@testing-library/react/node_modules/@testing-library/dom/dist/config.js:47:12
 ❯ checkCallback node_modules/@testing-library/react/node_modules/@testing-library/dom/dist/wait-for.js:124:77
 ❯ MutationObserver.checkRealTimersCallback node_modules/@testing-library/react/node_modules/@testing-library/dom/dist/wait-for.js:118:16
 ❯ MutationObserver.invokeTheCallbackFunction node_modules/jsdom/lib/jsdom/living/generated/MutationCallback.js:19:26
 ❯ notifyMutationObservers node_modules/jsdom/lib/jsdom/living/helpers/mutation-observers.js:160:22
 ❯ node_modules/jsdom/lib/jsdom/living/helpers/mutation-observers.js:133:5

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯

 FAIL  tests/integration/auth-flow.test.tsx > Authentication flow (integration) > clears session on logout
TestingLibraryElementError: Unable to find role="button" and name `/sign in/i`

Ignored nodes: comments, script, style
<body>
  <div>
    <button>
      Logout
    </button>
    <div
      class="min-h-screen bg-background"
    >
      <div
        class="container mx-auto px-4 py-6"
      >
        <div
          class="mb-8"
        >
          <div
            class="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 rounded-t-lg shadow-lg"
          >
            <div
              class="flex items-center justify-between"
            >
              <div
                class="flex items-center gap-6"
              >
                <img
                  alt="NHS Logo"
                  class="h-20 w-auto"
                  src="/src/assets/nhs-logo.png"
                />
                <div
                  class="border-l border-primary-foreground/30 pl-6"
                >
                  <h1
                    class="text-4xl font-bold tracking-wide"
                  >
                    CliniScribe
                  </h1>
                  <p
                    class="text-primary-foreground/80 text-sm mt-1"
                  >
                    Clinical Documentation System
                  </p>
                </div>
              </div>
              <button
                class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border hover:text-accent-foreground h-10 px-4 py-2 bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                Logout
              </button>
            </div>
          </div>
          <div
            class="bg-gradient-to-r from-primary/90 to-primary/70 text-primary-foreground p-4 rounded-b-lg shadow-lg border-t border-primary-foreground/20"
          >
            <div
              class="flex items-center justify-between"
            >
              <div
                class="flex items-center gap-3"
              >
                <svg
                  class="lucide lucide-calendar h-6 w-6"
                  fill="none"
                  height="24"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                  width="24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 2v4"
                  />
                  <path
                    d="M16 2v4"
                  />
                  <rect
                    height="18"
                    rx="2"
                    width="18"
                    x="3"
                    y="4"
                  />
                  <path
                    d="M3 10h18"
                  />
                </svg>
                <div>
                  <h2
                    class="text-xl font-semibold"
                  >
                    Dashboard
                  </h2>
                  <div
                    class="flex items-center gap-3 text-primary-foreground/80 text-sm"
                  >
                    <span>
                      Dr. Sarah Williams
                    </span>
                    <div
                      class="w-px h-4 bg-primary-foreground/40"
                    />
                    <span>
                      Room 1
                    </span>
                  </div>
                </div>
              </div>
              <div
                class="text-right"
              >
                <p
                  class="text-primary-foreground/90 text-lg font-medium"
                >
                  Thursday, September 18, 2025
                </p>
                <p
                  class="text-primary-foreground/70 text-sm"
                >
                  Today's Schedule
                </p>
              </div>
            </div>
          </div>
        </div>
        <div
          class="mt-6"
        >
          <div
            class="flex items-center justify-between mb-6 p-4 bg-card rounded-lg border"
          >
            <div
              class="flex items-center gap-4"
            >
              <h2
                class="text-xl font-semibold text-foreground"
              >
                Filter by Date:
              </h2>
              <button
                aria-controls="radix-:r0:"
                aria-expanded="false"
                aria-haspopup="dialog"
                class="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-[240px] justify-start text-left font-normal"
                data-state="closed"
                type="button"
              >
                <svg
                  class="lucide lucide-calendar mr-2 h-4 w-4"
                  fill="none"
                  height="24"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                  width="24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 2v4"
                  />
                  <path
                    d="M16 2v4"
                  />
                  <rect
                    height="18"
                    rx="2"
                    width="18"
                    x="3"
                    y="4"
                  />
                  <path
                    d="M3 10h18"
                  />
                </svg>
                September 18th, 2025
              </button>
            </div>
            <button
              class="justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 flex items-center gap-2"
            >
              <svg
                class="lucide lucide-upload h-4 w-4"
                fill="none"
                height="24"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                viewBox="0 0 24 24"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                />
                <polyline
                  points="17 8 12 3 7 8"
                />
                <line
                  x1="12"
                  x2="12"
                  y1="3"
                  y2="15"
                />
              </svg>
              Import Appointments
            </button>
          </div>
          <div
            class="mt-6"
          >
            <div
              class="text-center py-12"
            >
              <p
                class="text-muted-foreground text-lg"
              >
                No appointments found for this date
              </p>
              <p
                class="text-muted-foreground text-sm mt-2"
              >
                Import appointments using the button above to get started
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>

Ignored nodes: comments, script, style
<html>
  <head />
  <body>
    <div>
      <button>
        Logout
      </button>
      <div
        class="min-h-screen bg-background"
      >
        <div
          class="container mx-auto px-4 py-6"
        >
          <div
            class="mb-8"
          >
            <div
              class="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 rounded-t-lg shadow-lg"
            >
              <div
                class="flex items-center justify-between"
              >
                <div
                  class="flex items-center gap-6"
                >
                  <img
                    alt="NHS Logo"
                    class="h-20 w-auto"
                    src="/src/assets/nhs-logo.png"
                  />
                  <div
                    class="border-l border-primary-foreground/30 pl-6"
                  >
                    <h1
                      class="text-4xl font-bold tracking-wide"
                    >
                      CliniScribe
                    </h1>
                    <p
                      class="text-primary-foreground/80 text-sm mt-1"
                    >
                      Clinical Documentation System
                    </p>
                  </div>
                </div>
                <button
                  class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border hover:text-accent-foreground h-10 px-4 py-2 bg-white/10 text-white border-white/20 hover:bg-white/20"
                >
                  Logout
                </button>
              </div>
            </div>
            <div
              class="bg-gradient-to-r from-primary/90 to-primary/70 text-primary-foreground p-4 rounded-b-lg shadow-lg border-t border-primary-foreground/20"
            >
              <div
                class="flex items-center justify-between"
              >
                <div
                  class="flex items-center gap-3"
                >
                  <svg
                    class="lucide lucide-calendar h-6 w-6"
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8 2v4"
                    />
                    <path
                      d="M16 2v4"
                    />
                    <rect
                      height="18"
                      rx="2"
                      width="18"
                      x="3"
                      y="4"
                    />
                    <path
                      d="M3 10h18"
                    />
                  </svg>
                  <div>
                    <h2
                      class="text-xl font-semibold"
                    >
                      Dashboard
                    </h2>
                    <div
                      class="flex items-center gap-3 text-primary-foreground/80 text-sm"
                    >
                      <span>
                        Dr. Sarah Williams
                      </span>
                      <div
                        class="w-px h-4 bg-primary-foreground/40"
                      />
                      <span>
                        Room 1
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  class="text-right"
                >
                  <p
                    class="text-primary-foreground/90 text-lg font-medium"
                  >
                    Thursday, September 18, 2025
                  </p>
                  <p
                    class="text-primary-foreground/70 text-sm"
                  >
                    Today's Schedule
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div
            class="mt-6"
          >
            <div
              class="flex items-center justify-between mb-6 p-4 bg-card rounded-lg border"
            >
              <div
                class="flex items-center gap-4"
              >
                <h2
                  class="text-xl font-semibold text-foreground"
                >
                  Filter by Date:
                </h2>
                <button
                  aria-controls="radix-:r0:"
                  aria-expanded="false"
                  aria-haspopup="dialog"
                  class="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-[240px] justify-start text-left font-normal"
                  data-state="closed"
                  type="button"
                >
                  <svg
                    class="lucide lucide-calendar mr-2 h-4 w-4"
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8 2v4"
                    />
                    <path
                      d="M16 2v4"
                    />
                    <rect
                      height="18"
                      rx="2"
                      width="18"
                      x="3"
                      y="4"
                    />
                    <path
                      d="M3 10h18"
                    />
                  </svg>
                  September 18th, 2025
                </button>
              </div>
              <button
                class="justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 flex items-center gap-2"
              >
                <svg
                  class="lucide lucide-upload h-4 w-4"
                  fill="none"
                  height="24"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                  width="24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                  />
                  <polyline
                    points="17 8 12 3 7 8"
                  />
                  <line
                    x1="12"
                    x2="12"
                    y1="3"
                    y2="15"
                  />
                </svg>
                Import Appointments
              </button>
            </div>
            <div
              class="mt-6"
            >
              <div
                class="text-center py-12"
              >
                <p
                  class="text-muted-foreground text-lg"
                >
                  No appointments found for this date
                </p>
                <p
                  class="text-muted-foreground text-sm mt-2"
                >
                  Import appointments using the button above to get started
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
 ❯ Proxy.waitFor node_modules/@testing-library/react/node_modules/@testing-library/dom/dist/wait-for.js:163:27
 ❯ tests/integration/auth-flow.test.tsx:282:11
    280|     fireEvent.click(logoutButtons[logoutButtons.length - 1]);
    281| 
    282|     await waitFor(() => {
       |           ^
    283|       expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    284|     });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/3]⎯

 Test Files  1 failed (1)
      Tests  3 failed | 2 passed (5)
   Start at  16:59:03
   Duration  24.67s (transform 2.39s, setup 177ms, collect 2.25s, tests 3.38s, environment 573ms, prepare 12.74s)
