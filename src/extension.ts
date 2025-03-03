import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { loadLocalization, msgTranslation } from './localization';

// Interface for the project configuration
interface ProjectConfig {
    directories: string[];
    files: { [key: string]: string };
    standardLibModules: string[];
}

// Type definition for project path prompt function
type ProjectPathPrompt = (prompt: string) => Promise<string | undefined>;

// Logger for extension output
const logger = vscode.window.createOutputChannel('PyRacantha');

// Global variable for project configuration
let globalProjectConfig: ProjectConfig | null = null;

// Function to log informational messages
function logInfo(message: string) {
    logger.appendLine(`INFO: ${message}`);
    console.log(message);
}

// Function to log error messages
function logError(message: string) {
    logger.appendLine(`ERROR: ${message}`);
    console.error(message);
}

// Function to get the configuration file path from settings
function getConfigFilePath(projectPath: string): string {
    let configPath = vscode.workspace.getConfiguration().get<string>('pyracantha.configFile');

    // Resolve ${workspaceFolder} placeholder
    if (configPath && configPath.includes('${workspaceFolder}')) {
        const workspaceFolder = vscode.workspace.workspaceFolders
            ? vscode.workspace.workspaceFolders[0].uri.fsPath
            : '';
        configPath = configPath.replace('${workspaceFolder}', workspaceFolder);
    }

    if (!configPath) {
        configPath = path.join(projectPath, '.vscode', 'pyracantha-config.json');
    }

    return path.resolve(configPath);
}

