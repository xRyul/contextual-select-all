import { Editor, MarkdownView, Plugin, EditorPosition } from 'obsidian';

export default class ContextualSelectAllPlugin extends Plugin {
    private selectionState: SelectionState;

    async onload() {
        this.selectionState = new SelectionState();

        // Wait until the layout is fully ready before adding event listeners
        this.app.workspace.onLayoutReady(() => {
            // Use capture phase to intercept CMD+A before Obsidian
            document.addEventListener('keydown', this.handleGlobalKeydown, true);
            this.registerDomEvent(document, 'click', this.handleMouseClick);

            // console.log('Contextual Select All plugin loaded');
        });
    }

    private handleGlobalKeydown = (event: KeyboardEvent) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (activeView) {
                // console.log('CMD+A detected in Markdown view');
                this.handleContextualSelectAll(event, activeView);
                event.preventDefault();
                event.stopPropagation();
            } else {
                // console.log('CMD+A detected, but not in a Markdown view');
            }
        }
    }


    async onunload() {
        // console.log('Unloading Contextual Select All plugin');
        this.selectionState.reset();
        // Wait until the layout is fully ready before adding event listeners
        this.app.workspace.onLayoutReady(() => {
        // Remove the global event listeners
            document.removeEventListener('keydown', this.handleGlobalKeydown, true);
            document.removeEventListener('click', this.handleMouseClick);
        });
    }

    private handleMouseClick = () => {
        this.selectionState.reset();
    };

    private handleContextualSelectAll = (event: KeyboardEvent, view: MarkdownView) => {
        const editor = view.editor;
    
        if (!this.selectionState.originalCursor) {
            this.selectionState.originalCursor = editor.getCursor();
        }
        const lineInfo = getLineInfo(editor);
    
        // If it's an empty line, select all content
        if (isEmptyOrWhitespace(lineInfo.line)) {
            selectAllContent(editor);
            return;
        }
    
        const selectors = [
            new HeadingSelector(),
            new ChecklistSelector(),
            new ListSelector(),
            new BlockquoteSelector(),
            new CodeBlockSelector(),
            new TableSelector(),
            new ParagraphSelector(),
        ];
    
        for (const selector of selectors) {
            if (selector.matches(editor, lineInfo)) {
                selector.select(editor, lineInfo, this.selectionState);
                return;
            }
        }
    
        // If no selector matched, select all content
        selectAllContent(editor);
    };
}

class SelectionState {
    clickCount = 0;
    originalCursor: EditorPosition | null = null;

    reset(): void {
        this.clickCount = 0;
        this.originalCursor = null;
    }
}

interface LineInfo {
    line: string;
    lineNumber: number;
}

interface Selector {
    matches(editor: Editor, lineInfo: LineInfo): boolean;
    select(editor: Editor, lineInfo: LineInfo, state: SelectionState): void;
}

class HeadingSelector implements Selector {
    matches(editor: Editor, lineInfo: LineInfo): boolean {
        return isHeading(lineInfo.line);
    }

    select(editor: Editor, lineInfo: LineInfo, state: SelectionState): void {
        const { line, lineNumber } = lineInfo;
        let contentStart: number;
        let endLine: number;

        switch (state.clickCount % 5) {
            case 0: // Select content after '#'
                contentStart = line.indexOf(' ') + 1;
                editor.setSelection(
                    { line: lineNumber, ch: contentStart },
                    { line: lineNumber, ch: line.length }
                );
                break;
            case 1: // Select whole line
                editor.setSelection(
                    { line: lineNumber, ch: 0 },
                    { line: lineNumber, ch: line.length }
                );
                break;
            case 2: // Select entire heading and content until next heading or end of document
                endLine = lineNumber;
                while (endLine < editor.lineCount() - 1 && !isHeading(editor.getLine(endLine + 1))) {
                    endLine++;
                }
                editor.setSelection(
                    { line: lineNumber, ch: 0 },
                    { line: endLine, ch: editor.getLine(endLine).length }
                );
                break;
            case 3: // Select entire document
                selectAllContent(editor);
                break;
            case 4: // Reset to original cursor position
                if (state.originalCursor) {
                    editor.setCursor(state.originalCursor);
                }
                break;
        }
        state.clickCount++;
    }
}

class ListSelector implements Selector {
    matches(editor: Editor, lineInfo: LineInfo): boolean {
        return isListItem(lineInfo.line) && !isChecklistItem(lineInfo.line);
    }

