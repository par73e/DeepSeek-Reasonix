# PR #12069 UI evidence

Real Studio components and CSS rendered in a temporary component harness, using synthetic queue/message data. These are not a live kernel/Electron session.

Before: upstream studio 178dbb793; after: PR #12069 rebased onto that commit. Both use the same nav-rail section and synthetic queued/historical message. The queue editor is open. After adds the send preference and selects Cmd+Enter.

Light and dark screenshots use 1100px wide and 390px phone viewports. No horizontal overflow was observed. No visible entry was hidden or removed; the new preference precedes the existing folding/notification/advanced-appearance sections in the actual Appearance component.