// Function to load project configuration from the JSON file
function loadProjectConfig(projectPath: string): ProjectConfig {
    const configFilePath = getConfigFilePath(projectPath);
    if (!fs.existsSync(configFilePath)) {
        const defaultConfig: ProjectConfig = {
            directories: ["src", "tests", "docs", "configs"],
            files: {
                ".gitignore": "venv\n__pycache__\n*.pyc\n.DS_Store\n",
                "requirements.txt": "",
                "README.md": "# Project Title\n\nA brief description of your project.\n",
                "src/__init__.py": "",
                "tests/__init__.py": ""
            },
            standardLibModules: [
                "abc", "argparse", "array", "asyncio", "base64", "binascii", "bisect", "calendar", "collections", "cmath",
                "concurrent", "contextlib", "copy", "csv", "ctypes", "datetime", "decimal", "difflib", "dis", "email",
                "enum", "faulthandler", "filecmp", "fnmatch", "fractions", "functools", "gc", "getopt", "getpass", "gettext",
                "glob", "gzip", "hashlib", "heapq", "hmac", "html", "http", "imaplib", "importlib", "inspect", "io", "itertools",
                "json", "keyword", "linecache", "locale", "logging", "lzma", "mailbox", "math", "mimetypes", "multiprocessing",
                "netrc", "numbers", "operator", "os", "pathlib", "pickle", "pprint", "profile", "pstats", "queue", "random",
                "re", "readline", "resource", "rlcompleter", "sched", "secrets", "select", "shelve", "shutil", "signal",
                "site", "smtplib", "socket", "sqlite3", "ssl", "stat", "statistics", "string", "subprocess", "sys", "tabnanny",
                "tempfile", "termios", "textwrap", "threading", "time", "timeit", "trace", "traceback", "tracemalloc", "tty",
                "types", "unittest", "urllib", "uuid", "venv", "warnings", "weakref", "webbrowser", "xml", "zipfile", "zipimport",
                "zlib"
            ]
        };

        // Ensure the directory exists before creating the file
        const configDir = path.dirname(configFilePath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        fs.writeFileSync(configFilePath, JSON.stringify(defaultConfig, null, 4));
        logInfo(`Default config created at: ${configFilePath}`);
    }

    const configContent = fs.readFileSync(configFilePath, 'utf-8');
    return JSON.parse(configContent);
}

// Ensure globalProjectConfig is initialized
function getProjectConfig(projectPath: string): ProjectConfig {
    if (!globalProjectConfig) {
        globalProjectConfig = loadProjectConfig(projectPath);
    }
    return globalProjectConfig;
}

// Function to validate naming conventions
function validateName(name: string, type: 'directory' | 'file' | 'project'): boolean {
    const validNamePattern = type === 'file' ? /^[a-zA-Z0-9_\-\.]+$/ : /^[a-zA-Z0-9_\-]+$/;
    if (!validNamePattern.test(name)) {
        vscode.window.showErrorMessage(`Invalid ${type} name: ${name}. Only alphanumeric characters, hyphens, underscores${type === 'file' ? ', and periods' : ''} are allowed.`);
        return false;
    }
    return true;
}

// Function called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
    loadLocalization();

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.createPythonStructure', async () => {
            const projectName = await showInputBoxWithCancel({ prompt: msgTranslation('enterProjectName') });
            if (!projectName) { return; }

            if (!validateName(projectName, 'project')) { return; }

            const projectPath = await getProjectPathFromDialog(msgTranslation('selectFolder'));
            if (!projectPath) { return; }

            const fullProjectPath = path.join(projectPath, projectName);

            if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
                const workspaceName = await showInputBoxWithCancel({ prompt: msgTranslation('enterWorkspaceName') });
                if (!workspaceName) { return; }

                if (!validateName(workspaceName, 'project')) { return; }

                const workspacePath = path.join(projectPath, workspaceName);
                fs.mkdirSync(workspacePath, { recursive: true });

                const workspaceFilePath = path.join(workspacePath, `${workspaceName}.code-workspace`);
                const workspaceContent = JSON.stringify({
                    folders: [
                        { path: fullProjectPath }
                    ],
                    settings: {}
                }, null, 4);
                fs.writeFileSync(workspaceFilePath, workspaceContent);

                createPythonProjectStructure(fullProjectPath);
                await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(workspaceFilePath), { forceNewWindow: true });
            } else {
                const addToExisting = await showQuickPickWithCancel(
                    [msgTranslation('addToExistingWorkspace'), msgTranslation('createNewWorkspace')],
                    { placeHolder: msgTranslation('chooseWorkspaceOption') }
                );

                if (addToExisting === msgTranslation('addToExistingWorkspace')) {
                    createPythonProjectStructure(fullProjectPath);

                    const workspaceFilePath = vscode.workspace.workspaceFile
                        ? vscode.workspace.workspaceFile.fsPath
                        : path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, `${path.basename(vscode.workspace.workspaceFolders[0].uri.fsPath)}.code-workspace`);

                    if (fs.existsSync(workspaceFilePath)) {
                        const workspaceContent = JSON.parse(fs.readFileSync(workspaceFilePath, 'utf-8'));
                        workspaceContent.folders.push({ path: fullProjectPath });
                        fs.writeFileSync(workspaceFilePath, JSON.stringify(workspaceContent, null, 4));
                    } else {
                        const workspaceContent = JSON.stringify({
                            folders: [
                                { path: vscode.workspace.workspaceFolders[0].uri.fsPath },
                                { path: fullProjectPath }
                            ],
                            settings: {}
                        }, null, 4);
                        fs.writeFileSync(workspaceFilePath, workspaceContent);
                    }

                    await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(workspaceFilePath), { forceNewWindow: false });
                    vscode.window.showInformationMessage(msgTranslation('projectStructureCreated'));
                    logInfo(msgTranslation('projectStructureCreated') + ' ' + fullProjectPath);
                } else {
                    const workspaceName = await showInputBoxWithCancel({ prompt: msgTranslation('enterWorkspaceName') });
                    if (!workspaceName) { return; }

                    if (!validateName(workspaceName, 'project')) { return; }

                    const workspacePath = path.join(projectPath, workspaceName);
                    fs.mkdirSync(workspacePath, { recursive: true });

                    const workspaceFilePath = path.join(workspacePath, `${workspaceName}.code-workspace`);
                    const workspaceContent = JSON.stringify({
                        folders: [
                            { path: fullProjectPath }
                        ],
                        settings: {}
                    }, null, 4);
                    fs.writeFileSync(workspaceFilePath, workspaceContent);

                    createPythonProjectStructure(fullProjectPath);
                    await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(workspaceFilePath), { forceNewWindow: true });
                }
            }
        }),

        vscode.commands.registerCommand('extension.analyzePythonProject', async () => {
            const projectPath = await getProjectPathFromWorkspace(msgTranslation('enterProjectPathToAnalyze'));
            if (projectPath) {
                analyzePythonProject(projectPath);
            }
        }),

        vscode.commands.registerCommand('extension.updateRequirements', async () => {
            const selectedProjectPath = await getProjectPathFromWorkspace(msgTranslation('enterProjectPathToUpdate'));
            if (selectedProjectPath) {
                await updateRequirementsTxt(selectedProjectPath);
            }
        })
    );
}