    select(editor: Editor, lineInfo: LineInfo, state: SelectionState): void {
        const { lineNumber } = lineInfo;

        switch (state.clickCount % 5) {
            case 0: // Select current list item
                this.selectSingleListItem(editor, lineNumber);
                break;
            case 1: // Select current list item and its immediate subitems
                this.selectListItemWithSubitems(editor, lineNumber);
                break;
            case 2: // Select entire list (including all nested items)
                this.selectEntireList(editor, lineNumber);
                break;
            case 3: // Select entire document
                selectAllContent(editor);
                break;
            case 4: // Reset to original cursor position
                if (state.originalCursor) {
                    editor.setCursor(state.originalCursor);
                }
                break;
        }
        state.clickCount++;
    }

    private selectSingleListItem(editor: Editor, lineNumber: number): void {
        const line = editor.getLine(lineNumber);
        const listMarkerMatch = line.match(/^(\s*(?:[-*+]|\d+\.)\s+)/);
        const contentStart = listMarkerMatch ? listMarkerMatch[0].length : 0;
        editor.setSelection(
            { line: lineNumber, ch: contentStart },
            { line: lineNumber, ch: line.length }
        );
    }

    private selectListItemWithSubitems(editor: Editor, lineNumber: number): void {
        let endLine = lineNumber;
        const currentIndent = getIndentLevel(editor.getLine(lineNumber));

        while (endLine < editor.lineCount() - 1) {
            const nextLine = editor.getLine(endLine + 1);
            if (isListItem(nextLine) && getIndentLevel(nextLine) > currentIndent) {
                endLine++;
            } else {
                break;
            }
        }

        editor.setSelection(
            { line: lineNumber, ch: 0 },
            { line: endLine, ch: editor.getLine(endLine).length }
        );
    }

    private selectEntireList(editor: Editor, lineNumber: number): void {
        let startLine = lineNumber;
        let endLine = lineNumber;

        while (startLine > 0 && isListItem(editor.getLine(startLine - 1))) {
            startLine--;
        }

        while (endLine < editor.lineCount() - 1 && isListItem(editor.getLine(endLine + 1))) {
            endLine++;
        }

        editor.setSelection(
            { line: startLine, ch: 0 },
            { line: endLine, ch: editor.getLine(endLine).length }
        );
    }
}

class BlockquoteSelector implements Selector {
    matches(editor: Editor, lineInfo: LineInfo): boolean {
        return isBlockquote(lineInfo.line);
    }

    select(editor: Editor, lineInfo: LineInfo, state: SelectionState): void {
        const { lineNumber } = lineInfo;

        switch (state.clickCount % 5) {
            case 0: // Select current blockquote line content
                this.selectSingleBlockquoteLine(editor, lineNumber);
                break;
            case 1: // Select entire current blockquote line
                this.selectEntireBlockquoteLine(editor, lineNumber);
                break;
            case 2: // Select entire blockquote
                this.selectEntireBlockquote(editor, lineNumber);
                break;
            case 3: // Select entire document
                selectAllContent(editor);
                break;
            case 4: // Reset to original cursor position
                if (state.originalCursor) {
                    editor.setCursor(state.originalCursor);
                }
                break;
        }
        state.clickCount++;
    }

    private selectSingleBlockquoteLine(editor: Editor, lineNumber: number): void {
        const line = editor.getLine(lineNumber);
        const contentStart = line.indexOf('>') + 1;
        editor.setSelection(
            { line: lineNumber, ch: contentStart },
            { line: lineNumber, ch: line.length }
        );
    }

    private selectEntireBlockquoteLine(editor: Editor, lineNumber: number): void {
        const line = editor.getLine(lineNumber);
        editor.setSelection(
            { line: lineNumber, ch: 0 },
            { line: lineNumber, ch: line.length }
        );
    }

    private selectEntireBlockquote(editor: Editor, lineNumber: number): void {
        let startLine = lineNumber;
        let endLine = lineNumber;

        while (startLine > 0 && isBlockquote(editor.getLine(startLine - 1))) {
            startLine--;
        }

        while (endLine < editor.lineCount() - 1 && isBlockquote(editor.getLine(endLine + 1))) {
            endLine++;
        }

        editor.setSelection(
            { line: startLine, ch: 0 },
            { line: endLine, ch: editor.getLine(endLine).length }
        );
    }
}

class CodeBlockSelector implements Selector {
    matches(editor: Editor, lineInfo: LineInfo): boolean {
        return this.isInCodeBlock(editor, lineInfo.lineNumber);
    }

