# Contextual Select All for Obsidian

Replaces Obsidians defualt CMD+A "Select All" with context aware selections.

## Features

- Context-aware selection based on where your cursor is positioned.
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


## Each press = more content selected. For example:

### Code Blocks:

https://github.com/user-attachments/assets/64d9805e-d59a-4805-bde1-caa75bdf3448

1. Select current line within code block
2. Select code block content (excluding ``` lines)
3. Select entire code block (including ``` lines)


### Lists (Unordered and Ordered):

https://github.com/user-attachments/assets/86c85fa1-db61-4aef-8c61-3a57ccd4a137

https://github.com/user-attachments/assets/e7da567c-403e-410d-99d4-6189225df6c1

1. Select list item content (excluding bullet or number)
2. Select entire list item (including bullet or number)
3. Select item with all its subitems


### Blockquotes / Callouts:

https://github.com/user-attachments/assets/380bcde7-b0f0-4b80-a888-50613fe1e896

1. Select blockquote content on current line (excluding >)
2. Select entire blockquote line (including >)
3. Select entire blockquote (multiple lines if applicable)


### Checklists:

https://github.com/user-attachments/assets/020e2a7c-a741-4aab-a871-8d4888b6c508

1. Select checklist item content (excluding [ ] or [x])
2. Select entire checklist item (including [ ] or [x])
3. Select all consecutive checklist items


### Headings:

https://github.com/user-attachments/assets/b49c893f-03af-4693-9e65-6e7f65a0a0f6

1. Select heading text (excluding #)
2. Select entire heading line (including #)
3. Select heading and its content (until next heading or end of document)
4. Select entire document


#### Paragraphs:
1. Select current line / paragraph
2. Select entire document


### Tables:

1. Select cell content


### Empty Lines:
1. Select entire document


## How to Use

Install the plugin, and use CMD+A as usual. It automatically replaces official CMD+A shortcut with enhanced one. Press multiple times to cycle and select different elements. 


## Limitations
- Codeblocks. Selecting empty line inside the code blocks will select all-content instead.