// Function to show an input box with cancel handling
async function showInputBoxWithCancel(options: vscode.InputBoxOptions): Promise<string | undefined> {
    const inputBox = vscode.window.createInputBox();
    Object.assign(inputBox, options);

    const result = await new Promise<string | undefined>((resolve) => {
        inputBox.onDidAccept(() => resolve(inputBox.value));
        inputBox.onDidHide(() => resolve(undefined));
        inputBox.show();
    });

    inputBox.dispose();
    return result;
}

// Function to show a quick pick with cancel handling
async function showQuickPickWithCancel(items: string[], options: vscode.QuickPickOptions): Promise<string | undefined> {
    const quickPick = vscode.window.createQuickPick();
    quickPick.items = items.map(label => ({ label }));
    Object.assign(quickPick, options);

    const result = await new Promise<string | undefined>((resolve) => {
        quickPick.onDidAccept(() => resolve(quickPick.selectedItems[0].label));
        quickPick.onDidHide(() => resolve(undefined));
        quickPick.show();
    });

    quickPick.dispose();
    return result;
}

// Function to show an information message with cancel handling
async function showInformationMessageWithCancel(message: string, options: vscode.MessageOptions, ...items: string[]): Promise<string | undefined> {
    const result = await vscode.window.showInformationMessage(message, options, ...items);
    return result === undefined ? undefined : result;
}

// Function to prompt user to select a project path from the workspace folders
const getProjectPathFromWorkspace: ProjectPathPrompt = async (prompt: string): Promise<string | undefined> => {
    const selectedFolder = await showQuickPickWithCancel(
        vscode.workspace.workspaceFolders ?
            vscode.workspace.workspaceFolders.map(folder => folder.uri.fsPath).concat([msgTranslation('rootWorkspace')]) :
            [msgTranslation('rootWorkspace')],
        { placeHolder: prompt, canPickMany: false }
    );

    return selectedFolder && selectedFolder !== msgTranslation('rootWorkspace') ? selectedFolder : undefined;
};

// Function to prompt user to select a folder path using a dialog
const getProjectPathFromDialog: ProjectPathPrompt = async (prompt: string): Promise<string | undefined> => {
    const result = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: msgTranslation('selectFolder')
    });

    if (result && result.length > 0) {
        return result[0].fsPath;
    }
    return undefined;
};

// Function to create the Python project structure
function createPythonProjectStructure(projectPath: string) {
    try {
        if (!fs.existsSync(projectPath)) {
            fs.mkdirSync(projectPath, { recursive: true });
            logInfo(msgTranslation('directoryCreated') + ': ' + projectPath);
        }

        const config = getProjectConfig(projectPath);
        const dirs: string[] = config.directories;
        const files: { [key: string]: string } = config.files;

        dirs.forEach(dir => {
            if (validateName(dir, 'directory')) {
                createDirectory(path.join(projectPath, dir));
            }
        });
        Object.entries(files).forEach(([file, content]) => {
            if (validateName(file, 'file')) {
                createFile(path.join(projectPath, file), content);
            }
        });

        // Update requirements.txt content
        const requirementsFilePath = path.join(projectPath, 'requirements.txt');
        if (fs.existsSync(requirementsFilePath)) {
            const additionalRequirements = 'numpy\npandas\nscikit-learn\n';
            fs.appendFileSync(requirementsFilePath, additionalRequirements);
            logInfo(msgTranslation('requirementsUpdatedWithAdditionalPackages'));
        }

        logInfo(msgTranslation('projectStructureCreated'));
    } catch (error) {
        logError(msgTranslation('failedToCreateStructure') + (error as Error).message);
        vscode.window.showErrorMessage(`${msgTranslation('failedToCreateStructure')} ${(error as Error).message}`);
    }
}

