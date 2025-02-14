import * as vscode from 'vscode';

function formatText(text: string, maxWidth: number): string {
    const urlPattern = /(https?:\/\/[^\s\n<>()[\]{}]+)/g;
    
    const sections = text.split(/\n\s*---\s*\n/);
    
    const formattedSections = sections.map((section) => {
        const urls: string[] = [];
        let urlCounter = 0;
        
        // Store URLs with unique markers
        const withoutUrls = section.replace(urlPattern, (match) => {
            const marker = `__URL${urlCounter}__`;
            urls[urlCounter] = match;
            urlCounter++;
            return marker;
        });

        console.log('URLs stored:', urls);
        
        const blocks = withoutUrls.split(/\n\s*--\s*\n/);
        
        return blocks.map((block) => {
            // Handle lists with URL preservation
            if (block.trim().startsWith('-')) {
                let formattedBlock = block.split('\n')
                    .map(line => {
                        // Restore URLs in list items immediately
                        return line.trim().replace(/__URL(\d+)__/g, (_, index) => {
                            return urls[parseInt(index)] || '__URL_NOT_FOUND__';
                        });
                    })
                    .join('\n');
                return formattedBlock;
            }
            
            const paragraphs = block.split(/\n{2,}/);
            const formattedParagraphs = paragraphs.map(para => {
                if (!para.trim()) return '';
                
                // Preserve short lines with URLs
                if (!para.includes('\n') && para.trim().length < maxWidth) {
                    return para.trim().replace(/__URL(\d+)__/g, (_, index) => {
                        return urls[parseInt(index)] || '__URL_NOT_FOUND__';
                    });
                }
                
                const words = para.replace(/\n/g, ' ').trim().split(/\s+/);
                let lines: string[] = [];
                let currentLine: string[] = [];
                let currentLength = 0;
                
                words.forEach(word => {
                    const urlMatch = word.match(/__URL(\d+)__/);
                    const actualWord = urlMatch ? urls[parseInt(urlMatch[1])] : word;
                    
                    if (currentLength + actualWord.length + 1 > maxWidth) {
                        lines.push(currentLine.join(' '));
                        currentLine = [actualWord];
                        currentLength = actualWord.length;
                    } else {
                        currentLine.push(actualWord);
                        currentLength += actualWord.length + 1;
                    }
                });
                
                if (currentLine.length) {
                    lines.push(currentLine.join(' '));
                }
                
                return lines.join('\n');
            });

            return formattedParagraphs.join('\n\n');
        }).join('\n\n--\n\n');
    });

    return formattedSections.join('\n\n---\n\n');
}

export function activate(context: vscode.ExtensionContext) {
    let formatTXTDisposable = vscode.commands.registerCommand('extension.formatTXT', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const fileName = document.fileName;
            if (!fileName.endsWith(".txt")) {
                const proceed = await vscode.window.showWarningMessage(
                    'The file is not a .txt file. Do you want to proceed?',
                    'Yes', 'No'
                );
                if (proceed !== 'Yes') {
                    return;
                }
            }

            const width = await vscode.window.showInputBox({
                prompt: 'Enter the line width',
                value: '90'
            });

            if (width === undefined) { return; }

            const text = document.getText();
            const formattedText = formatText(text, parseInt(width));
            
            editor.edit((editBuilder: vscode.TextEditorEdit) => {
                const entireRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length)
                );
                editBuilder.replace(entireRange, formattedText);
            });
        }
    });

    // Add command for default width (90)
    let formatSelectedTXTDisposable = vscode.commands.registerCommand('extension.formatSelectedTXT', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.selection) {
            const text = editor.document.getText(editor.selection);
            const formattedText = formatText(text, 90);
            
            editor.edit(editBuilder => {
                editBuilder.replace(editor.selection, formattedText);
            });
        }
    });

    // Add command for custom width
    let formatSelectedTXTWidthDisposable = vscode.commands.registerCommand('extension.formatSelectedTXTWidth', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.selection) {
            const width = await vscode.window.showInputBox({
                prompt: 'Enter the line width',
                value: '90'
            });

            if (width === undefined) { return; }

            const text = editor.document.getText(editor.selection);
            const formattedText = formatText(text, parseInt(width));
            
            editor.edit(editBuilder => {
                editBuilder.replace(editor.selection, formattedText);
            });
        }
    });

    // Register all commands
    context.subscriptions.push(formatTXTDisposable);
    context.subscriptions.push(formatSelectedTXTDisposable);
    context.subscriptions.push(formatSelectedTXTWidthDisposable);
}

export function deactivate() { }