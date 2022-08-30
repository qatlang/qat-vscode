import { execSync } from 'child_process'
import stripAnsi from 'strip-ansi'
import * as vs from 'vscode'

export function execute(command: string): string {
    return stripAnsi(execSync(command).toString())
}

export interface FileRange {
    file: string,
    line: number,
    char: number
}

export function handleFileDiagnostics(message: string, severity: vs.DiagnosticSeverity, diagnosticCollection: vs.DiagnosticCollection) {
    let fileInfo = ''
    if (message.length > 0) {
        if (message.includes('|')) {
            const splits = message.split('|')
            message = ''
            for (let i = 0; i < splits.length - 1; i++) {
                message = splits[i]
            }
            fileInfo = splits[splits.length - 1]
        }
    }
    if (fileInfo.length > 0 && fileInfo.includes(' >> ')) {
        let startInfo = fileInfo.split(' >> ')[0].trim()
        let endInfo = fileInfo.split(' >> ')[1].trim()
        let start: FileRange = {
            file: startInfo.split(':')[0],
            line: parseInt(startInfo.split(':')[1]) - 1,
            char: parseInt(startInfo.split(':')[2]) - 1
        }
        let end: FileRange = {
            file: endInfo.split(':')[0],
            line: parseInt(endInfo.split(':')[1]) - 1,
            char: parseInt(endInfo.split(':')[2]) - 1
        }
        if (start.line < 0) {
            start.line = 0
        }
        if (start.char < 0) {
            start.char = 0
        }
        if (end.line < 0) {
            end.line = 0
        }
        if (end.char < 0) {
            end.char = 0
        }
        let canonicalFile = vs.Uri.file(start.file).toString()
        let diagnosticMap: Map<string, vs.Diagnostic[]> = new Map()
        if (diagnosticCollection.has(vs.Uri.parse(canonicalFile))) {
            let old = diagnosticCollection.get(vs.Uri.parse(canonicalFile))
            let oldDiagList: vs.Diagnostic[] = []
            for (let i = 0; i < (old ?? []).length; i++) {
                oldDiagList.push((old ?? [])[i])
            }
            diagnosticMap.set(canonicalFile, oldDiagList)
        }
        let range = new vs.Range(new vs.Position(start.line, start.char), new vs.Position(end.line, end.char))
        let diagnostics = diagnosticMap.get(canonicalFile)
        if (!diagnostics) {
            diagnostics = []
        }
        diagnostics.push(new vs.Diagnostic(range, message, severity))
        diagnosticMap.set(canonicalFile, diagnostics)
        diagnosticMap.forEach((diags, file) => {
            diagnosticCollection.set(vs.Uri.parse(file), diags)
        })
    }
}