// Function to create a directory if it does not exist
function createDirectory(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        logInfo(msgTranslation('directoryCreated') + ': ' + dirPath);
    }
}

// Function to create a file with specified content if it does not exist
function createFile(filePath: string, content: string) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, content);
        logInfo(msgTranslation('fileCreated') + ': ' + filePath);
    }
}

// Function to analyze an existing Python project for missing elements
async function analyzePythonProject(projectPath: string) {
    try {
        const config = getProjectConfig(projectPath);
        const dirs: string[] = config.directories;
        const files: { [key: string]: string } = config.files;

        const missingDirs = dirs.filter(dir => !fs.existsSync(path.join(projectPath, dir)));
        const missingFiles = Object.entries(files).filter(([file]) => !fs.existsSync(path.join(projectPath, file)));

        if (missingDirs.length === 0 && missingFiles.length === 0) {
            vscode.window.showInformationMessage(msgTranslation('projectIsUpToDate'));
            logInfo(msgTranslation('projectIsUpToDate'));
            return;
        }

        const summary = `${msgTranslation('missingElements')}:\n\n${missingDirs.join(', ')}\n${missingFiles.map(([file]) => file).join(', ')}`;
        const confirm = await showInformationMessageWithCancel(
            `${summary}\n\n${msgTranslation('addMissingElements')}`,
            { modal: true },
            msgTranslation('yes'), msgTranslation('no')
        );

        if (!confirm || confirm === msgTranslation('no')) {
            vscode.window.showInformationMessage(msgTranslation('noChangesMade'));
            logInfo(msgTranslation('noChangesMade'));
            return;
        }

        missingDirs.forEach(dir => {
            if (validateName(dir, 'directory')) {
                createDirectory(path.join(projectPath, dir));
            }
        });
        missingFiles.forEach(([file, content]) => {
            if (validateName(file, 'file')) {
                createFile(path.join(projectPath, file), content);
            }
        });

        // Update requirements.txt content
        await updateRequirementsTxt(projectPath);
        // Update README.md content
        await updateReadmeMd(projectPath);

        vscode.window.showInformationMessage(msgTranslation('missingElementsAdded'));
        logInfo(msgTranslation('missingElementsAdded'));
    } catch (error) {
        logError(msgTranslation('failedToAnalyzeProject') + (error as Error).message);
        vscode.window.showErrorMessage(`${msgTranslation('failedToAnalyzeProject')} ${(error as Error).message}`);
    }
}

// Function to update the requirements.txt file based on the project's imported packages
async function updateRequirementsTxt(selectedProjectPath: string): Promise<void> {
    logInfo('Starting to update requirements.txt');
    logInfo('-----------------------------------');
    // Ensure selectedProjectPath is a string
    if (Array.isArray(selectedProjectPath)) {
        if (selectedProjectPath.length > 0) {
            logInfo('selectedProjectPath is an array, taking the first element');
            selectedProjectPath = selectedProjectPath[0];
        } else {
            logError('selectedProjectPath is an empty array');
            return;
        }
    }

    logInfo('Checking if requirements.txt exists');
    const requirementsPath = path.join(selectedProjectPath, 'requirements.txt');
    logInfo(`requirementsPath: ${requirementsPath}`);

    let existingPackages: string[] = [];
    try {
        const data = await fs.promises.readFile(requirementsPath, 'utf8');
        existingPackages = data.split('\n').filter(Boolean);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            logError(`Error reading requirements.txt: ${(error as Error).message}`);
            return;
        }
        logInfo('requirements.txt does not exist, it will be created');
    }

    logInfo(`Existing packages: (${existingPackages.length}) ${existingPackages.join(', ')}`);

    logInfo('Collecting imported packages');
    const importedPackages = collectImportedPackages(selectedProjectPath);
    logInfo(`Imported packages: (${importedPackages.length}) ${importedPackages.join(', ')}`);

    const newPackages = importedPackages.filter(pkg => !existingPackages.includes(pkg));
    if (newPackages.length === 0) {
        logInfo('No new packages to add to requirements.txt');
        return;
    }

    logInfo(`New packages to add: ${newPackages.join(', ')}`);

    const updatedPackages = [...new Set([...existingPackages, ...newPackages])].sort();

    try {
        await fs.promises.writeFile(requirementsPath, updatedPackages.join('\n'), 'utf8');
        logInfo('requirements.txt updated successfully');
    } catch (error) {
        logError(`Error updating requirements.txt: ${(error as Error).message}`);
    }
}

