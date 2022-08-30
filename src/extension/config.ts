import * as vs from "vscode"
import * as which from "which"
import path from 'path';
import { execSync } from 'child_process'
import stripAnsi from 'strip-ansi'
import * as utils from "./utils"

export class QatConfig {
    constructor(
        public envPath: string,
        public qatPath: string,
        public workspace: string,
        public paths: Array<string>,
        public version: string,
        public winOut: vs.OutputChannel | undefined,
    ) { }

    public static init(): QatConfig {
        let result = new QatConfig(
            process.env.PATH ?? '',
            which.sync("qat"),
            '',
            process.env.PATH ? process.env.PATH!.split(path.delimiter).filter((p) => p) : [],
            '0.0.1',
            vs.window.createOutputChannel("Qat Output")
        );
        if (result.qatPath !== '') {
            result.winOut!.appendLine('Found path of qat: ' + result.qatPath)
            let out = utils.execute('qat version')
            result.winOut!.appendLine('Qat compiler version found: ' + out)
            if (out.includes(' ')) {
                result.version = (out.split(' ')[1].length > 1) ? out.split(' ')[1].substring(1) : out
            } else {
                result.version = 'None'
            }
        }
        return result;
    }

    public message(content: string) {
        if (this.winOut) {
            this.winOut.appendLine(content);
        }
    }
}