    select(editor: Editor, lineInfo: LineInfo, state: SelectionState): void {
        const { lineNumber } = lineInfo;

        switch (state.clickCount % 5) {
            case 0: // Select current line
                this.selectSingleLine(editor, lineNumber);
                break;
            case 1: // Select code block without fences
                this.selectCodeBlockContent(editor, lineNumber);
                break;
            case 2: // Select entire code block including fences
                this.selectEntireCodeBlock(editor, lineNumber);
                break;
            case 3: // Select entire document
                selectAllContent(editor);
                break;
            case 4: // Reset to original cursor position
                if (state.originalCursor) {
                    editor.setCursor(state.originalCursor);
                }
                break;
        }
        state.clickCount++;
    }

    private selectSingleLine(editor: Editor, lineNumber: number): void {
        const line = editor.getLine(lineNumber);
        editor.setSelection(
            { line: lineNumber, ch: 0 },
            { line: lineNumber, ch: line.length }
        );
    }

    private selectCodeBlockContent(editor: Editor, lineNumber: number): void {
        const { start, end } = this.findCodeBlockBoundaries(editor, lineNumber);
        editor.setSelection(
            { line: start + 1, ch: 0 },
            { line: end - 1, ch: editor.getLine(end - 1).length }
        );
    }

    private selectEntireCodeBlock(editor: Editor, lineNumber: number): void {
        const { start, end } = this.findCodeBlockBoundaries(editor, lineNumber);
        editor.setSelection(
            { line: start, ch: 0 },
            { line: end, ch: editor.getLine(end).length }
        );
    }

    private isInCodeBlock(editor: Editor, lineNumber: number): boolean {
        let startLine = lineNumber;
        let endLine = lineNumber;

        while (startLine > 0 && !editor.getLine(startLine).startsWith('```')) {
            startLine--;
        }

        while (endLine < editor.lineCount() - 1 && !editor.getLine(endLine).startsWith('```')) {
            endLine++;
        }

        return startLine !== endLine &&
            editor.getLine(startLine).startsWith('```') &&
            editor.getLine(endLine).startsWith('```');
    }

    private findCodeBlockBoundaries(editor: Editor, lineNumber: number): { start: number, end: number } {
        let start = lineNumber;
        let end = lineNumber;

        while (start > 0 && !editor.getLine(start).startsWith('```')) {
            start--;
        }

        while (end < editor.lineCount() - 1 && !editor.getLine(end).startsWith('```')) {
            end++;
        }

        return { start, end };
    }
}

class ParagraphSelector implements Selector {
    matches(editor: Editor, lineInfo: LineInfo): boolean {
        return true; // We'll treat all lines as potential paragraph lines
    }

    select(editor: Editor, lineInfo: LineInfo, state: SelectionState): void {
        switch (state.clickCount % 2) {
            case 0: // Select current line
                this.selectSingleLine(editor, lineInfo);
                break;
            case 1: // Select entire document
                selectAllContent(editor);
                break;
        }
        state.clickCount++;
    }

    private selectSingleLine(editor: Editor, lineInfo: LineInfo): void {
        const line = editor.getLine(lineInfo.lineNumber);
        editor.setSelection(
            { line: lineInfo.lineNumber, ch: 0 },
            { line: lineInfo.lineNumber, ch: line.length }
        );
    }
}

class ChecklistSelector implements Selector {
    matches(editor: Editor, lineInfo: LineInfo): boolean {
        return isChecklistItem(lineInfo.line);
    }

    select(editor: Editor, lineInfo: LineInfo, state: SelectionState): void {
        const { lineNumber } = lineInfo;

        switch (state.clickCount % 5) {
            case 0: // Select everything after - [ ]
                this.selectChecklistContent(editor, lineNumber);
                break;
            case 1: // Select all line
                this.selectEntireLine(editor, lineNumber);
                break;
            case 2: // Select all consecutive checkboxes
                this.selectConsecutiveCheckboxes(editor, lineNumber);
                break;
            case 3: // Select whole document
                selectAllContent(editor);
                break;
            case 4: // Reset to original cursor position
                if (state.originalCursor) {
                    editor.setCursor(state.originalCursor);
                }
                break;
        }
        state.clickCount++;
    }
    private selectChecklistContent(editor: Editor, lineNumber: number): void {
        const line = editor.getLine(lineNumber);
        const contentStart = line.indexOf(']') + 2; // Move cursor after '] '
        editor.setSelection(
            { line: lineNumber, ch: contentStart },
            { line: lineNumber, ch: line.length }
        );
    }

    private selectEntireLine(editor: Editor, lineNumber: number): void {
        const line = editor.getLine(lineNumber);
        editor.setSelection(
            { line: lineNumber, ch: 0 },
            { line: lineNumber, ch: line.length }
        );
    }

