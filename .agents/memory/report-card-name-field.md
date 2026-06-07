---
name: Report card template name field positioning
description: Why student names land on body text instead of header, and the three-layer fix
---

## Symptom
In fill-template-pdf, student names like "Tuan Minh" float over the body paragraph instead of appearing in the header next to "Student Name:". Short names like "Min" merge with body text ("Minstudents...").

## Root cause
AI field detection (detect-template-fields) reads the template image and guesses the nameField Y percentage. For Vietnamese school templates, the AI confuses the first body paragraph's Y with the name blank's Y — placing the name too low (~55% down page instead of ~17%).

## Three-layer fix (all applied)

1. **Y-position sanity cap** (`fill-template-pdf` route, ~line 5616):
   - `nameField.y` is clamped to `Math.min(rawNameField.y, 40)` 
   - Name blanks are always in the top 40% of the page (header area)

2. **White background rectangle** drawn before the name text:
   - Covers any hardcoded template text (e.g. "Moon") underneath
   - Uses `stdBoldFont.widthOfTextAtSize()` to size the rectangle precisely

3. **Improved AI detection prompt** (`detect-template-fields` route, ~line 5335):
   - Explicitly says: find the blank AFTER "Student Name:" label in the top section
   - Says: do NOT place nameField in body paragraph text area
   - Says: if blank line is in top 30% set y accordingly

## After deploying
Users must re-upload their template PDF to re-run field detection with the improved prompt. Existing fieldMap cached from old upload still has wrong Y.
