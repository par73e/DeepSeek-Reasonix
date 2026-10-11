# Issue 11700 browser evidence

Isolated fixtures alpha, beta and gamma on one source-built kernel. Two independent Chrome contexts, 1440 x 1000 and 390 x 844, same host, workspace, empty search and All filter.

Before: base 9e320a452f15ca4ca552c3e498eb6a63cf11d734. Archive alpha through the existing authenticated endpoint; reload desktop and restore the mobile page. Desktop reads All 2 / Archived 1; mobile retains All 3 / Archived 0 and alpha.

After: both clients read All 2 / Archived 1 and list beta/gamma after the same sequence. The dark screenshots use the app dark theme. Files ending in 0 are wide; files ending in 1 are phone width.

This is Chrome viewport validation, not a real iOS Safari or live cloud gateway run. No credentials or real conversations are included.