    private selectConsecutiveCheckboxes(editor: Editor, lineNumber: number): void {
        let startLine = lineNumber;
        let endLine = lineNumber;

        while (startLine > 0 && isChecklistItem(editor.getLine(startLine - 1))) {
            startLine--;
        }

        while (endLine < editor.lineCount() - 1 && isChecklistItem(editor.getLine(endLine + 1))) {
            endLine++;
        }

        editor.setSelection(
            { line: startLine, ch: 0 },
            { line: endLine, ch: editor.getLine(endLine).length }
        );
    }
}

class TableSelector implements Selector {
    matches(editor: Editor, lineInfo: LineInfo): boolean {
        return this.isInTable(editor, lineInfo.lineNumber);
    }

    select(editor: Editor, lineInfo: LineInfo, state: SelectionState): void {
        const isLivePreview = this.isLivePreviewTable(editor, lineInfo.lineNumber);
        const cursorCh = editor.getCursor().ch;
    
        switch (state.clickCount % 4) {
            case 0: // Select content inside the cell
                if (isLivePreview) {
                    this.selectLivePreviewCellContent(editor);
                } else {
                    this.selectSourceModeCellContent(editor, lineInfo.lineNumber, cursorCh);
                }
                break;
            case 1: // Select entire cell
                if (isLivePreview) {
                    this.selectLivePreviewEntireCell(editor);
                } else {
                    this.selectSourceModeEntireCell(editor, lineInfo.lineNumber, cursorCh);
                }
                break;
            case 2: // Select whole table
                this.selectWholeTable(editor, lineInfo.lineNumber);
                break;
            case 3: // Reset to original cursor position
                if (state.originalCursor) {
                    editor.setCursor(state.originalCursor);
                }
                break;
        }
        state.clickCount++;
    }

    private isInTable(editor: Editor, lineNumber: number): boolean {
        const line = editor.getLine(lineNumber);
        return this.isMDTable(line) || this.isLivePreviewTable(editor, lineNumber);
    }

    private isMDTable(line: string): boolean {
        return line.trim().startsWith('|') && line.trim().endsWith('|');
    }

    private isLivePreviewTable(editor: Editor, lineNumber: number): boolean {
        const cursor = editor.getCursor();
        const node = this.getElementAtCursor(editor, cursor);
        return this.isInsideTableElement(node);
    }

    private selectCellContent(editor: Editor, lineNumber: number, cursorCh: number): void {
        if (this.isMDTable(editor.getLine(lineNumber))) {
            this.selectSourceModeCellContent(editor, lineNumber, cursorCh);
        } else {
            this.selectLivePreviewCellContent(editor);
        }
    }

    private selectEntireCell(editor: Editor, lineNumber: number, cursorCh: number): void {
        if (this.isMDTable(editor.getLine(lineNumber))) {
            this.selectSourceModeEntireCell(editor, lineNumber, cursorCh);
        } else {
            this.selectLivePreviewEntireCell(editor);
        }
    }

    private selectWholeTable(editor: Editor, lineNumber: number): void {
        if (this.isMDTable(editor.getLine(lineNumber))) {
            this.selectSourceModeWholeTable(editor, lineNumber);
        } else {
            this.selectLivePreviewWholeTable(editor);
        }
    }

    private selectSourceModeCellContent(editor: Editor, lineNumber: number, cursorCh: number): void {
        const line = editor.getLine(lineNumber);
        const cellBoundaries = this.findCellBoundaries(line, cursorCh);
        
        if (cellBoundaries) {
            const { start, end } = cellBoundaries;
            const cellContent = line.substring(start, end).trim();
            const contentStart = start + line.substring(start, end).indexOf(cellContent);
            editor.setSelection(
                { line: lineNumber, ch: contentStart },
                { line: lineNumber, ch: contentStart + cellContent.length }
            );
        }
    }

    private selectSourceModeEntireCell(editor: Editor, lineNumber: number, cursorCh: number): void {
        const line = editor.getLine(lineNumber);
        const cellBoundaries = this.findCellBoundaries(line, cursorCh);
        
        if (cellBoundaries) {
            const { start, end } = cellBoundaries;
            editor.setSelection(
                { line: lineNumber, ch: start },
                { line: lineNumber, ch: end }
            );
        }
    }

    private findCellBoundaries(line: string, cursorCh: number): { start: number, end: number } | null {
        const cells = line.split('|');
        let currentPos = 0;

        for (let i = 0; i < cells.length; i++) {
            const cellStart = currentPos;
            const cellEnd = cellStart + cells[i].length;

            if (cursorCh >= cellStart && cursorCh < cellEnd) {
                return { start: cellStart, end: cellEnd };
            }

            currentPos = cellEnd + 1;  // +1 for the '|' character
        }

        return null;
    }

