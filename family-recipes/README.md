# Family Recipes

A small app for keeping the family's recipes and planning the weekly menu.

It is a static web app with no build step and no dependencies. Data is saved in
the browser (`localStorage`). Use **Export** and **Import** to back it up or
move it to another device.

## Run it

```bash
cd family-recipes
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly in a browser also works.

## Features

- **Recipes**: name, category, servings, prep time, ingredients, steps, notes
- **Search** recipes by name, ingredient or category
- **Weekly menu**: pick a recipe for breakfast, lunch and dinner each day
- **Shopping list**: built from the ingredients of the recipes on this week's menu
- **Export / Import** all data as a JSON file

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page layout |
| `styles.css` | Styling |
| `app.js` | Data storage and UI logic |
| `sample-data.json` | Example recipes you can import to get started |

## Shared online version

`shared-page.html` is the version published as a private claude.ai page. It
saves recipes and the weekly menu in the page's shared storage, so everyone
the page is shared with sees the same data.
