# Obsidian Experimental Plugin

> **Status:** personal / experimental — *not published on the Obsidian marketplace.*

A single plugin that bundles several small utilities ("sub‑plugins") I use in my Obsidian vaults.  

Feel free to borrow ideas, but expect rough edges.

## Sub-Plugins Overview

### Markdown Headings

| Component                      | Description                                        |
| ------------------------------ | -------------------------------------------------- |
| **MoveToHeadingComponent**     | Jump cursor between headings                       |
| **FoldHeadingsComponent**      | Fold / unfold heading sections                     |
| **HeadingExtractorComponent**  | Move heading sections across files                 |
| **HeadingExtraToolsComponent** | Sort, swap, change level; (custom) smart insert, … |

### Others (General Utilities)

| Component                  | Description                                          |
| -------------------------- | ---------------------------------------------------- |
| **ReferencingComponent**   | video/channel/playlist references (YouTube API)      |
| **TextFormatComponent**    | Line sort, normalize whitespace, case transform, ... |
| **MiscellaneousComponent** | Mostly personal helpers                              |

### Experimental

> These components do not contain any meaningful functionality

| Component                 | Description                     |
| ------------------------- | ------------------------------- |
| **TimeComponent**         | Basic Obsidian API playground   |
| **SuggestComponent**      | Obsidian suggest API playground |
| **ScriptRunnerComponent** | Settings UI playground          |


## Project Layout

```txt
src/
    components/
        mdHeadings/
            moveToHeading/
            foldHeadings/
            headingExtractor/
            headingExtraTools/
        others/
            referencing/
            textFormat/
            miscellaneous/
            template/
        experimental/
            scriptRunner/
            suggest/
            time/
    dataStructures/
    modals/
    suggests/
    utils/
    main.ts
test/
```


**Important:**
- Each directory inside `src/components/**/...` is a **self‑contained sub‑plugin** with its own `core.ts`. 
- `src/main.ts` merely wires them together and exposes a single Obsidian plugin class.


## Running this Project

Clean install project dependencies (from `package-lock.json`):
```shell
npm ci
```

Build the project:
```shell
npm run build
```

Run tests:
```shell
npm run test
```

## Interested in developing Obsidian plugins?

- Check out [community plugins you can contribute to](https://obsidian.md/plugins).
- Check out the ["Build a plugin" guide](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin) at Obsidian Docs.
- Check out the [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin).
- Get acquainted with the [Obsidian API](https://github.com/obsidianmd/obsidian-api).