    private selectSourceModeWholeTable(editor: Editor, lineNumber: number): void {
        let startLine = lineNumber;
        let endLine = lineNumber;

        while (startLine > 0 && this.isMDTable(editor.getLine(startLine - 1))) {
            startLine--;
        }

        while (endLine < editor.lineCount() - 1 && this.isMDTable(editor.getLine(endLine + 1))) {
            endLine++;
        }

        editor.setSelection(
            { line: startLine, ch: 0 },
            { line: endLine, ch: editor.getLine(endLine).length }
        );
    }

    private selectLivePreviewCellContent(editor: Editor): void {
        const cursor = editor.getCursor();
        const element = this.getElementAtCursor(editor, cursor);
        const cell = this.findClosestTableCell(element);
        if (cell) {
            const range = this.createRangeForCellContent(cell);
            if (range) {
                const selection = window.getSelection();
                if (selection) {
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
        }
    }

    private selectLivePreviewEntireCell(editor: Editor): void {
        const cursor = editor.getCursor();
        const element = this.getElementAtCursor(editor, cursor);
        const cell = this.findClosestTableCell(element);
        if (cell) {
            const range = document.createRange();
            range.selectNodeContents(cell);
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }

    private selectLivePreviewWholeTable(editor: Editor): void {
        const cursor = editor.getCursor();
        const node = this.getElementAtCursor(editor, cursor);
        const table = this.findClosestTable(node);
        if (table) {
            const range = document.createRange();
            range.selectNode(table);
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }

    private getElementAtCursor(editor: Editor, cursor: EditorPosition): Node | null {
        const cmEditor = (editor as any).cm;
        if (cmEditor) {
            const pos = cmEditor.posAtCoords({ left: cursor.ch, top: cursor.line });
            return cmEditor.domAtPos(pos);
        }
        return null;
    }

    private isInsideTableElement(node: Node | null): boolean {
        let current: Node | null = node;
        while (current && !(current instanceof HTMLElement)) {
            current = current.parentNode;
        }
        while (current instanceof HTMLElement && current !== document.body) {
            if (current.tagName === 'TABLE' || current.classList.contains('cm-table-widget')) {
                return true;
            }
            current = current.parentElement;
        }
        return false;
    }
    private createRangeForCellContent(cell: HTMLElement): Range | null {
        const range = document.createRange();
        let startNode: Node | null = cell.firstChild;
        let endNode: Node | null = cell.lastChild;

        // Find the first and last text nodes
        while (startNode && startNode.nodeType !== Node.TEXT_NODE) {
            startNode = startNode.firstChild;
        }
        while (endNode && endNode.nodeType !== Node.TEXT_NODE) {
            endNode = endNode.lastChild;
        }

        if (startNode && endNode) {
            range.setStart(startNode, 0);
            range.setEnd(endNode, endNode.textContent?.length || 0);
            return range;
        }

        return null;
    }
    private findClosestTableCell(node: Node | null): HTMLElement | null {
        let current: Node | null = node;
        while (current && current !== document.body) {
            if (current instanceof HTMLElement && 
                (current.tagName === 'TD' || current.classList.contains('cm-table-widget__cell'))) {
                return current;
            }
            current = current.parentNode;
        }
        return null;
    }

    private findClosestTable(node: Node | null): HTMLElement | null {
        let current: Node | null = node;
        while (current && !(current instanceof HTMLElement)) {
            current = current.parentNode;
        }
        while (current instanceof HTMLElement && current !== document.body) {
            if (current.tagName === 'TABLE' || current.classList.contains('cm-table-widget')) {
                return current;
            }
            current = current.parentElement;
        }
        return null;
    }
}

function getIndentLevel(line: string): number {
    return line.search(/\S/);
}

function isChecklistItem(line: string): boolean {
    return /^\s*- \[ \]/.test(line);
}

// Utility functions
function getLineInfo(editor: Editor): LineInfo {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    return { line, lineNumber: cursor.line };
}

function selectAllContent(editor: Editor): void {
    editor.setSelection(
        { line: 0, ch: 0 },
        { line: editor.lineCount() - 1, ch: editor.getLine(editor.lineCount() - 1).length }
    );
}

function isHeading(line: string): boolean {
    return /^#+\s/.test(line);
}

function isListItem(line: string): boolean {
    return (/^\s*[-*+](?!\s*\[ \])|\d+\.\s/).test(line);
}


function isBlockquote(line: string): boolean {
    return /^\s*>/.test(line);
}

function isEmptyOrWhitespace(line: string): boolean {
    return line.trim() === '';
}
