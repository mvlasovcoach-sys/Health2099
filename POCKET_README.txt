Pocket Health Links
===================

Offline usage
-------------

1. Open each HTML file in your browser once while you are online (`pocket_health_link.html`, `Summary.html`, `Diary.html`).
2. Add them to your reading list or home screen; modern browsers will cache the assets for offline use.
3. The app stores data in `localStorage`, so entries stay on the device even without connectivity.

Backups
-------

- Use the **Export JSON** button on the diary page regularly. Save the file to cloud storage or email it to yourself.
- To restore, pick **Import JSON** and choose the saved file. Existing entries merge by `id` and the latest `updated_at` timestamp wins.
- Settings are merged as well, so older backups will not wipe newer configuration values.

Tips
----

- Keep multiple backups in case a file becomes corrupted.
- For cross-device transfer, export on one device and import on the other while both are online to move the JSON file.
