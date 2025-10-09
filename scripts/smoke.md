# Smoke checklist

1. **Load pages**
   - Open `pocket_health_link.html` and follow links to Summary and Diary pages.
   - Confirm navigation bar renders with Summary + Diary entries.
2. **Add + sync**
   - On `Summary.html`, tap `+250 ml water` twice.
  - Switch to `Diary.html` (same tab or a new one) and verify totals/cards reflect 500 ml water today.
   - Edit the water entry value in the diary table; confirm the change appears back on Summary without reload.
3. **Soft delete**
   - In the diary table delete the edited entry and confirm it disappears while the totals update.
4. **Export/import**
   - Export from the diary; inspect the downloaded JSON contains the latest event(s).
   - Import the same file; toast should read `Импорт: +0, обновлено 0` and no duplicates appear.
5. **Cross-tab sync**
   - Open Summary in a second tab. Add sleep on tab A and ensure tab B updates automatically.

(Optional) record a GIF showing adding water and watching the totals update live.