// Function to validate if a package name is valid (not a standard library module)
function isValidPackageName(packageName: string): boolean {
    const standardLibModules = getProjectConfig('').standardLibModules;
    return standardLibModules && !standardLibModules.includes(packageName) && /^[a-zA-Z0-9_\-]+$/.test(packageName);
}

// Function to collect imported packages from the Python files in the directory
function collectImportedPackages(projectPath: string): string[] {
    const importedPackages = new Set<string>();

    // Recursively scan directories for Python files and collect imported packages
    function scanDirectory(dir: string) {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            // Skip virtual environment directories
            if (stat.isDirectory() && path.basename(filePath) === 'myenv') {
                logInfo(`Skipping virtual environment directory: ${filePath}`);
                return;
            }

            if (stat.isDirectory()) {
                scanDirectory(filePath);
            } else if (file.endsWith('.py')) {
                logInfo(`Reading file: ${filePath}`);
                const content = fs.readFileSync(filePath, 'utf-8');

                const cleanContent = content
                    .replace(/""".*?"""/gs, '')
                    .replace(/'''.*?'''/gs, '')
                    .replace(/#.*$/gm, '');
                
                cleanContent.split('\n').forEach(line => {
                    let match;
                    if ((match = line.match(/^\s*import\s+([^\s,]+)/))) {
                        const packageName = match[1].split('.')[0];
                        if (packageName && isValidPackageName(packageName)) {
                            importedPackages.add(packageName);
                            logInfo(`Found package: ${packageName}`);
                        }
                    } else if ((match = line.match(/^\s*from\s+([^\s,]+)\s+import\s+/))) {
                        const packageName = match[1].split('.')[0];
                        if (packageName && isValidPackageName(packageName)) {
                            importedPackages.add(packageName);
                            logInfo(`Found package: ${packageName}`);
                        }
                    }
                });
            }
        });
    }

    scanDirectory(projectPath);
    return Array.from(importedPackages);
}

// Function to update README.md file based on project analysis
async function updateReadmeMd(projectPath: string): Promise<void> {
    const readmePath = path.join(projectPath, 'README.md');
    let readmeContent = '# Project Title\n\nA brief description of your project.\n\n## Project Structure\n\n';

    try {
        const config = getProjectConfig(projectPath);
        const dirs: string[] = config.directories;
        const files: { [key: string]: string } = config.files;

        readmeContent += '### Directories:\n';
        dirs.forEach(dir => {
            readmeContent += `- ${dir}\n`;
        });

        readmeContent += '\n### Files:\n';
        Object.keys(files).forEach(file => {
            readmeContent += `- ${file}\n`;
        });

        await fs.promises.writeFile(readmePath, readmeContent, 'utf8');
        logInfo('README.md updated successfully');
    } catch (error) {
        logError(`Error updating README.md: ${(error as Error).message}`);
    }
}

// Function to show a quick pick multi-select window with cancel handling
async function showQuickPickMultiSelect(items: string[], placeholder: string): Promise<string[] | undefined> {
    const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem>();
    quickPick.items = items.map(label => ({ label }));
    quickPick.canSelectMany = true;
    quickPick.placeholder = placeholder;

    const result = await new Promise<string[] | undefined>((resolve) => {
        quickPick.onDidAccept(() => resolve(quickPick.selectedItems.map(item => item.label)));
        quickPick.onDidHide(() => resolve(undefined));
        quickPick.show();
    });

    quickPick.dispose();
    return result;
}

// Function called when the extension is deactivated
export function deactivate() {
    logInfo(msgTranslation('extensionDeactivated'));
}
