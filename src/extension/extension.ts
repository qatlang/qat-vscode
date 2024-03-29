import fs from 'fs'
import path from 'path'
import * as vs from "vscode"
import { QatConfig } from "./config"
import { execute, handleFileDiagnostics } from "./utils"

let qatConfig: QatConfig | undefined
let diagnosticCollection: vs.DiagnosticCollection;
let errorLeading = /[ ]+(error)[ ]+▌[ ]/
let warningLeading = /[ ]+(warning)[ ]+▌[ ]/
let outputDirName = "build"

export async function activate(ctx: vs.ExtensionContext, isRestart: boolean = false) {
    qatConfig = QatConfig.init();
    if (qatConfig) {
        let cfg = qatConfig;
        diagnosticCollection = vs.languages.createDiagnosticCollection('qat')
        const versionStatus = vs.window.createStatusBarItem('Qat Version', vs.StatusBarAlignment.Right, 0);
        versionStatus.name = "Qat Version"
        versionStatus.text = 'qat ' + cfg.version
        versionStatus.tooltip = 'Qat Version: ' + cfg.version
        ctx.subscriptions.push(versionStatus);
        ctx.subscriptions.push(vs.window.onDidChangeActiveTextEditor((e) => {
            if (e && e.document)
                versionStatus.show()
            else
                versionStatus.hide()
        }));
        if (vs.window.activeTextEditor && vs.window.activeTextEditor.document) {
            versionStatus.show()
        }
        ctx.subscriptions.push(vs.workspace.onDidSaveTextDocument((doc) => {
            cfg.message("Compiling file: " + doc.uri.toString())
            try {
                const startTime = (new Date()).getTime()
                const workDir = path.dirname(doc.uri.fsPath.toString())
                cfg.message('Working directory obtained: ' + workDir)
                if (fs.existsSync(workDir)) {
                    const files = fs.readdirSync(workDir);
                    let fileCount = 0;
                    let filePaths: Array<string> = []
                    const libPath = path.join(workDir, "lib.qat")
                    const libQatExists = fs.existsSync(libPath) && fs.lstatSync(libPath).isFile();
                    let stdOut = ''
                    const outputDir = path.join(workDir, outputDirName);
                    if (libQatExists) {
                        fs.mkdirSync(outputDir, { recursive: true });
                        stdOut = execute("qat build " + libPath + " -o " + outputDir)
                    } else {
                        for (let i = 0; i < files.length; i++) {
                            const fileName = path.join(workDir, files[i]);
                            const stat = fs.lstatSync(fileName);
                            if (stat.isFile()) {
                                fileCount++;
                                filePaths.push(fileName);
                            }
                        }
                        if (fileCount == 1) {
                            fs.mkdirSync(outputDir, { recursive: true });
                            stdOut = execute("qat build " + filePaths[0] + " -o " + outputDir);
                        } else {
                            // TODO - Implement multiple files compilation
                        }
                    }
                    if (stdOut.includes('\n')) {
                        diagnosticCollection.clear()
                        const splits = stdOut.split('\n')
                        let errorCount = 0
                        let warningCount = 0
                        for (let i = splits.length - 1; i >= 0; i--) {
                            const line = splits[i]
                            if (line.search(errorLeading) != -1) {
                                const errorSplit = line.split(errorLeading)
                                errorCount++
                                handleFileDiagnostics(errorSplit[errorSplit.length - 1], vs.DiagnosticSeverity.Error, diagnosticCollection)
                            } else if (line.search(warningLeading) != -1) {
                                const warningSplit = line.split(warningLeading)
                                warningCount++
                                handleFileDiagnostics(warningSplit[warningSplit.length - 1], vs.DiagnosticSeverity.Warning, diagnosticCollection)
                            }
                        }
                        if (errorCount === 0) {
                            if (warningCount === 0) {
                                cfg.message("Compilation successful")
                            } else {
                                cfg.message("Compilation successful with " + warningCount + " warnings")
                            }
                        }
                    } else {
                        diagnosticCollection.clear()
                        cfg.message("Compilation successful")
                    }
                    const timeDifference = (new Date()).getTime() - startTime;
                    cfg.message("Time taken for the compilation setup and process is: " + timeDifference + " milliseconds\n")
                } else {
                    cfg.message("Path " + workDir + " does not exist!!")
                }
            } catch (e) {
                cfg.message("Extension failed to compile file: " + doc.uri.toString() + " with problem = " + (e as any).toString())
            }
        }))
    }
}