import * as vscode from 'vscode';

function formatText(text: string, maxWidth: number): string {
    // Detect and store original spacing patterns
    const originalSpacing = {
        sections: text.match(/\n{3,}/g) || [],
        blocks: text.match(/\n{2,}(?!-)/g) || []
    };

    // Split into sections (separated by ---)
    const sections = text.split(/\n\s*---\s*\n/);
    
    const formattedSections = sections.map((section, sectionIndex) => {
        // Detect and preserve URLs
        const urlPattern = /(https?:\/\/[^\s]+)/g;
        const urls = section.match(urlPattern) || [];
        const withoutUrls = section.replace(urlPattern, '|URL|');
        
        // Split into blocks (separated by --)
        const blocks = withoutUrls.split(/\n\s*--\s*\n/);
        
        return blocks.map((block, blockIndex) => {
            // Handle lists
            if (block.trim().startsWith('-')) {
                return block.split('\n')
                    .map(line => line.trim())
                    .join('\n');
            }
            
            // Handle paragraphs with original spacing
            const paragraphs = block.split(/\n{2,}/);
            const formattedParagraphs = paragraphs.map(para => {
                if (!para.trim()) return '';
                if (!para.includes('\n') && para.trim().length < maxWidth) {
                    return para.trim();
                }
                
                const words = para.replace(/\n/g, ' ').trim().split(/\s+/);
                let lines: string[] = [];
                let currentLine: string[] = [];
                let currentLength = 0;
                
                words.forEach(word => {
                    const isUrl = word === '|URL|';
                    const actualWord = isUrl ? urls.shift() || word : word;
                    
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

            // Preserve original paragraph spacing
            return formattedParagraphs.join('\n\n');
        }).join('\n\n--\n\n');
    });

    // Preserve original section spacing
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

    context.subscriptions.push(formatTXTDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
