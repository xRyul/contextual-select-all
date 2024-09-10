# Contextual Select All for Obsidian



https://github.com/user-attachments/assets/773af1da-26c4-46d8-9982-041502eabee5


Replaces Obsidians defualt CMD+A "Select All" with context aware selections.

## Features

- Context-aware selection: Intelligently selects content based on where your cursor is positioned.
- Support for various Markdown elements:
  - Headings
  - Lists (including nested lists)
  - Checklists
  - Tables
  - Code blocks (press 2x to select whole code excluding ``` press 3x to select whole code including ```)
  - Blockquotes
  - Paragraphs
- Works in both Source mode and Live Preview mode.
- Incremental selection: Click multiple times to expand the selection.

## How to Use

Install the plugin, and use CMD+A as usual. It automatically replaces official CMD+A shortcut with enhanced one. Press multiple times to cycle and select different elements. 

## Each press = more content selected. For example:

Headings:

1. Select heading text (excluding #)
2. Select entire heading line (including #)
3. Select heading and its content (until next heading or end of document)
4. Select entire document

Lists (Unordered and Ordered):

1. Select list item content (excluding bullet or number)
2. Select entire list item (including bullet or number)
3. Select item with all its subitems
4. Select entire list (including all nested items)

Checklists:

1. Select checklist item content (excluding [ ] or [x])
2. Select entire checklist item (including [ ] or [x])
3. Select all consecutive checklist items
4. Select entire document

Tables:

1. Select cell content

Code Blocks:

1. Select current line within code block
2. Select code block content (excluding ``` lines)
3. Select entire code block (including ``` lines)
4. Select entire document

Blockquotes:

1. Select blockquote content on current line (excluding >)
2. Select entire blockquote line (including >)
3. Select entire blockquote (multiple lines if applicable)
4. Select entire document

Paragraphs:
1. Select current line
2. Select entire paragraph
3. Select entire document

Empty Lines:
1. Select entire document


## Limitations
- Codeblocks. Selecting empty line inside the code blocks will select all-content instead.
