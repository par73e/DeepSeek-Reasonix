# Queue read failure: browser fixture evidence

Before/after the patch associated with issue #14959, at studio f4f32cc7d.
The actual Queue component and queue-read hook run in a controlled browser fixture.
A single simulated read failure hides the queue before the patch and retains it afterwards.
Layouts: 1280 px wide and 390 px phone width; light and dark.
These are component screenshots, not the reporter's Windows/kernel reproduction.
